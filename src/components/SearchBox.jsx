import { useState } from 'react'
import { supabase } from '../lib/supabase'

function formatTimestamp(seconds) {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${String(secs).padStart(2, '0')}`
}

export default function SearchBox() {
  const [query, setQuery] = useState('')
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
      .select('start_seconds, end_seconds, text, clips(filename, recorded_at)')
      .textSearch('fts', q, { type: 'websearch' })
      .limit(50)

    setSearching(false)
    if (error) setError(error.message)
    else setResults(data)
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
            {results.map((r, i) => (
              <li key={i} className="result-row">
                <div className="result-where">
                  <span className="result-file">{r.clips.filename}</span>
                  <span className="result-time">at {formatTimestamp(r.start_seconds)}</span>
                </div>
                <p className="result-text">"{r.text}"</p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
