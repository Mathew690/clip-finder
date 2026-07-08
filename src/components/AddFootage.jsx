import { useState } from 'react'

export default function AddFootage() {
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState(false)

  async function copyCommand() {
    const text = 'npm run sync'
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
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <>
      <button type="button" className="add-footage-button" onClick={() => setOpen(true)}>
        + Add footage
      </button>

      {open && (
        <div className="modal-backdrop" onClick={(e) => { if (e.target === e.currentTarget) setOpen(false) }}>
          <div className="modal">
            <div className="modal-header">
              <h3>Add footage</h3>
              <button type="button" className="modal-close" onClick={() => setOpen(false)}>✕</button>
            </div>

            <p className="modal-text">
              Your video files stay on your PC — Clip Finder only indexes the words.
              To add new recordings, open a terminal in your Clip Finder folder and run:
            </p>

            <div className="command-row">
              <code>npm run sync</code>
              <button type="button" className="copy-button" onClick={copyCommand}>
                {copied ? 'Copied ✓' : 'Copy'}
              </button>
            </div>

            <p className="modal-text muted-small">
              It scans your recording folder, transcribes anything new, and your
              clips become searchable in minutes. A one-click desktop app version
              is on the roadmap.
            </p>
          </div>
        </div>
      )}
    </>
  )
}
