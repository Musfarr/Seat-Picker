import { useState, useMemo } from 'react'

/**
 * SideBookingDrawer
 * A sleek frosted-glass right-side fixed drawer matching the gala theme.
 * Displays selected seat details, a visual table overview graphic,
 * quota status, and the gold "BOOK NOW" action button.
 */
export default function SideBookingDrawer({
  allSelections = [],
  allowedSeats = 0,
  totalSelected = 0,
  paramData,
  onClear,
  onBook,
  onRemoveSeat,
  isOpen = true,
  onClose,
}) {
  const atLimit = totalSelected >= allowedSeats
  const remaining = Math.max(0, allowedSeats - totalSelected)

  // Get the most recently interacted table or primary table
  const primaryTableId = useMemo(() => {
    if (allSelections.length === 0) return null
    return allSelections[allSelections.length - 1].tableId
  }, [allSelections])

  // Mini 8-chair positions around the central circle for visual graphic
  const miniChairAngles = [0, 45, 90, 135, 180, 225, 270, 315]

  if (!isOpen || totalSelected === 0) return null

  return (
    <aside className="side-drawer-container">
      <div className="side-drawer-glass">
        {/* Header */}
        <div className="side-drawer-header">
          <div className="side-drawer-title-wrap">
            <h3 className="side-drawer-title">
              {primaryTableId ? `Table ${primaryTableId}` : 'Seat Selection'}
            </h3>
            <span className="side-drawer-sub">
              {totalSelected} of {allowedSeats} Seats Picked
            </span>
          </div>
          <button
            type="button"
            className="side-drawer-close-btn"
            onClick={onClose}
            title="Close Drawer"
          >
            ✕
          </button>
        </div>

        {/* Visual Table Graphic (from reference image) */}
        <div className="side-drawer-visual">
          <div className="side-visual-table">
            <div className="side-visual-disc">
              <span>{primaryTableId || totalSelected}</span>
            </div>
            {miniChairAngles.map((deg, idx) => {
              const rad = (deg * Math.PI) / 180
              const r = 36
              const x = Math.round(r * Math.cos(rad))
              const y = Math.round(r * Math.sin(rad))
              const isPicked = idx < totalSelected
              return (
                <span
                  key={idx}
                  className={`side-visual-dot ${isPicked ? 'side-visual-dot--active' : ''}`}
                  style={{
                    transform: `translate(${x}px, ${y}px)`,
                  }}
                />
              )
            })}
          </div>
        </div>

        {/* Selected Seats Table List */}
        <div className="side-drawer-card">
          <div className="side-table-header">
            <span>Seat Number</span>
            <span>Type / Status</span>
          </div>

          <div className="side-table-body">
            {allSelections.map((s, idx) => (
              <div key={`${s.tableId}-${s.chair}-${idx}`} className="side-table-row">
                <div className="side-seat-info">
                  <span className="side-seat-checkbox">✓</span>
                  <span className="side-seat-label">
                    Table {s.tableId} · Seat {s.chair}
                  </span>
                </div>
                <div className="side-seat-actions">
                  <span className={`side-tag side-tag-${s.type}`}>
                    {s.type === 'vip' ? 'VIP' : 'Standard'}
                  </span>
                  {onRemoveSeat && (
                    <button
                      type="button"
                      className="side-remove-btn"
                      onClick={() => onRemoveSeat(s.tableId, s.chair)}
                      title="Remove seat"
                    >
                      ×
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Summary Info */}
        <div className="side-drawer-summary">
          <div className="side-summary-row">
            <span className="side-summary-label">Total Seats</span>
            <span className="side-summary-val">{totalSelected} / {allowedSeats}</span>
          </div>

          <div className="side-summary-row">
            <span className="side-summary-label">Remaining Quota</span>
            <span className="side-summary-val side-summary-val--highlight">
              {remaining === 0 ? 'Quota Complete' : `${remaining} seat${remaining > 1 ? 's' : ''} left`}
            </span>
          </div>

          {paramData?.Company_Name && (
            <div className="side-summary-row side-summary-row--footer">
              <span className="side-summary-label">Company</span>
              <span className="side-summary-val side-summary-val--company">
                {paramData.Company_Name}
              </span>
            </div>
          )}
        </div>

        {/* Clear & Actions */}
        <div className="side-drawer-actions">
          {totalSelected > 0 && onClear && (
            <button
              type="button"
              className="side-clear-btn"
              onClick={onClear}
            >
              Clear All
            </button>
          )}

          <button
            type="button"
            className="side-book-btn"
            onClick={onBook}
          >
            <span>BOOK NOW</span>
          </button>
        </div>
      </div>
    </aside>
  )
}
