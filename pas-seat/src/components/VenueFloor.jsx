import TableBtn from './TableBtn'
import { LAYOUT } from '../utils/seatLayout'

export default function VenueFloor({ tables, allowedTypes, onTableClick }) {
  function TB(num, key) {
    if (num === 0) return <div key={key} className="empty-slot" />
    if (num === null) {
      return (
        <div key={key} className="reserved-slot" title="Reserved Table">
          <span className="reserved-label">R</span>
        </div>
      )
    }
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
    <div className="ballroom-container">
      {/* Perimeter Wall Lighting Sconces (Top) */}
      <div className="wall-sconces-track wall-sconces--top">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={`sconce-top-${i}`} className="sconce-fixture" />
        ))}
      </div>

      {/* Atmospheric Spotlight Glow Layers */}
      <div className="spotlight-pool spotlight-pool--stage" />
      <div className="spotlight-pool spotlight-pool--left-top" />
      <div className="spotlight-pool spotlight-pool--left-mid" />
      <div className="spotlight-pool spotlight-pool--right-top" />
      <div className="spotlight-pool spotlight-pool--right-mid" />
      <div className="spotlight-pool spotlight-pool--bottom" />

      {/* ── Prominent Elevated Stage (Integrated inside Red Carpet) ── */}
      <div className="stage-wrap-carpet">
        <div className="stage-grand">
          {/* Left Wing Stairs leading to Red Carpet */}
          <div className="stage-stairs-wing stage-stairs--left">
            <span className="stair-step" />
            <span className="stair-step" />
            <span className="stair-step" />
            <span className="stair-step" />
          </div>

          {/* Main Stage Elevated Platform */}
          <div className="stage-platform-prominent">
            {/* Stage Overhead Beam Glow */}
            <div className="stage-light-glow" />

            {/* Front Footlights / Uplight Bulbs */}
            {/* <div className="stage-footlights-row">
              {Array.from({ length: 18 }).map((_, i) => (
                <span key={`stage-bulb-${i}`} className="stage-footlight-dot" />
              ))}
            </div> */}

            {/* Stage Sponsors & Main Logo */}
            <div className="stage-sponsors">
              <div className="sponsor-logo sponsor-logo--pepsi">
                <img src="kashmir.png" alt="Pepsi" style={{ marginLeft: "-150px" }} className="sponsor-img-pepsi" />
                <span className="sponsor-text">PRESENTS</span>
              </div>
              <div className="sponsor-logo sponsor-logo-main" style={{ marginRight: "30px" }}>
                <img src="drag.png" alt="Awards Gala" />
              </div>
              <div className="sponsor-logo sponsor-logo--assoc">
                <span className="sponsor-text">Powered by</span>
                <img src="nfllogo.png" alt="Unilever" className="sponsor-img-unilever" style={{ marginRight: "-70px" }} />
              </div>
            </div>

            {/* Curved Golden Stage Lip */}
            <div className="stage-apron-lip">
              <img src="adstreet1.png" alt="adstreet1" width={"150px"} />
            </div>
          </div>

          {/* Right Wing Stairs leading to Red Carpet */}
          <div className="stage-stairs-wing stage-stairs--right">
            <span className="stair-step" />
            <span className="stair-step" />
            <span className="stair-step" />
            <span className="stair-step" />
          </div>
        </div>
      </div>

      {/* Main Floor Seating Area (Two Balanced Blocks of 28 Tables) */}
      <div className="venue-floor-inner">
        <div className="centre-area">
          {/* Left Block (Zone A: 28 Tables, 7 Rows x 4 Cols) */}
          <div className="block block--left">
            <div className="block-label">
              <span>ZONE A (LEFT WING · 28 TABLES)</span>
            </div>
            {LAYOUT.leftBlock.map((row, ri) => (
              <div key={`lb-row-${ri}`} className="floor-row floor-row--left">
                {row.map((n, ci) => TB(n, `lb-${ri}-${ci}`))}
              </div>
            ))}
          </div>

          {/* Central Red Carpet Aisle */}
          <div className="aisle">
            <div className="aisle-carpet-stripe" />
            <div className="aisle-marker">AISLE</div>
            {/* Media Pod in central walkway */}
            <div className="aisle-marker">WALKWAY</div>
            <div className="aisle-carpet-stripe" />
            <div className="media-cell-pod">
              <div className="media-cell-screen">
                <span className="media-cell-dot" />
                <span>MEDIA & PRODUCTION CELL</span>
              </div>
            </div>
            <div className="aisle-carpet-stripe" />
          </div>

          {/* Right Block (Zone B: 28 Tables, 7 Rows x 4 Cols) */}
          <div className="block block--right">
            <div className="block-label">
              <span>ZONE B (RIGHT WING · 28 TABLES)</span>
            </div>
            {LAYOUT.rightBlock.map((row, ri) => (
              <div key={`rb-row-${ri}`} className="floor-row floor-row--right">
                {row.map((n, ci) => TB(n, `rb-${ri}-${ci}`))}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Perimeter Wall Lighting Sconces (Bottom) */}
      <div className="wall-sconces-track wall-sconces--bottom ">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={`sconce-bot-${i}`} className="sconce-fixture " />
        ))}
      </div>

      {/* Powered by Convex */}
      <div className="powered-by">
        <a href="https://convexinteractive.com" target="_blank" rel="noopener noreferrer">
          Powered by Convex Interactive
        </a>
      </div>
    </div>
  )
}


