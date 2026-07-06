// Clip Finder helper — Step 1: scan the OBS folder and register clips in the database.
// Run from the project root:  node helper/scan.mjs ["D:\\OBS VIDEOS new"]
// Reads credentials from .env.local (never committed).

import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { createClient } from '@supabase/supabase-js'

const execFileAsync = promisify(execFile)

// --- load .env.local (simple KEY=VALUE parser, no dependency needed)
const env = {}
for (const line of readFileSync(new URL('../.env.local', import.meta.url), 'utf8').split(/\r?\n/)) {
  const m = line.match(/^([A-Z_]+)=(.*)$/)
  if (m) env[m[1]] = m[2].trim()
}

for (const key of ['VITE_SUPABASE_URL', 'VITE_SUPABASE_PUBLISHABLE_KEY', 'SUPABASE_EMAIL', 'SUPABASE_PASSWORD']) {
  if (!env[key] || env[key] === 'FILL_ME_IN') {
    console.error(`Missing ${key} in .env.local — fill it in first.`)
    process.exit(1)
  }
}

const folder = resolve(process.argv[2] ?? 'D:\\OBS VIDEOS new')
const VIDEO_EXTENSIONS = ['.mkv', '.mp4', '.mov', '.flv']

// --- sign in as the owner so RLS lets us write
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

// --- probe one file's duration in seconds via ffprobe
async function probeDuration(path) {
  const { stdout } = await execFileAsync('ffprobe', [
    '-v', 'error',
    '-show_entries', 'format=duration',
    '-of', 'csv=p=0',
    path,
  ])
  const seconds = parseFloat(stdout.trim())
  return Number.isFinite(seconds) ? Math.round(seconds * 10) / 10 : null
}

// --- OBS default filename: "2026-06-25 13-05-41.mkv" → real timestamp
function recordedAtFromName(name) {
  const m = name.match(/(\d{4})-(\d{2})-(\d{2})[ _](\d{2})-(\d{2})-(\d{2})/)
  if (!m) return null
  return new Date(`${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:${m[6]}`).toISOString()
}

// --- scan
const files = readdirSync(folder).filter((f) =>
  VIDEO_EXTENSIONS.some((ext) => f.toLowerCase().endsWith(ext))
)
console.log(`Found ${files.length} video files in ${folder}`)

let registered = 0
let failed = 0

for (const [i, filename] of files.entries()) {
  const path = join(folder, filename)
  try {
    const duration = await probeDuration(path)
    const stats = statSync(path)
    const row = {
      filename,
      folder_path: folder,
      duration_seconds: duration,
      recorded_at: recordedAtFromName(filename) ?? stats.mtime.toISOString(),
      clip_type: /replay/i.test(filename) ? 'replay' : 'session',
      user_id: auth.user.id,
    }
    const { error } = await supabase
      .from('clips')
      .upsert(row, { onConflict: 'user_id,folder_path,filename', ignoreDuplicates: false })
    if (error) throw new Error(error.message)
    registered++
    const mins = duration ? (duration / 60).toFixed(1) : '?'
    console.log(`[${i + 1}/${files.length}] ${filename} — ${mins} min`)
  } catch (err) {
    failed++
    console.error(`[${i + 1}/${files.length}] FAILED ${filename}: ${err.message}`)
  }
}

console.log(`\nDone. Registered/updated: ${registered}, failed: ${failed}`)
process.exit(0)
