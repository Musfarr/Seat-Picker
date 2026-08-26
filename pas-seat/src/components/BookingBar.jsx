export default function BookingBar({ totalSelected, onClear, onBook }) {
  if (totalSelected === 0) return null

  return (
    <div className="booking-bar">
      <div className="booking-bar-left">
        <div className="booking-indicator">
          <span className="booking-pulse-dot" />
          <span className="booking-count">
            {totalSelected} {totalSelected === 1 ? 'Seat' : 'Seats'} Selected
          </span>
        </div>
        <button type="button" className="clear-btn" onClick={onClear} title="Clear all selections">
          Clear All
        </button>
      </div>

      <button type="button" className="book-btn" onClick={onBook}>
        <span>Proceed to Book</span>
        <span className="book-btn-arrow">→</span>
      </button>
    </div>
  )
}

