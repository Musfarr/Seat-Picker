import ChairCircle from './ChairCircle'

export default function ChairPickerModal({ table, totalSelected, allowedSeats, atLimit, onToggleChair, canSelectMore, onClose }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">
            Table {table.num}
            {/* <span className={`modal-type-tag modal-type-${table.type}`}>{table.type.toUpperCase()}</span> */}
          </h2>
          <button className="modal-close" onClick={onClose}>&times;</button>
        </div>
        <p className="modal-hint">
          Select chairs · {totalSelected}/{allowedSeats} used
          {atLimit && <span className="modal-limit-warn"> · Limit reached</span>}
        </p>
        <ChairCircle
          table={table}
          onToggleChair={onToggleChair}
          canSelectMore={canSelectMore}
        />
        <div className="modal-legend">
          <span className="ml-item"><span className="ml-dot ml-available" />Available</span>
          <span className="ml-item"><span className="ml-dot ml-picked" />Selected</span>
          <span className="ml-item"><span className="ml-dot ml-taken" />Booked</span>
        </div>
        <button className="modal-done-btn" onClick={onClose}>Done</button>
      </div>
    </div>
  )
}
