export default function BookingBar({ totalSelected, onClear, onBook }) {
  if (totalSelected === 0) return null
  return (
    <div className="booking-bar">
      <div className="booking-bar-left">
        <span className="booking-count">{totalSelected} chair{totalSelected > 1 ? 's' : ''} selected</span>
        <button className="clear-btn" onClick={onClear}>Clear All</button>
      </div>
      <button className="book-btn" onClick={onBook}>Book Seats</button>
    </div>
  )
}
