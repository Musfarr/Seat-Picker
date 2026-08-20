import { getSelectedCount } from '../utils/seatLayout'

export default function TableBtn({ table, onClick, dimmed = false }) {
  const { available, type, num, displayNum, chairs = [] } = table
  const selCount = getSelectedCount(table)
  const hasSelection = selCount > 0
  const off = !available || dimmed
  const isVip = type === 'vip'

  const bookedCount = chairs.filter(c => c.booked).length
  const totalChairs = chairs.length || 8
  const availableCount = totalChairs - bookedCount

  return (
    <button
      type="button"
      className={`table-node${off ? ' table-node--off' : ''}${isVip ? ' table-node--vip' : ''}${hasSelection ? ' table-node--selected' : ''}`}
      onClick={() => !off && onClick(table)}
      title={
        dimmed
          ? 'Not available for your ticket type'
          : available
          ? `Table ${displayNum || num} (${isVip ? 'VIP' : 'Standard'}) · ${availableCount} of ${totalChairs} seats available`
          : `Table ${displayNum || num} (Full / Unavailable)`
      }
      aria-label={`Table ${displayNum || num}`}
    >
      {/* Miniature chair ring surrounding table */}
      <div className="table-chairs-orbit">
        {chairs.map((c, i) => {
          const angle = (i / totalChairs) * Math.PI * 2 - Math.PI / 2
          const rad = 34 // radius from center for prominent table
          const x = Math.cos(angle) * rad
          const y = Math.sin(angle) * rad

          let dotClass = 'mini-chair-dot'
          if (c.selected) dotClass += ' mini-chair--selected'
          else if (c.booked) dotClass += ' mini-chair--booked'
          else if (isVip) dotClass += ' mini-chair--vip'
          else dotClass += ' mini-chair--avail'

          return (
            <span
              key={c.label || i}
              className={dotClass}
              style={{
                transform: `translate(${x}px, ${y}px)`,
              }}
            />
          )
        })}
      </div>

      {/* Main Table Disc */}
      <div className="table-disc">
        <div className="table-disc-inner">
          <span className="table-number">{displayNum || num}</span>
          {isVip && <span className="table-vip-crown">★</span>}
        </div>
      </div>

      {/* Selected badge */}
      {hasSelection && (
        <span className="table-badge">
          {selCount}
        </span>
      )}
    </button>
  )
}

