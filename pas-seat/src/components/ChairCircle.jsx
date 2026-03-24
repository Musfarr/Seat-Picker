export default function ChairCircle({ table, onToggleChair, canSelectMore }) {
  const radius = 100
  const chairSize = 38
  return (
    <div className="chair-circle-wrap">
      <div className="chair-circle-container" style={{ width: radius * 2 + chairSize + 20, height: radius * 2 + chairSize + 20 }}>
        <div className="chair-center-table">
          <span className="chair-center-label">{table.displayNum || table.num}</span>
          {/* <span className="chair-center-type">{table.type.toUpperCase()}</span> */}
        </div>
        {table.chairs.map((chair, i) => {
          const angle = (i / 8) * Math.PI * 2 - Math.PI / 2
          const x = Math.cos(angle) * radius
          const y = Math.sin(angle) * radius
          const blockedByLimit = !chair.selected && !canSelectMore

          let cls = 'chair-dot'
          if (chair.booked) cls += ' chair-booked'
          else if (chair.selected) cls += ' chair-selected'
          else if (blockedByLimit) cls += ' chair-booked'
          else cls += ` chair-${table.type}`

          return (
            <button
              key={chair.label}
              className={cls}
              style={{
                width: chairSize, height: chairSize,
                left: `calc(50% + ${x}px - ${chairSize / 2}px)`,
                top: `calc(50% + ${y}px - ${chairSize / 2}px)`,
              }}
              disabled={chair.booked || blockedByLimit}
              onClick={() => !chair.booked && (chair.selected || canSelectMore) && onToggleChair(chair.label)}
              title={chair.booked ? 'Already booked' : blockedByLimit ? 'Seat limit reached' : `Chair ${chair.label}`}
            >
              {chair.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}
