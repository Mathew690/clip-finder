---
name: debugging-playbook
description: How to debug problems in the ClipScry project — use whenever an error, unexpected behavior, empty query result, or failed deploy comes up. Contains known gotchas specific to this machine and stack.
---

# Debugging playbook

Handoff note: these are the failure modes already hit (or foreseen) in this project. Check this list before deep-diving.

## Process rules

1. Get the exact error first. Full message + stack trace, never a paraphrase. If the user says "it's not working," ask them to paste the error or reproduce it yourself.
2. Reproduce before fixing. One change at a time, re-test after each.
3. Gather runtime state before theorizing: browser console, Network tab, Supabase dashboard logs (Logs → API / Postgres), Vercel deployment logs.
4. Fix the root cause, not the symptom. If a fix "works" but you can't explain why, keep digging.

## Known gotchas in this project

- **Empty query results are usually RLS, not a bug.** All tables have row-level security with owner-only policies. An unauthenticated (or wrong-user) query returns `[]` with NO error. If data "disappears," check auth state first, policies second, and only then the query.
- **Vercel env vars are NOT set yet** (as of Phase 4 start). The app works locally via `.env.local`, but the moment deployed code imports the Supabase client, production breaks with undefined env vars. Fix: Vercel dashboard → project → Settings → Environment Variables → add `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`, then redeploy.
- **Vite env vars must start with `VITE_`** or they are silently invisible to client code.
- **Node test scripts must live inside the project folder.** Node resolves packages relative to the script's location, not the cwd — a script in a temp/scratch dir can't find `@supabase/supabase-js`. Pattern used here: write `test-*.mjs` in project root, run it, delete it.
- **PowerShell here is 5.1**: no `&&` chaining (use `;`), and the shell cwd resets between tool calls — always `Set-Location` first or use absolute paths.
- **Git LF/CRLF warnings are noise** on this Windows machine. Ignore them.
- **Pushing to `main` deploys to production immediately** (Vercel). If a change is risky, run `npm run build` locally first to catch build errors before pushing.

## Debugging prompt pattern (from the course, works)

When stuck, assemble: exact error + relevant code + what was expected vs. what happened + what was already tried. Missing runtime values? Add console.log / check Network tab / check Supabase logs, then re-assess with real data instead of guessing.
