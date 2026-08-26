import { useEffect } from 'react'

export default function ConfirmModal({ paramData, allSelections, onCancel, onConfirm }) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onCancel()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onCancel])

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="confirm-content modal-content--gala" onClick={e => e.stopPropagation()}>
        <div className="confirm-header">
          <div className="confirm-icon-badge">🎟️</div>
          <h2 className="confirm-title">Confirm Seat Reservation</h2>
          <p className="confirm-subtitle">Please review your booking details before confirming</p>
        </div>

        {/* User Card */}
        <div className="confirm-user-card">
          <div className="confirm-user-avatar">
            {paramData?.Image ? (
              <img src={paramData.Image} alt={paramData.Full_Name} className="confirm-avatar-img" />
            ) : (
              <span className="confirm-avatar-initials">
                {(paramData?.Full_Name || 'U').charAt(0).toUpperCase()}
              </span>
            )}
          </div>
          <div className="confirm-user-info">
            <p className="confirm-user-name">{paramData?.Full_Name || 'Valued Guest'}</p>
            {paramData?.Designation && paramData?.Company_Name && (
              <p className="confirm-user-role">
                {paramData.Designation} · {paramData.Company_Name}
              </p>
            )}
            {paramData?.phone_number && (
              <p className="confirm-user-contact">📞 {paramData.phone_number}</p>
            )}
          </div>
        </div>

        {/* Seats List */}
        <div className="confirm-seats-section">
          <div className="confirm-seats-header">
            <span>SELECTED SEATS ({allSelections.length})</span>
            <span className="confirm-flow-badge">{paramData?.flow === 'corporate' ? 'Corporate' : 'Individual'}</span>
          </div>

          <div className="confirm-list">
            {allSelections.map((s, i) => (
              <div key={i} className="confirm-seat-chip">
                <span className={`confirm-tag confirm-tag-${s.type}`}>
                  {s.type === 'vip' ? '★ VIP' : 'STD'}
                </span>
                <span className="confirm-seat-desc">
                  Table <strong>{s.tableId}</strong> · Seat <strong>{s.chair}</strong>
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="confirm-actions">
          <button type="button" className="confirm-cancel" onClick={onCancel}>
            Modify Selection
          </button>
          <button type="button" className="confirm-ok" onClick={onConfirm}>
            Confirm & Reserve
          </button>
        </div>
      </div>
    </div>
  )
}

