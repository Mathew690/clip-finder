import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

function RemoveButton({ clip, onRemoved }) {
  const [confirming, setConfirming] = useState(false)

  async function remove() {
    const { error } = await supabase.from('clips').delete().eq('id', clip.id)
    if (!error) onRemoved(clip.id)
  }

  if (confirming) {
    return (
      <span className="confirm-remove">
        <span className="confirm-text">Deletes transcript + saved moments too</span>
        <button type="button" className="copy-button danger-hover" onClick={remove}>Confirm</button>
        <button type="button" className="copy-button" onClick={() => setConfirming(false)}>Cancel</button>
      </span>
    )
  }

  return (
    <button type="button" className="copy-button danger-hover" onClick={() => setConfirming(true)}>
      Remove
    </button>
  )
}

function formatDuration(seconds) {
  if (!seconds) return '—'
  const mins = Math.floor(seconds / 60)
  const secs = Math.round(seconds % 60)
  if (mins >= 60) return `${Math.floor(mins / 60)}h ${mins % 60}m`
  return `${mins}m ${secs}s`
}

function formatDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString(undefined, {
    year: 'numeric', month: 'short', day: 'numeric',
  })
}

function RemoveAllButton({ count, onCleared }) {
  const [open, setOpen] = useState(false)
  const [working, setWorking] = useState(false)

  async function removeAll() {
    setWorking(true)
    const { error } = await supabase.from('clips').delete().not('id', 'is', null)
    setWorking(false)
    if (!error) {
      setOpen(false)
      onCleared()
    }
  }

  return (
    <>
      <button
        type="button"
        className="copy-button danger-hover"
        title="⚠️ Dangerous button. Removes ALL clips from your library."
        onClick={() => setOpen(true)}
      >
        Remove all
      </button>

      {open && (
        <div className="modal-backdrop" onClick={(e) => { if (e.target === e.currentTarget) setOpen(false) }}>
          <div className="modal">
            <div className="modal-header">
              <h3>⚠️ Remove ALL {count} clips?</h3>
              <button type="button" className="modal-close" onClick={() => setOpen(false)}>✕</button>
            </div>
            <p className="modal-text">
              This wipes your entire library — every clip, every transcript, every
              saved moment. The video files on your PC are safe, but the app will
              forget every word you ever said. Like it never knew you.
            </p>
            <p className="modal-text muted-small">
              (You can always re-sync your folder afterwards, but transcribing
              everything again takes time.)
            </p>
            <div className="modal-actions">
              <button type="button" className="copy-button" onClick={() => setOpen(false)}>
                No — I said what I said
              </button>
              <button type="button" className="danger-button" onClick={removeAll} disabled={working}>
                {working ? 'Forgetting everything…' : 'Yes, wipe it all'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default function ClipLibrary() {
  const [clips, setClips] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    supabase
      .from('clips')
      .select('*')
      .order('recorded_at', { ascending: false })
      .then(({ data, error }) => {
        if (error) setError(error.message)
        else setClips(data)
      })
  }, [])

  if (error) return <p className="error">Couldn't load clips: {error}</p>
  if (clips === null) return <p className="muted">Loading your library…</p>

  if (clips.length === 0) {
    return (
      <div>
        <h2>Your library is empty</h2>
        <p className="muted">
          Run the helper script to scan your OBS folder:
          <code> node helper/scan.mjs</code>
        </p>
      </div>
    )
  }

  const totalSeconds = clips.reduce((sum, c) => sum + (c.duration_seconds ?? 0), 0)
  const totalHours = (totalSeconds / 3600).toFixed(1)
  const readyCount = clips.filter((c) => c.status === 'ready').length

  return (
    <div>
      <div className="library-toolbar">
        <RemoveAllButton count={clips.length} onCleared={() => setClips([])} />
      </div>
      <div className="library-stats">
        <div className="stat">
          <span className="stat-number">{clips.length}</span>
          <span className="stat-label">clips</span>
        </div>
        <div className="stat">
          <span className="stat-number">{totalHours}h</span>
          <span className="stat-label">total footage</span>
        </div>
        <div className="stat">
          <span className="stat-number">{readyCount}</span>
          <span className="stat-label">searchable</span>
        </div>
      </div>

      <ul className="clip-list">
        {clips.map((clip) => (
          <li key={clip.id} className="clip-row">
            <div className="clip-main">
              <span className="clip-name">{clip.filename}</span>
              <span className="muted clip-meta">
                {formatDate(clip.recorded_at)} · {formatDuration(clip.duration_seconds)}
                {clip.clip_type === 'replay' && ' · replay'}
              </span>
            </div>
            <div className="clip-actions">
              <RemoveButton clip={clip} onRemoved={(id) => setClips(clips.filter((c) => c.id !== id))} />
              <span className={`status status-${clip.status}`}>{clip.status}</span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
