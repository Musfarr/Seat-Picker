import TableBtn from './TableBtn'
import { LAYOUT } from '../utils/seatLayout'

export default function VenueFloor({ tables, allowedTypes, onTableClick }) {
  function TB(num, key) {
    if (num === 0) return <div key={key} className="empty-slot" />
    if (num === null) return <div key={key} className="reserved-slot"><span className="reserved-label">R</span></div>
    const tbl = tables[num]
    if (!tbl) return null
    return (
      <TableBtn
        key={num}
        table={tbl}
        onClick={onTableClick}
        dimmed={!allowedTypes.includes(tbl.type)}
      />
    )
  }

  return (
    <>
      <div className="venue-floor">
        {/* Centre: left block + aisle + right block */}
        <div className="centre-area">
          <div className="block block--left">
            {LAYOUT.leftBlock.map((row, ri) => (
              <div key={ri} className="floor-row floor-row--left">
                {row.map((n, ci) => TB(n, `lb-${ri}-${ci}`))}
              </div>
            ))}
          </div>

          <div className="aisle" />

          <div className="block block--right">
            {LAYOUT.rightBlock.map((row, ri) => (
              <div key={ri} className="floor-row floor-row--right">
                {row.map((n, ci) => TB(n, `rb-${ri}-${ci}`))}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom row */}
      <div className="bottom-area">
        <div className="bottom-left">
          <div className="block">
            {LAYOUT.bottomLeft.map((row, ri) => (
              <div key={ri} className="floor-row" style={{justifyContent:'end'}}>
                {row.map((n, ci) => TB(n, `bl-${ri}-${ci}`))}
              </div>
            ))}
          </div>
        </div>
        <div className="bottom-right">
          <div className="block">
            {LAYOUT.bottomRight.map((row, ri) => (
              <div key={ri} className="floor-row">
                {row.map((n, ci) => TB(n, `br-${ri}-${ci}`))}
              </div>
            ))}
          </div>
        </div>
      </div>
        <div className="powered-by">
        <a href="https://convexinteractive.com" target="_blank" rel="noopener noreferrer">
          Powered by Convex Interactive
        </a>
      </div>
    </>
  )
}
