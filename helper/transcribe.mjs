// Clip Finder helper — Step 2: transcribe pending clips.
// Extracts audio with ffmpeg, transcribes with Groq Whisper, stores segments in Supabase.
// Run from the project root:
//   node helper/transcribe.mjs            → process ALL pending clips (smallest first)
//   node helper/transcribe.mjs --limit 3  → process only the first 3 (for testing)
// Resumable: clips keep status 'pending' until fully done, so re-running continues where it left off.

import { readFileSync, unlinkSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { createClient } from '@supabase/supabase-js'

const execFileAsync = promisify(execFile)

// --- load .env.local
const env = {}
for (const line of readFileSync(new URL('../.env.local', import.meta.url), 'utf8').split(/\r?\n/)) {
  const m = line.match(/^([A-Z_]+)=(.*)$/)
  if (m) env[m[1]] = m[2].trim()
}
for (const key of ['VITE_SUPABASE_URL', 'VITE_SUPABASE_PUBLISHABLE_KEY', 'SUPABASE_EMAIL', 'SUPABASE_PASSWORD', 'GROQ_API_KEY']) {
  if (!env[key] || env[key] === 'FILL_ME_IN') {
    console.error(`Missing ${key} in .env.local`)
    process.exit(1)
  }
}

const limitArg = process.argv.indexOf('--limit')
const limit = limitArg > -1 ? parseInt(process.argv[limitArg + 1], 10) : null

// --- sign in
const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_PUBLISHABLE_KEY)
const { data: auth, error: authError } = await supabase.auth.signInWithPassword({
  email: env.SUPABASE_EMAIL,
  password: env.SUPABASE_PASSWORD,
})
if (authError) {
  console.error('Supabase login failed:', authError.message)
  process.exit(1)
}
console.log(`Signed in as ${auth.user.email}`)

// --- fetch pending clips, smallest first (fast wins, quick failures)
let query = supabase
  .from('clips')
  .select('*')
  .eq('status', 'pending')
  .order('duration_seconds', { ascending: true, nullsFirst: false })
if (limit) query = query.limit(limit)
const { data: clips, error: fetchError } = await query
if (fetchError) {
  console.error('Could not fetch clips:', fetchError.message)
  process.exit(1)
}
console.log(`${clips.length} pending clip(s) to transcribe\n`)

// --- extract audio: 16kHz mono opus, tiny and ideal for speech recognition
async function extractAudio(videoPath, outPath) {
  await execFileAsync('ffmpeg', [
    '-y', '-v', 'error',
    '-i', videoPath,
    '-vn',
    '-ac', '1',
    '-ar', '16000',
    '-c:a', 'libopus',
    '-b:a', '24k',
    outPath,
  ])
}

// --- send audio to Groq, with automatic wait-and-retry on rate limits
async function transcribe(audioPath) {
  for (let attempt = 1; attempt <= 10; attempt++) {
    const form = new FormData()
    form.append('file', new Blob([readFileSync(audioPath)]), 'audio.ogg')
    form.append('model', 'whisper-large-v3-turbo')
    form.append('response_format', 'verbose_json')

    const res = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${env.GROQ_API_KEY}` },
      body: form,
    })

    if (res.status === 429) {
      const retryAfter = parseInt(res.headers.get('retry-after') ?? '60', 10)
      const waitSec = Math.min(Math.max(retryAfter, 10), 900)
      console.log(`  rate limited — waiting ${waitSec}s (free tier rations audio per hour, this is normal)`)
      await new Promise((r) => setTimeout(r, waitSec * 1000))
      continue
    }
    if (!res.ok) {
      const body = await res.text()
      throw new Error(`Groq API ${res.status}: ${body.slice(0, 300)}`)
    }
    return res.json()
  }
  throw new Error('Gave up after 10 rate-limit retries')
}

// --- main loop
let done = 0
let failed = 0
const startedAt = Date.now()

for (const [i, clip] of clips.entries()) {
  const videoPath = join(clip.folder_path, clip.filename)
  const label = `[${i + 1}/${clips.length}] ${clip.filename}`

  if (!existsSync(videoPath)) {
    console.error(`${label} — file no longer exists, marking error`)
    await supabase.from('clips').update({ status: 'error' }).eq('id', clip.id)
    failed++
    continue
  }

  const audioPath = join(tmpdir(), `clipfinder-${clip.id}.ogg`)
  try {
    await supabase.from('clips').update({ status: 'transcribing' }).eq('id', clip.id)

    await extractAudio(videoPath, audioPath)

    const result = await transcribe(audioPath)
    const segments = (result.segments ?? [])
      .map((s) => ({
        clip_id: clip.id,
        start_seconds: Math.round(s.start * 10) / 10,
        end_seconds: Math.round(s.end * 10) / 10,
        text: s.text.trim(),
      }))
      .filter((s) => s.text.length > 0)

    // replace any partial rows from an earlier interrupted run, then insert fresh
    await supabase.from('transcript_segments').delete().eq('clip_id', clip.id)
    for (let batch = 0; batch < segments.length; batch += 500) {
      const { error } = await supabase
        .from('transcript_segments')
        .insert(segments.slice(batch, batch + 500))
      if (error) throw new Error(`insert failed: ${error.message}`)
    }

    await supabase.from('clips').update({ status: 'ready' }).eq('id', clip.id)
    done++
    console.log(`${label} — ${segments.length} segments ✓`)
  } catch (err) {
    failed++
    console.error(`${label} — FAILED: ${err.message}`)
    await supabase.from('clips').update({ status: 'error' }).eq('id', clip.id)
  } finally {
    if (existsSync(audioPath)) unlinkSync(audioPath)
  }
}

const mins = ((Date.now() - startedAt) / 60000).toFixed(1)
console.log(`\nDone in ${mins} min. Transcribed: ${done}, failed: ${failed}`)
process.exit(0)
