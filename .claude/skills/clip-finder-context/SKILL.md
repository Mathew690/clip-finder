---
name: clip-finder-context
description: Current state of the Clip Finder project — architecture, URLs, schema, roadmap position, and open decisions. Use at session start to orient before doing any work.
---

# Clip Finder — project state

Handoff note: read this first in any new session, then check `git log --oneline -5` and the vault checklist for anything newer than this file. If this file contradicts the code, trust the code and update this file.

## What it is

Searchable index for raw OBS footage. Transcribes the audio of each clip so the owner can search what he said and get file + timestamp, instead of scrubbing 1TB of unlabeled recordings while editing in Premiere Pro/CapCut. The app never stores video — audio-only transcription keeps it near-free to run.

## Live pieces

- Repo: github.com/Mathew690/clip-finder · local: `D:\Projects\clip-finder`
- Production: https://clip-finder-tau.vercel.app (auto-deploys from `main`)
- Supabase project: `dugdiqinydgraqbxtidu` — client singleton at `src/lib/supabase.js`, keys in `.env.local` (`VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`)
- Schema: two tables, `clips` and `transcript_segments`, with full-text search (`fts` tsvector + GIN index) and owner-only RLS. Full SQL in `supabase/schema.sql`.
- Vault docs: `D:\My Vault\Vault Build\Clip Finder - Build Checklist.md` and `Clip Finder - Spec.md`

## Roadmap position (as of 2026-07-06)

Phases 1-3 done (idea, tools, live deploy + DB connected). Phase 4 in progress:
- [x] Schema designed and applied
- [ ] Auth (Supabase email/password is fine for v1 — owner is the only user initially)
- [ ] Core loop: pick OBS folder → extract audio → transcribe → insert segments
- [ ] Search UI: query box → full-text search → results as file + timestamp + surrounding text

## Open decisions (decide WITH the user, present options simply)

1. **Transcription API** — undecided. Candidates: OpenAI Whisper API, Groq (whisper, very cheap/fast), Deepgram. Criteria: cost per audio-hour (his clips are long), accuracy on casual gaming speech. His budget: minimal, pay-per-use only.
2. **Audio extraction** — the hard problem. Browser can't read `D:\OBS VIDEOS new` freely. Options: (a) File System Access API folder picker + ffmpeg.wasm audio extraction in-browser, (b) a small local companion script (node) that watches the folder, extracts audio, uploads. Option (a) keeps it pure-web; (b) is simpler tech but a second thing to install. Not yet discussed with user in depth — flagged as "the fresh-brain session."
3. OBS replay-buffer clips are distinguishable by filename pattern ("Replay" prefix by default) — use for the `clip_type` column.

## Known landmine

Vercel has NO env vars configured yet. First deployed code that imports the Supabase client will break production until `VITE_SUPABASE_URL` + `VITE_SUPABASE_PUBLISHABLE_KEY` are added in Vercel project settings.
