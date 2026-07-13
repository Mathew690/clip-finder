import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

export default function AddFootage() {
  const { user } = useAuth()
  const [open, setOpen] = useState(false)
  const [folder, setFolder] = useState('')
  const [loaded, setLoaded] = useState(false)
  const [saved, setSaved] = useState(false)
  const [copied, setCopied] = useState(false)

  async function openModal() {
    setOpen(true)
    if (!loaded) {
      const { data } = await supabase
        .from('user_settings').select('footage_folder').eq('user_id', user.id).maybeSingle()
      setFolder(data?.footage_folder ?? '')
      setLoaded(true)
    }
  }

  async function saveFolder() {
    await supabase.from('user_settings').upsert({
      user_id: user.id,
      footage_folder: folder.trim(),
      updated_at: new Date().toISOString(),
    })
    setSaved(true)
    setTimeout(() => setSaved(false), 1500)
  }

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
      <button type="button" className="add-footage-button" onClick={openModal}>
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
              Point ClipScry at the folder where OBS (or ShadowPlay, etc.) saves your
              recordings. Your video files stay on your PC — only the words get indexed.
            </p>

            <label className="folder-label">
              Your footage folder
              <input
                type="text"
                className="folder-input"
                value={folder}
                onChange={(e) => setFolder(e.target.value)}
                placeholder="e.g. D:\OBS VIDEOS new"
              />
            </label>
            <p className="folder-hint">
              Find this in OBS → Settings → Output → Recording Path.
            </p>
            <button type="button" className="add-footage-button folder-save" onClick={saveFolder}>
              {saved ? 'Saved ✓' : 'Save folder'}
            </button>

            <div className="modal-divider" />

            <p className="modal-text">
              Then run ClipScry Sync to scan and index anything new — double-click
              <strong> ClipScry Sync</strong> on your desktop, or run:
            </p>
            <div className="command-row">
              <code>npm run sync</code>
              <button type="button" className="copy-button" onClick={copyCommand}>
                {copied ? 'Copied ✓' : 'Copy'}
              </button>
            </div>
            <p className="modal-text muted-small">
              A one-click desktop app that does this automatically is on the roadmap.
            </p>
          </div>
        </div>
      )}
    </>
  )
}
