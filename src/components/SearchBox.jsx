import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { copyText, formatTimestamp } from '../lib/copyText'

// The transcript comes in chunks up to ~30s long. To point closer to the exact
// word, estimate its position inside the chunk by character offset.
function estimateMomentTime(result, query) {
  const start = Number(result.start_seconds)
  const end = Number(result.end_seconds)
  const terms = query.toLowerCase().split(/\s+/).filter((t) => t.length > 1)
  const text = result.text.toLowerCase()

  let idx = -1
  for (const term of terms) {
    const i = text.indexOf(term)
    if (i !== -1) { idx = i; break }
  }

  if (idx <= 0 || !end || end <= start) return { seconds: start, estimated: false }
  const ratio = idx / result.text.length
  return { seconds: start + ratio * (end - start), estimated: true }
}

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function highlightText(text, query) {
  const terms = query.toLowerCase().split(/\s+/).filter((t) => t.length > 1)
  if (!terms.length) return text
  const pattern = new RegExp(`(${terms.map(escapeRegex).join('|')})`, 'gi')
  return text.split(pattern).map((part, i) =>
    terms.includes(part.toLowerCase())
      ? <mark key={i} className="hl">{part}</mark>
      : part
  )
}

function SaveButton({ result }) {
  const [state, setState] = useState('idle')

  async function save() {
    setState('saving')
    const { error } = await supabase.from('saved_moments').insert({
      clip_id: result.clip_id,
      start_seconds: result.start_seconds,
      end_seconds: result.end_seconds,
      text: result.text,
    })
    setState(error ? 'idle' : 'saved')
  }

  if (state === 'saved') return <span className="saved-badge">★ Saved</span>
  return (
    <button type="button" className="action-btn" onClick={save} disabled={state === 'saving'}>
      ☆ Save
    </button>
  )
}

function ExportButton({ result, label }) {
  const [open, setOpen] = useState(false)
  const [custom, setCustom] = useState(false)
  const [before, setBefore] = useState(5)
  const [after, setAfter] = useState(3)
  const [queued, setQueued] = useState(false)

  async function queue(padBefore, padAfter) {
    await supabase.from('export_jobs').insert({
      clip_id: result.clip_id,
      start_seconds: result.start_seconds,
      end_seconds: result.end_seconds,
      pad_before: padBefore,
      pad_after: padAfter,
      label,
    })
    setQueued(true)
    setOpen(false)
  }

  if (queued) return <span className="saved-badge">✓ Export queued — run Sync</span>

  return (
    <span className="export-wrap">
      <button type="button" className="action-btn" onClick={() => setOpen(!open)}>
        Export clip ▾
      </button>
      {open && (
        <div className="export-menu">
          <button type="button" onClick={() => queue(5, 3)}>5s before</button>
          <button type="button" onClick={() => queue(10, 3)}>10s before</button>
          <button type="button" onClick={() => setCustom(!custom)}>Custom…</button>
          {custom && (
            <div className="export-custom">
              <label>Before<input type="number" min="0" value={before} onChange={(e) => setBefore(Number(e.target.value))} /></label>
              <label>After<input type="number" min="0" value={after} onChange={(e) => setAfter(Number(e.target.value))} /></label>
              <button type="button" className="action-btn" onClick={() => queue(before, after)}>Queue</button>
            </div>
          )}
        </div>
      )}
    </span>
  )
}

function ActionButton({ label, doneLabel, onAction }) {
  const [done, setDone] = useState(false)
  async function run() {
    await onAction()
    setDone(true)
    setTimeout(() => setDone(false), 1500)
  }
  return (
    <button type="button" className="action-btn" onClick={run}>
      {done ? doneLabel : label}
    </button>
  )
}

export default function SearchBox() {
  const [query, setQuery] = useState('')
  const [lastQuery, setLastQuery] = useState('')
  const [results, setResults] = useState(null)
  const [searching, setSearching] = useState(false)
  const [error, setError] = useState(null)

  async function handleSearch(e) {
    e.preventDefault()
    const q = query.trim()
    if (!q) { setResults(null); return }
    setSearching(true)
    setError(null)

    const { data, error } = await supabase
      .from('transcript_segments')
      .select('clip_id, start_seconds, end_seconds, text, clips(filename, folder_path, recorded_at)')
      .textSearch('fts', q, { type: 'websearch' })
      .limit(50)

    setSearching(false)
    if (error) setError(error.message)
    else { setResults(data); setLastQuery(q) }
  }

  return (
    <div className="search-section">
      <form onSubmit={handleSearch} className="search-form">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder='Search what you said… e.g. "boss fight" or "no way"'
          className="search-input"
        />
        <button type="submit" disabled={searching}>
          {searching ? 'Searching…' : 'Search'}
        </button>
      </form>

      {error && <p className="error">Search failed: {error}</p>}

      {results !== null && (
        <div className="search-results">
          <p className="muted results-count">
            {results.length === 0
              ? 'No matches. Try different words — only transcribed clips are searchable.'
              : `${results.length} match${results.length === 1 ? '' : 'es'}${results.length === 50 ? ' (showing first 50)' : ''}`}
          </p>
          <ul className="result-list">
            {results.map((r, i) => {
              const moment = estimateMomentTime(r, lastQuery)
              const fullPath = `${r.clips.folder_path ?? ''}\\${r.clips.filename}`
              return (
                <li key={i} className="result-card">
                  <div className="result-card-meta">
                    <span className="result-file">{r.clips.filename}</span>
                    <span className="result-time">
                      {moment.estimated ? '~' : ''}{formatTimestamp(moment.seconds)}
                    </span>
                  </div>
                  <p className="result-quote">"{highlightText(r.text, lastQuery)}"</p>
                  <div className="result-card-actions">
                    <SaveButton result={r} />
                    <ActionButton
                      label="Copy timestamp"
                      doneLabel="Copied ✓"
                      onAction={() => copyText(`${r.clips.filename} @ ${formatTimestamp(moment.seconds)}`)}
                    />
                    <ActionButton
                      label="Copy path"
                      doneLabel="Copied ✓"
                      onAction={() => copyText(fullPath)}
                    />
                    <ExportButton result={r} label={lastQuery} />
                  </div>
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </div>
  )
}
