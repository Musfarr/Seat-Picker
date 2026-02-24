import { useState, useMemo } from 'react'
import './App.css'

const UNAVAILABLE_NORMAL = new Set([3, 11, 19, 28, 35, 42, 57, 63])
const UNAVAILABLE_VIP = new Set([2, 7])

function buildSeats() {
  const normal = []
  for (let r = 0; r < 7; r++) {
    for (let c = 0; c < 10; c++) {
      const n = r * 10 + c + 1
      normal.push({ id: `N${n}`, num: n, type: 'normal', row: r, col: c, available: !UNAVAILABLE_NORMAL.has(n), selected: false })
    }
  }
  const vip = []
  for (let r = 0; r < 7; r++) {
    for (let c = 0; c < 2; c++) {
      const n = r * 2 + c + 1
      vip.push({ id: `V${n}`, num: `V${n}`, type: 'vip', row: r, col: c, available: !UNAVAILABLE_VIP.has(n), selected: false })
    }
  }
  return { normal, vip }
}

const INIT = buildSeats()

function SeatBtn({ seat, onToggle }) {
  const { available, selected, type, num } = seat
  let ring = 'seat-ring'
  let inner = 'seat-inner'
  if (!available) { ring += ' ring-unavail'; inner += ' inner-unavail' }
  else if (selected) { ring += ` ring-selected`; inner += ` inner-selected` }
  else { ring += ` ring-${type}`; inner += ` inner-${type}` }

  return (
    <button
      className={`seat-btn${!available ? ' seat-btn--off' : ''}`}
      onClick={() => available && onToggle(seat.id, seat.type)}
      title={available ? `${type.toUpperCase()} – Seat ${num}` : 'Unavailable'}
    >
      <div className={ring}>
        <div className={inner}>
          <span className="seat-label">{num}</span>
        </div>
      </div>
    </button>
  )
}

export default function App() {
  const [normal, setNormal] = useState(INIT.normal)
  const [vip, setVip] = useState(INIT.vip)

  const toggle = (id, type) => {
    if (type === 'vip') setVip(p => p.map(s => s.id === id ? { ...s, selected: !s.selected } : s))
    else setNormal(p => p.map(s => s.id === id ? { ...s, selected: !s.selected } : s))
  }

  const clearAll = () => {
    setNormal(p => p.map(s => ({ ...s, selected: false })))
    setVip(p => p.map(s => ({ ...s, selected: false })))
  }

  const payload = useMemo(() => {
    const sel = [...normal, ...vip].filter(s => s.selected)
    return {
      totalSelected: sel.length,
      seats: sel.map(s => ({ id: s.id, seatNumber: s.num, type: s.type }))
    }
  }, [normal, vip])

  const normalRows = useMemo(() => {
    const m = {}
    normal.forEach(s => { if (!m[s.row]) m[s.row] = []; m[s.row].push(s) })
    return Object.values(m)
  }, [normal])

  const vipRows = useMemo(() => {
    const m = {}
    vip.forEach(s => { if (!m[s.row]) m[s.row] = []; m[s.row].push(s) })
    return Object.values(m)
  }, [vip])

  const rowLetters = 'ABCDEFG'

  return (
    <div className="app-bg">
      <div className="venue-card">

        <div className="venue-header">
            <h1 className="venue-title">PAS</h1>
            {/* <h1 className="venue-title">Seat Selection</h1> */}
          <p className="venue-sub">Tap a seat to select · tap again to deselect</p>
        </div>

        <div className="stage-wrap">
          <div className="stage-bar"><span className="stage-text">◆ &nbsp; STAGE &nbsp; ◆</span></div>
        </div>

        <div className="seat-area">
          <div className="normal-section">
            {normalRows.map((row, ri) => (
              <div key={ri} className="seat-row">
                <span className="row-lbl">{rowLetters[ri]}</span>
                {row.map(s => <SeatBtn key={s.id} seat={s} onToggle={toggle} />)}
              </div>
            ))}
          </div>

          <div className="vip-divider" />

          <div className="vip-section">
            <div className="vip-badge">V I P</div>
            {vipRows.map((row, ri) => (
              <div key={ri} className="seat-row seat-row--center">
                {row.map(s => <SeatBtn key={s.id} seat={s} onToggle={toggle} />)}
              </div>
            ))}
          </div>
        </div>

        <div className="legend">
          <LegendDot cls="inner-normal" label="Normal" />
          <LegendDot cls="inner-vip" label="VIP" />
          <LegendDot cls="inner-selected" label="Selected" />
          <LegendDot cls="inner-unavail" label="Unavailable" />
        </div>

        {/* {payload.totalSelected > 0 && (
          <div className="payload-box">
            <div className="payload-top">
              <span className="payload-count">{payload.totalSelected} seat{payload.totalSelected > 1 ? 's' : ''} selected</span>
              <button className="clear-btn" onClick={clearAll}>Clear All</button>
            </div>
            <pre className="payload-pre">{JSON.stringify(payload, null, 2)}</pre>
          </div>
        )} */}

      </div>
    </div>
  )
}

function LegendDot({ cls, label }) {
  return (
    <div className="legend-item">
      <div className={`seat-inner ${cls}`} style={{ width: 26, height: 26, borderRadius: '50%', fontSize: '0' }} />
      <span>{label}</span>
    </div>
  )
}
