import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

function formatTimestamp(seconds) {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${String(secs).padStart(2, '0')}`
}

export default function SavedPage() {
  const [moments, setMoments] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    supabase
      .from('saved_moments')
      .select('id, start_seconds, end_seconds, text, note, created_at, clips(filename)')
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (error) setError(error.message)
        else setMoments(data)
      })
  }, [])

  async function remove(id) {
    await supabase.from('saved_moments').delete().eq('id', id)
    setMoments(moments.filter((m) => m.id !== id))
  }

  async function copy(m) {
    const text = `${m.clips.filename} @ ${formatTimestamp(m.start_seconds)} — "${m.text}"`
    try {
      await navigator.clipboard.writeText(text)
    } catch {
      const ta = document.createElement('textarea')
      ta.value = text
      ta.style.position = 'fixed'
      ta.style.opacity = '0'
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      ta.remove()
    }
  }

  if (error) return <p className="error">Couldn't load saved moments: {error}</p>
  if (moments === null) return <p className="muted">Loading…</p>

  if (moments.length === 0) {
    return (
      <div>
        <h2>Saved moments</h2>
        <p className="muted">
          Your editing gold pile is empty. When a search result is a keeper,
          hit ☆ Save and it lands here.
        </p>
      </div>
    )
  }

  return (
    <div>
      <h2>Saved moments</h2>
      <p className="muted results-count">{moments.length} saved — your editing gold pile</p>
      <ul className="result-list">
        {moments.map((m) => (
          <li key={m.id} className="result-row">
            <div className="result-where">
              <span className="result-file">{m.clips.filename}</span>
              <span className="result-time">at {formatTimestamp(m.start_seconds)}</span>
              <div className="row-actions">
                <button type="button" className="copy-button" onClick={() => copy(m)}>Copy</button>
                <button type="button" className="copy-button danger-hover" onClick={() => remove(m.id)}>Remove</button>
              </div>
            </div>
            <p className="result-text">"{m.text}"</p>
          </li>
        ))}
      </ul>
    </div>
  )
}
