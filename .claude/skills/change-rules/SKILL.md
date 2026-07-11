---
name: change-rules
description: Rules for making any change to the ClipScry codebase or database — commits, schema changes, secrets, deploys, scope. Use before writing code, altering tables, or pushing.
---

# Change rules

Handoff note: these rules exist because the project's owner is a first-time builder whose scarce resource is momentum. Every rule protects either the working app or that momentum.

## Scope

- The product idea is LOCKED. Spec lives at `D:\My Vault\Vault Build\ClipScry - Spec.md`. Do not redesign, do not suggest pivots, do not add features beyond the current phase. Simplest version that works, always.
- One feature per session. Every session must end with something visibly working — that is non-negotiable, it is what keeps the project alive.
- v1 out-of-scope (do not build): in-app video playback, editor plugins, visual/AI tagging of frames.

## Git

- Commit after each working step, plain descriptive messages.
- `git push` to `main` = instant production deploy (Vercel). Never push code you haven't at least run `npm run build` on if the change touches build-relevant files.
- NEVER commit: `.env.local`, any file containing the database password or a `service_role`/secret key. The publishable key (`sb_publishable_...`) is public by design and safe in client code.

## Database

- Every schema change: write the SQL, have the user run it in the Supabase SQL Editor, then verify from here with a throwaway node script (write in project root, run, delete).
- Append every schema change to `supabase/schema.sql` in this repo so the schema's history stays reconstructable. This file is the source of truth for what the database looks like.
- RLS on every new table, always, with owner-only policies — no exceptions, the key ships publicly.
- Secret keys (service_role, transcription API keys) belong ONLY in Supabase Edge Function environment variables — never in client code, never in the repo.

## Bookkeeping

- When a checklist item or phase completes, update `D:\My Vault\Vault Build\ClipScry - Build Checklist.md` (checkbox + short result note). The user relies on this file to see progress — it is part of the product.
