export default function ChairCircle({ table, onToggleChair, canSelectMore }) {
  const radius = 115
  const chairSize = 46
  const isVip = table.type === 'vip'
  const totalChairs = table.chairs.length || 8

  return (
    <div className="chair-circle-wrap">
      <div
        className="chair-circle-container"
        style={{
          width: radius * 2 + chairSize + 30,
          height: radius * 2 + chairSize + 30,
        }}
      >
        {/* Central Banquet Table Disc */}
        <div className={`chair-center-table${isVip ? ' chair-center-vip' : ''}`}>
          <div className="chair-center-glow" />
          <span className="chair-center-prefix">{isVip ? 'VIP TABLE' : 'TABLE'}</span>
          <span className="chair-center-label">{table.displayNum || table.num}</span>
          <span className="chair-center-count">
            {table.chairs.filter(c => c.selected).length} selected
          </span>
        </div>

        {/* Radial Chairs */}
        {table.chairs.map((chair, i) => {
          const angle = (i / totalChairs) * Math.PI * 2 - Math.PI / 2
          const x = Math.cos(angle) * radius
          const y = Math.sin(angle) * radius
          const blockedByLimit = !chair.selected && !canSelectMore

          let cls = 'chair-node'
          if (chair.booked) cls += ' chair-booked'
          else if (chair.selected) cls += ' chair-selected'
          else if (blockedByLimit) cls += ' chair-blocked'
          else if (isVip) cls += ' chair-vip'
          else cls += ' chair-available'

          return (
            <button
              key={chair.label}
              type="button"
              className={cls}
              style={{
                width: chairSize,
                height: chairSize,
                left: `calc(50% + ${x}px - ${chairSize / 2}px)`,
                top: `calc(50% + ${y}px - ${chairSize / 2}px)`,
              }}
              disabled={chair.booked || blockedByLimit}
              onClick={() =>
                !chair.booked &&
                (chair.selected || canSelectMore) &&
                onToggleChair(chair.label)
              }
              title={
                chair.booked
                  ? `Seat ${chair.label} - Already Booked`
                  : blockedByLimit
                  ? `Seat ${chair.label} - Limit Reached`
                  : chair.selected
                  ? `Seat ${chair.label} - Click to Deselect`
                  : `Select Seat ${chair.label}`
              }
              aria-label={`Seat ${chair.label}`}
            >
              <span className="chair-num-label">{chair.label}</span>
              {chair.selected && <span className="chair-check">✓</span>}
            </button>
          )
        })}
      </div>
    </div>
  )
}

