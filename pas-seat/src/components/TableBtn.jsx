import { getSelectedCount } from '../utils/seatLayout'

export default function TableBtn({ table, onClick, dimmed = false }) {
  const { available, type, num, displayNum } = table
  const selCount = getSelectedCount(table)
  const hasSelection = selCount > 0
  const off = !available || dimmed

  let ring = 'seat-ring'
  let inner = 'seat-inner'
  if (off) { ring += ' ring-unavail'; inner += dimmed ? ' inner-dimmed' : ' inner-unavail' }
  else if (hasSelection) { ring += ' ring-selected'; inner += ' inner-selected' }
  else { ring += ` ring-${type}`; inner += ` inner-${type}` }

  return (
    <button
      className={`seat-btn${off ? ' seat-btn--off' : ''}`}
      onClick={() => !off && onClick(table)}
      title={dimmed ? 'Not available for your ticket type' : available ? `${type.toUpperCase()} Table ${displayNum || num}` : 'Unavailable'}
    >
      <div className={ring}>
        <div className={inner}>
          <span className="seat-label">{displayNum || num}</span>
        </div>
      </div>
      {hasSelection && <span className="table-badge">{selCount}</span>}
    </button>
  )
}
