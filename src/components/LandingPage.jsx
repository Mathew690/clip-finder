import LoginForm from './LoginForm'
import Brand from './Brand'

function scrollToStart() {
  document.getElementById('get-started')?.scrollIntoView({ behavior: 'smooth' })
}

const audiences = [
  { emoji: '🎥', label: 'YouTubers' },
  { emoji: '🎙️', label: 'Podcasters' },
  { emoji: '🎮', label: 'Streamers' },
  { emoji: '🎬', label: 'Video Editors' },
  { emoji: '🎓', label: 'Students' },
]

const worksWith = ['OBS', 'ShadowPlay', 'DaVinci Resolve', 'Premiere Pro', 'MP4', 'MKV', 'MOV']

const flowSteps = [
  { icon: '📁', label: 'Add footage' },
  { icon: '⏳', label: 'Processing' },
  { icon: '🔍', label: 'Search' },
  { icon: '⚡', label: 'Instant timestamp' },
]

export default function LandingPage() {
  return (
    <div className="lp">
      <nav className="lp-nav">
        <span className="lp-logo"><Brand /></span>
        <button type="button" className="lp-nav-btn" onClick={scrollToStart}>Sign in</button>
      </nav>

      <header className="lp-hero">
        <h1 className="lp-headline">
          Find any line in your <span className="lp-accent">raw footage.</span>
        </h1>
        <p className="lp-sub">
          Point ClipScry at your footage folder. Every word you said gets transcribed
          automatically — then just search, and jump to the exact file and second.
          No more scrubbing through hours of clips.
        </p>
        <button type="button" className="lp-cta" onClick={scrollToStart}>Get started free</button>

        <div className="lp-mockup">
          <div className="lp-mock-search">
            <span className="lp-mock-query">"merchant pistol"</span>
            <span className="lp-mock-searchbtn">Search</span>
          </div>
          <div className="lp-mock-result">
            <div className="lp-mock-result-top">
              <span className="lp-mock-file">Replay_34.mp4</span>
              <span className="lp-mock-time">01:23:18</span>
            </div>
            <p className="lp-mock-quote">"...I bought the pistol from the merchant..."</p>
            <span className="lp-mock-preview">▶ Preview</span>
          </div>
        </div>
      </header>

      <section className="lp-section">
        <h2 className="lp-h2">See it in action</h2>
        <div className="lp-video-slot">
          <div className="lp-video-placeholder">
            <span className="lp-play">▶</span>
            <p>Your 60-second demo goes here</p>
          </div>
        </div>
      </section>

      <section className="lp-section">
        <h2 className="lp-h2">How it works</h2>
        <div className="lp-flow">
          {flowSteps.map((step, i) => (
            <div className="lp-flow-item" key={step.label}>
              <div className="lp-flow-step" style={{ animationDelay: `${i * 0.6}s` }}>
                <span className="lp-flow-icon">{step.icon}</span>
                <span className="lp-flow-label">{step.label}</span>
              </div>
              {i < flowSteps.length - 1 && <span className="lp-flow-arrow">→</span>}
            </div>
          ))}
        </div>
      </section>

      <section className="lp-section">
        <h2 className="lp-h2">Perfect for</h2>
        <div className="lp-audience">
          {audiences.map((a) => (
            <div className="lp-chip" key={a.label}>
              <span className="lp-chip-emoji">{a.emoji}</span>
              <span>{a.label}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="lp-section">
        <h2 className="lp-h2">Works with</h2>
        <div className="lp-works">
          {worksWith.map((w) => (
            <span className="lp-work" key={w}>
              <span className="lp-check">✓</span> {w}
            </span>
          ))}
        </div>
      </section>

      <section className="lp-section lp-getstarted" id="get-started">
        <h2 className="lp-h2">Start scrying your footage</h2>
        <p className="lp-sub lp-sub-center">Free to start. Your videos never leave your PC.</p>
        <LoginForm />
      </section>

      <footer className="lp-footer">
        <p><Brand /> — made by one tired editor, for tired editors.</p>
      </footer>
    </div>
  )
}
