export default function DoneModal({ phone_number, lanyardUrl }) {
  return (
    <div className="modal-overlay">
      <div className="done-card">
        <div className="done-check">✓</div>
        <h2 className="done-title">Booking Confirmed!</h2>
        <p className="done-sub">
          Your pass has been sent via WhatsApp to<br />
          <strong>{phone_number}</strong>
        </p>
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
