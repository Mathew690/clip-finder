// The owner runs the CLI helpers (scan/transcribe) locally from the repo.
// Everyone else is an early-access signup and must NOT be told to run terminal
// commands they have no way of running — they get the waitlist message instead.
//
// Matched on user id, not email: VITE_* vars are baked into the public JS bundle,
// and a UUID leaks nothing useful whereas an email would be scrapeable.
export function isOwner(user) {
  const ownerId = import.meta.env.VITE_OWNER_ID
  return Boolean(ownerId && user?.id && user.id === ownerId)
}
