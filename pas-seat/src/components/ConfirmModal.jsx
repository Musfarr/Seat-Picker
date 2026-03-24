export default function ConfirmModal({ paramData, allSelections, onCancel, onConfirm }) {
  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="confirm-content" onClick={e => e.stopPropagation()}>
        <h2 className="confirm-title">Confirm Your Booking</h2>
        <div className="confirm-user-row">
          <div>
            <p className="confirm-user-name">{paramData.Full_Name}</p>
            <p className="confirm-user-email">{paramData.Email_Address}</p>
            {paramData.Designation && (
              <p className="confirm-user-email" style={{ fontSize: '0.75rem', marginTop: '0.25rem' }}>
                {paramData.Designation} · {paramData.Company_Name}
              </p>
            )}
          </div>
        </div>
        <div className="confirm-list">
          {allSelections.map((s, i) => (
            <div key={i} className="confirm-row">
              <span className={`confirm-tag confirm-tag-${s.type}`}>{s.type.toUpperCase()}</span>
              <span className="confirm-seat">{s.tableId}-{s.chair}</span>
            </div>
          ))}
        </div>
        <div className="confirm-actions" style={{ marginTop: '1rem' }}>
          <button className="confirm-cancel" onClick={onCancel}>Cancel</button>
          <button className="confirm-ok" onClick={onConfirm}>Confirm & Book</button>
        </div>
      </div>
    </div>
  )
}
