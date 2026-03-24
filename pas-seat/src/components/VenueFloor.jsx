import TableBtn from './TableBtn'
import { LAYOUT } from '../utils/seatLayout'

export default function VenueFloor({ tables, allowedTypes, onTableClick }) {
  function TB(num, key) {
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
        {/* Side column LEFT */}
        <div className="side-col side-col--left">
          {LAYOUT.sideLeft.map((pair, i) => (
            <div key={i} className="side-pair">
              {pair.map((n, j) => TB(n, `sl-${i}-${j}`))}
            </div>
          ))}
        </div>

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

        {/* Side column RIGHT */}
        <div className="side-col side-col--right" style={{ marginTop: '30px' }}>
          {LAYOUT.sideRight.map((pair, i) => (
            <div key={i} className="side-pair">
              {pair.map((n, j) => TB(n, `sr-${i}-${j}`))}
            </div>
          ))}
        </div>
      </div>

      {/* Bottom row */}
      <div className="bottom-area">
        <div className="bottom-left">
          {LAYOUT.bottomLeft.map((n, i) => TB(n, `bl-${i}`))}
        </div>
        <div className="bottom-right">
          {LAYOUT.bottomRight.map((n, i) => TB(n, `br-${i}`))}
        </div>
      </div>
    </>
  )
}
