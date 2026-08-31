import BreakoutForm from './BreakoutForm'

export default function BreakoutPage() {
  return (
    <div className="bo-page">

      {/* Logo */}
      <div className="toplogo">
        <img style={{ width: '120px' }} src="/logo.png" alt="Logo" />
      </div>

      {/* Decorative blobs */}
      <div className="bo-blob bo-blob--top" />
      <div className="bo-blob bo-blob--bottom" />

      {/* Header */}
      <header className="bo-header">
        <p className="bo-header-eyebrow">MADsemble 2025</p>
        <h1 className="bo-header-title">
          Book Your <span className="bo-header-highlight">Breakout Sessions</span>
        </h1>
        <p className="bo-header-sub">
          Choose expert-led sessions on creative strategy, business leadership, and digital transformation.
        </p>
      </header>

      {/* Card */}
      <section className="bo-section">
        <div className="bo-card">
          <BreakoutForm />
        </div>
      </section>

      {/* Footer */}
      <footer className="bo-footer">
        Questions? Email us at{' '}
        <span className="bo-footer-email">events@madsemble.org</span>
      </footer>
    </div>
  )
}
