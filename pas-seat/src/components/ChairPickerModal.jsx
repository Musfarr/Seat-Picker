import { useEffect } from 'react'
import ChairCircle from './ChairCircle'

export default function ChairPickerModal({
  table,
  totalSelected,
  allowedSeats,
  atLimit,
  onToggleChair,
  canSelectMore,
  onClose,
}) {
  const isVip = table.type === 'vip'
  const tableSelectedCount = table.chairs.filter(c => c.selected).length

  // Allow closing on Esc key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content modal-content--gala" onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="modal-header">
          <div className="modal-title-wrap">
            <h2 className="modal-title">
              Table {table.displayNum || table.num}
            </h2>
            <span className={`modal-type-tag modal-type-${table.type}`}>
              {isVip ? '★ VIP TABLE' : 'STANDARD TABLE'}
            </span>
          </div>
          <button className="modal-close" onClick={onClose} aria-label="Close modal">
            &times;
          </button>
        </div>

        {/* Quota & status bar */}
        <div className="modal-status-bar">
          <span className="modal-status-txt">
            Total Selection: <strong>{totalSelected} / {allowedSeats}</strong>
          </span>
          {tableSelectedCount > 0 && (
            <span className="modal-table-sel-pill">
              {tableSelectedCount} on this table
            </span>
          )}
          {atLimit && !tableSelectedCount && (
            <span className="modal-limit-warn">Quota Reached</span>
          )}
        </div>

        {/* Chair Circle Visual */}
        <ChairCircle
          table={table}
          onToggleChair={onToggleChair}
          canSelectMore={canSelectMore}
        />

        {/* Legend */}
        <div className="modal-legend">
          <div className="ml-item">
            <span className="ml-dot ml-available" />
            <span>Available</span>
          </div>
          <div className="ml-item">
            <span className="ml-dot ml-picked" />
            <span>Selected</span>
          </div>
          <div className="ml-item">
            <span className="ml-dot ml-taken" />
            <span>Booked</span>
          </div>
          {isVip && (
            <div className="ml-item">
              <span className="ml-dot ml-vip" />
              <span>VIP</span>
            </div>
          )}
        </div>

        {/* Done Button */}
        <button type="button" className="modal-done-btn" onClick={onClose}>
          Confirm Table Selection
        </button>
      </div>
    </div>
  )
}

