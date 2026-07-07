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
- [x] Auth — email/password via AuthContext + LoginForm, live in prod, owner's account created. Email confirmation disabled in Supabase (single user for now — re-enable before public launch).
- [~] Core loop, first half DONE: `helper/scan.mjs` scans the OBS folder, probes durations via ffprobe, registers clips (175 real clips in DB, 11.8h total). Second half TODO: extract audio (ffmpeg → 16kHz mono opus/m4a) → Groq whisper-large-v3-turbo → insert transcript_segments → set clip status ready.
- [ ] Search UI: query box → full-text search → results as file + timestamp + surrounding text

Decisions made 2026-07-06: transcription = Groq API (key in `.env.local` as GROQ_API_KEY, verified working; free tier covers the 11.8h backlog). Architecture = local helper script (native ffmpeg, installed) + web app as library/search UI. Helper signs into Supabase with owner credentials from `.env.local` (SUPABASE_EMAIL/SUPABASE_PASSWORD). Web library view: `src/components/ClipLibrary.jsx`, live in prod.

## Open decisions (decide WITH the user, present options simply)

1. **Transcription API** — undecided. Candidates: OpenAI Whisper API, Groq (whisper, very cheap/fast), Deepgram. Criteria: cost per audio-hour (his clips are long), accuracy on casual gaming speech. His budget: minimal, pay-per-use only.
2. **Audio extraction** — the hard problem. Browser can't read `D:\OBS VIDEOS new` freely. Options: (a) File System Access API folder picker + ffmpeg.wasm audio extraction in-browser, (b) a small local companion script (node) that watches the folder, extracts audio, uploads. Option (a) keeps it pure-web; (b) is simpler tech but a second thing to install. Not yet discussed with user in depth — flagged as "the fresh-brain session."
3. OBS replay-buffer clips are distinguishable by filename pattern ("Replay" prefix by default) — use for the `clip_type` column.

## Dogfooding insights (feature backlog, prioritize by user pain)

1. (2026-07-07) User deletes big raw files for disk space as soon as a video ships. App needs graceful handling: an "archived" state that keeps transcripts searchable after the file is gone (transcripts are tiny — keep them forever, that's the whole value), plus scan detecting missing files instead of transcribe erroring on them. Interim workaround used: deleted the 7 error rows manually.

## Agreed v2 roadmap (2026-07-07, owner's vision, in priority order)

1. **Audio preview on search results** — store extracted audio going forward (16kHz opus ≈ 11MB/hr; whole library ~130MB fits Supabase Storage free tier). Search result gets a ▶ button playing the moment. Requires: transcribe.mjs uploads audio to Storage instead of deleting; RLS on the bucket.
2. **Export clip to editor** — from a search result, request a cut; helper (watching a jobs table or run on demand) uses ffmpeg `-ss/-to -c copy` to cut the segment into an `exports/` folder for drag-into-Premiere. Requires: export_jobs table.
3. Landing page + copy-timestamp button: DONE 2026-07-07.
4. Video preview: blocked by .mkv (browsers can't play it). Path: switch OBS to record mp4 (or auto-remux) for future clips, then local playback via File System Access API.

## Launch blockers (what stands between "works for owner" and "strangers can buy") — identified 2026-07-07

1. **Companion app**: package the helper as a downloadable Windows app (login + folder picker + start button; no terminal). Candidate tech: Tauri tray app, or pkg/bun-compiled CLI first. Folder-agnostic already.
2. **Groq key proxy**: transcription must go through a Supabase Edge Function holding the key server-side, checking auth + subscription before transcribing. This IS the Phase 5 Stripe work in practice.
3. **Per-user quotas**: monthly transcribed-hours column; enables free trial without cost bleed. Unit economics: Groq ≈ $0.04/audio-hour → $5-8/mo sub has fat margin.

## Business model + quota design (agreed 2026-07-07, owner understands and endorses)

Money flow: customer pays owner via Stripe → owner's Edge Function calls Groq on OWNER's key → Groq bills owner. Owner keeps the spread. Customers never see/touch the Groq key.

Pricing math (planning numbers, revisit at build):
- Sub ~$7/mo. Stripe takes ~2.9%+$0.30 (~$0.50). Owner nets ~$6.50.
- Groq cost ~$0.04/audio-hour. A 50hr/mo cap = ~$2 worst-case cost. Profit ~$4.50-5.70/user/mo.
- 100 users ≈ ~$550/mo profit. Margin stays fat because transcription is cheap + sub is fixed.

Quota enforcement — CRITICAL: the limit check MUST live in the Edge Function (server-side), NEVER in the downloadable companion app (client-side checks are bypassable — user could edit the app and drain owner's Groq account). 

Edge Function gate on EVERY transcription request, in order:
1. Verify user's auth token (who).
2. Check active subscription in Supabase (are they paid / not cancelled).
3. Check hours_used vs cap for current period.
4. If under cap → call Groq, transcribe, increment hours_used.
5. If at/over cap → refuse WITHOUT calling Groq (owner cost = $0). Return "monthly limit reached."

Schema needed later: subscription status + `hours_used` + `period_start` per user (or a usage table). Reset hours_used to 0 on each confirmed Stripe billing cycle. Companion app shows friendly wall at limit; real enforcement is server-side.

## Resolved landmines

- Vercel env vars (`VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`) were added 2026-07-06, scoped to Production and Preview. Local dev uses `.env.local`.
