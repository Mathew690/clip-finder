import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export default function ImpactPanel() {
  const [stats, setStats] = useState(null)

  useEffect(() => {
    async function load() {
      const [clipsRes, segRes, savedRes] = await Promise.all([
        supabase.from('clips').select('duration_seconds'),
        supabase.from('transcript_segments').select('*', { count: 'exact', head: true }),
        supabase.from('saved_moments').select('*', { count: 'exact', head: true }),
      ])
      const clips = clipsRes.data ?? []
      const hours = clips.reduce((s, c) => s + (Number(c.duration_seconds) || 0), 0) / 3600
      setStats({
        videos: clips.length,
        hours,
        moments: segRes.count ?? 0,
        saved: savedRes.count ?? 0,
      })
    }
    load()
  }, [])

  if (!stats) return null

  const items = [
    { value: stats.videos.toLocaleString(), label: 'Videos indexed' },
    { value: `${stats.hours.toFixed(1)}h`, label: 'Hours searchable' },
    { value: stats.moments.toLocaleString(), label: 'Searchable moments' },
    { value: stats.saved.toLocaleString(), label: 'Saved to gold pile' },
  ]

  return (
    <div className="impact">
      <p className="impact-heading">Your ClipScry</p>
      <div className="impact-grid">
        {items.map((it) => (
          <div className="impact-card" key={it.label}>
            <span className="impact-value">{it.value}</span>
            <span className="impact-label">{it.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
