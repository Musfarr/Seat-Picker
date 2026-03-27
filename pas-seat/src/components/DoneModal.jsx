export default function DoneModal({ phone_number, lanyardUrl, errorMessage }) {
  return (
    <div className="modal-overlay">
      <div className="done-card">
        <div className="done-check">✓</div>
        <h2 className="done-title">{errorMessage ? 'Booking Confirmed!' : 'You\'re all set!'}</h2>
        {errorMessage ? (
          <div style={{ marginBottom: '1rem' }}>
            <p style={{ color: '#fca5a5', fontSize: '0.9rem', margin: '0.5rem 0' }}>
              ⚠️ {errorMessage}
            </p>
            <p className="done-sub" style={{ marginTop: '0.5rem' }}>
              Your booking is confirmed.
            </p>
          </div>
        ) : (
          <p className="done-sub">
            Your pass has been sent via WhatsApp to<br />
            <strong>{phone_number}</strong>
          </p>
        )}
        {lanyardUrl && (
          <div className="done-lanyard-wrap">
            <img src={lanyardUrl} alt="Your Pass" className="done-lanyard-img" />
            <a href={lanyardUrl} download="effie-pass.png" className="done-download-btn">
              Download Pass
            </a>
          </div>
        )}
      </div>
    </div>
  )
}
