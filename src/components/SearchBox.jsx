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
    if (i !== -1) {
      idx = i
      break
    }
  }

  if (idx <= 0 || !end || end <= start) return { seconds: start, estimated: false }
  const ratio = idx / result.text.length
  return { seconds: start + ratio * (end - start), estimated: true }
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
    <button type="button" className="copy-button" onClick={save} disabled={state === 'saving'}>
      ☆ Save
    </button>
  )
}

function CopyButton({ filename, seconds }) {
  const [copied, setCopied] = useState(false)

  async function copy() {
    await copyText(`${filename} @ ${formatTimestamp(seconds)}`)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <button type="button" className="copy-button" onClick={copy}>
      {copied ? 'Copied ✓' : 'Copy'}
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
    if (!q) {
      setResults(null)
      return
    }
    setSearching(true)
    setError(null)

    const { data, error } = await supabase
      .from('transcript_segments')
      .select('clip_id, start_seconds, end_seconds, text, clips(filename, recorded_at)')
      .textSearch('fts', q, { type: 'websearch' })
      .limit(50)

    setSearching(false)
    if (error) setError(error.message)
    else {
      setResults(data)
      setLastQuery(q)
    }
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
              return (
                <li key={i} className="result-row">
                  <div className="result-where">
                    <span className="result-file">{r.clips.filename}</span>
                    <span className="result-time">
                      at {moment.estimated ? '~' : ''}{formatTimestamp(moment.seconds)}
                    </span>
                    <div className="row-actions">
                      <SaveButton result={r} />
                      <CopyButton filename={r.clips.filename} seconds={moment.seconds} />
                    </div>
                  </div>
                  <p className="result-text">"{r.text}"</p>
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </div>
  )
}
