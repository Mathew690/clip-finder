// ClipScry helper — removes clips whose source video file no longer exists on disk.
// Keeps every clip whose file is still present. Run from project root: node helper/prune.mjs
import { readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { createClient } from '@supabase/supabase-js'

const env = {}
for (const line of readFileSync(new URL('../.env.local', import.meta.url), 'utf8').split(/\r?\n/)) {
  const m = line.match(/^([A-Z_]+)=(.*)$/)
  if (m) env[m[1]] = m[2].trim()
}
const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_PUBLISHABLE_KEY)
const { data: auth, error: authError } = await supabase.auth.signInWithPassword({
  email: env.SUPABASE_EMAIL,
  password: env.SUPABASE_PASSWORD,
})
if (authError) { console.error('Login failed:', authError.message); process.exit(1) }

const { data: clips, error } = await supabase.from('clips').select('id, filename, folder_path')
if (error) { console.error('Could not fetch clips:', error.message); process.exit(1) }

const missing = clips.filter((c) => !existsSync(join(c.folder_path ?? '', c.filename)))
console.log(`${clips.length} clips total, ${missing.length} with missing files.`)

if (!missing.length) { console.log('Nothing to remove — every clip still has its file.'); process.exit(0) }

for (const c of missing) console.log(`  removing: ${c.filename}`)

const { error: delError } = await supabase.from('clips').delete().in('id', missing.map((c) => c.id))
if (delError) console.error('Delete failed:', delError.message)
else console.log(`\nDone. Removed ${missing.length} clip(s) whose files were deleted. Kept ${clips.length - missing.length}.`)
process.exit(0)
