export default function ProcessingOverlay({ step }) {
  return (
    <div className="modal-overlay">
      <div className="spinner-card">
        <div className="spinner" />
        <p className="spinner-step">{step}</p>
      </div>
    </div>
  )
}
