const planned = [
  { title: 'Semantic search', desc: 'Search by meaning, not just exact words — find a moment even if you don\'t remember the exact phrase.' },
  { title: 'DaVinci Resolve markers', desc: 'Send your saved moments straight into Resolve as timeline markers.' },
  { title: 'Premiere export', desc: 'Export timestamps to Premiere Pro as markers, no copy-paste.' },
  { title: 'AI summaries', desc: 'Auto-summarize what happens in each clip so you can skim your library.' },
  { title: 'Team libraries', desc: 'Share a searchable footage library with editors and collaborators.' },
]

export default function RoadmapPage() {
  return (
    <div>
      <h2 className="page-title">Roadmap</h2>
      <p className="muted" style={{ marginBottom: 24 }}>
        What's coming next. ClipScry is built in the open — got a request? It shapes this list.
      </p>
      <ul className="roadmap-list">
        {planned.map((item) => (
          <li className="roadmap-item" key={item.title}>
            <span className="roadmap-check">✓</span>
            <div>
              <p className="roadmap-item-title">{item.title}</p>
              <p className="roadmap-item-desc">{item.desc}</p>
            </div>
            <span className="roadmap-tag">Planned</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
