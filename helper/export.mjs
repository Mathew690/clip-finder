// ClipScry helper — Step 3: cut requested clips with ffmpeg (100% local, no API).
// Run from the project root:  node helper/export.mjs
// Processes every pending export job and writes .mp4 files to the exports/ folder.

import { readFileSync, existsSync, mkdirSync } from 'node:fs'
import { join, resolve } from 'node:path'
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
for (const key of ['VITE_SUPABASE_URL', 'VITE_SUPABASE_PUBLISHABLE_KEY', 'SUPABASE_EMAIL', 'SUPABASE_PASSWORD']) {
  if (!env[key] || env[key] === 'FILL_ME_IN') {
    console.error(`Missing ${key} in .env.local`)
    process.exit(1)
  }
}

const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_PUBLISHABLE_KEY)
const { data: auth, error: authError } = await supabase.auth.signInWithPassword({
  email: env.SUPABASE_EMAIL,
  password: env.SUPABASE_PASSWORD,
})
if (authError) {
  console.error('Supabase login failed:', authError.message)
  process.exit(1)
}

const { data: jobs, error: fetchError } = await supabase
  .from('export_jobs')
  .select('*, clips(filename, folder_path)')
  .eq('status', 'pending')
if (fetchError) {
  console.error('Could not fetch export jobs:', fetchError.message)
  process.exit(1)
}

if (!jobs.length) {
  console.log('No clips to export.')
  process.exit(0)
}

const exportsDir = resolve('exports')
if (!existsSync(exportsDir)) mkdirSync(exportsDir, { recursive: true })

function sanitize(s) {
  return (s || 'clip')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 40) || 'clip'
}

console.log(`Exporting ${jobs.length} clip(s) to ${exportsDir}\n`)

let done = 0
let failed = 0

for (const [i, job] of jobs.entries()) {
  const clip = job.clips
  const source = join(clip.folder_path, clip.filename)
  const label = `[${i + 1}/${jobs.length}]`

  if (!existsSync(source)) {
    console.error(`${label} source missing: ${clip.filename}`)
    await supabase.from('export_jobs').update({ status: 'error' }).eq('id', job.id)
    failed++
    continue
  }

  const startS = Number(job.start_seconds)
  const endS = Number(job.end_seconds) || startS
  const momentLen = Math.max(endS - startS, 0)
  const from = Math.max(0, startS - Number(job.pad_before))
  const duration = Math.min(Number(job.pad_before) + momentLen + Number(job.pad_after), 300)

  const stamp = `${Math.floor(startS / 60)}m${String(Math.floor(startS % 60)).padStart(2, '0')}s`
  const outName = `${sanitize(job.label)}_${stamp}_${job.id}.mp4`
  const outPath = join(exportsDir, outName)

  try {
    await supabase.from('export_jobs').update({ status: 'processing' }).eq('id', job.id)
    await execFileAsync('ffmpeg', [
      '-y', '-v', 'error',
      '-ss', String(from),
      '-i', source,
      '-t', String(duration),
      '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '20',
      '-c:a', 'aac',
      '-movflags', '+faststart',
      outPath,
    ])
    await supabase.from('export_jobs').update({ status: 'done', output_path: outPath }).eq('id', job.id)
    done++
    console.log(`${label} ${outName}  (${duration.toFixed(0)}s)`)
  } catch (err) {
    failed++
    console.error(`${label} FAILED ${clip.filename}: ${err.message}`)
    await supabase.from('export_jobs').update({ status: 'error' }).eq('id', job.id)
  }
}

console.log(`\nDone. Exported: ${done}, failed: ${failed}`)
console.log(`Your clips are in: ${exportsDir}`)
process.exit(0)
