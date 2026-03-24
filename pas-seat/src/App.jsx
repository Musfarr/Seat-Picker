import { useState, useCallback, useEffect } from 'react'
import './App.css'
import NotFound from './NotFound'
import { generateLanyard } from './generateLanyard'
import { sendLanyardWhatsapp } from './api'

const CHAIR_LABELS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']

/* ─── VIP table numbers (shown in red in the image) ─── */
const VIP_TABLES = new Set([2, 4, 8, 10, 14, 16, 1, 3, 7, 9, 13, 15])

/* ─── Tables that are reserved/unavailable ─── */
const UNAVAILABLE_TABLES = new Set([])

/*
  applySeatsData — takes API response array:
  [{ seatNumber: "1-A", seatStatus: true/false }, ...]
  and returns updated tables map with booked chairs applied.
  A table becomes unavailable (disabled) when ALL 8 chairs are booked.
*/
function applySeatsData(tables, seatsData) {
  // Build a map: tableNum -> Set of booked chair labels
  const bookedMap = {}
  seatsData.forEach(({ seatNumber, seatStatus }) => {
    if (seatStatus) return  // still available, skip
    const [tableStr, chair] = seatNumber.split('-')
    const tableNum = parseInt(tableStr, 10)
    if (!bookedMap[tableNum]) bookedMap[tableNum] = new Set()
    bookedMap[tableNum].add(chair)
  })

  // Apply to tables
  const updated = {}
  Object.entries(tables).forEach(([key, table]) => {
    const bookedChairs = bookedMap[table.num] || new Set()
    const chairs = table.chairs.map(c => ({ ...c, booked: bookedMap[table.num]?.has(c.label) ?? false }))
    const allBooked = chairs.every(c => c.booked)
    updated[key] = { ...table, chairs, available: allBooked ? false : table.available }
  })
  return updated
}

function parseParams() {
  const p = new URLSearchParams(window.location.search)
  const type = p.get('type')
  const number = parseInt(p.get('number'), 10)
  const phone_number = p.get('phone_number')
  const name = p.get('name') || ''
  const email = p.get('email') || ''
  const cnic = p.get('cnic') || ''
  if (!type || !number || isNaN(number) || !phone_number) return null
  const allowedTypes = type === 'vip' ? ['vip'] : type === 'normal' ? ['normal'] : ['normal', 'vip']
  const seats_api_url = p.get('seats_api_url') || null
  return { type, allowedSeats: number, allowedTypes, phone_number, name, email, cnic, seats_api_url }
}

function makeTable(num) {
  const type = VIP_TABLES.has(num) ? 'vip' : 'normal'
  const chairs = CHAIR_LABELS.map(label => ({ label, booked: false, selected: false }))
  return { id: num, num, type, available: !UNAVAILABLE_TABLES.has(num), chairs }
}

/*
  Layout — null = Reserved (R) slot, disabled red, no number

  SIDE_LEFT  : pairs stacked [62,64] [66,68] [70,72] [74,76] [78,80]
  SIDE_RIGHT : pairs stacked [63,61] [65,67] [69,71] [73,75] [77,79]

  LEFT_BLOCK (rows read right→left, aisle on right side):
    row0: [6, 4, 2, null]                      — 3 normal + 1 R
    row1: [12,10, 8, null, null]               — 3 normal + 2 R
    row2: [18,16,14, null, null, null]         — 3 normal + 3 R
    row3: [32,30,28,26,24,22,20]               — 7 normal
    row4: [46,44,42,40,38,36,34]               — 7 normal
    row5: [60,58,56,54,52,50,48]               — 7 normal

  RIGHT_BLOCK (rows read left→right, aisle on left side):
    row0: [null, 1, 3, 5]                      — 1 R + 3 normal
    row1: [null, null, 7, 9,11]                — 2 R + 3 normal
    row2: [null, null, null,13,15,17]          — 3 R + 3 normal
    row3: [19,21,23,25,27,29,31]               — 7 normal
    row4: [33,35,37,39,41,43,45]               — 7 normal
    row5: [47,49,51,53,55,57,59]               — 7 normal

  BOTTOM_LEFT  : [82,83,84,85,86,87,88]
  BOTTOM_RIGHT : [81]
*/
const LAYOUT = {
  sideLeft:  [[62,64],[66,68],[70,72],[74,76],[78,80]],
  sideRight: [[63,61],[65,67],[69,71],[73,75],[77,79]],
  leftBlock: [
    [6, 4, 2, null],
    [12, 10, 8, null, null],
    [18, 16, 14, null, null, null],
    [32, 30, 28, 26, 24, 22, 20],
    [46, 44, 42, 40, 38, 36, 34],
    [60, 58, 56, 54, 52, 50, 48],
  ],
  rightBlock: [
    [null, 1, 3, 5],
    [null, null, 7, 9, 11],
    [null, null, null, 13, 15, 17],
    [19, 21, 23, 25, 27, 29, 31],
    [33, 35, 37, 39, 41, 43, 45],
    [47, 49, 51, 53, 55, 57, 59],
  ],
  bottomLeft:  [82, 83, 84, 85, 86, 87, 88],
  bottomRight: [81],
}

function buildAllTables() {
  const all = {}
  const allNums = [
    ...LAYOUT.sideLeft.flat(),
    ...LAYOUT.sideRight.flat(),
    ...LAYOUT.leftBlock.flat(),
    ...LAYOUT.rightBlock.flat(),
    ...LAYOUT.bottomLeft,
    ...LAYOUT.bottomRight,
  ].filter(n => n !== null)
  allNums.forEach(n => { all[n] = makeTable(n) })
  return all
}

const INIT = buildAllTables()

function getSelectedCount(table) {
  return table.chairs.filter(c => c.selected).length
}

function TableBtn({ table, onClick, dimmed = false }) {
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

function ChairCircle({ table, onToggleChair, canSelectMore }) {
  const radius = 100
  const chairSize = 38
  return (
    <div className="chair-circle-wrap">
      <div className="chair-circle-container" style={{ width: radius * 2 + chairSize + 20, height: radius * 2 + chairSize + 20 }}>
        <div className="chair-center-table">
          <span className="chair-center-label">{table.displayNum || table.num}</span>
          <span className="chair-center-type">{table.type.toUpperCase()}</span>
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

/* ─── Main App ───────────────────────────────────────────────── */
export default function App() {
  const paramData = parseParams()
  const [tables, setTables] = useState(INIT)
  const [seatsLoading, setSeatsLoading] = useState(false)
  const [modalTable, setModalTable] = useState(null)
  const [showConfirm, setShowConfirm] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [processStep, setProcessStep] = useState('')
  const [done, setDone] = useState(false)
  const [lanyardUrl, setLanyardUrl] = useState(null)

  // Fetch seat status from API and apply booked state to tables
  useEffect(() => {
    if (!paramData?.seats_api_url) return
    setSeatsLoading(true)
    fetch(paramData.seats_api_url)
      .then(r => r.json())
      .then(data => {
        const seatsArray = Array.isArray(data) ? data : data.seats
        if (seatsArray) setTables(prev => applySeatsData(prev, seatsArray))
      })
      .catch(err => console.error('Failed to load seat status:', err))
      .finally(() => setSeatsLoading(false))
  }, [])

  const t = (num) => tables[num]

  const openModal = useCallback((table) => setModalTable(table), [])
  const closeModal = useCallback(() => setModalTable(null), [])

  const toggleChair = useCallback((chairLabel) => {
    if (!modalTable) return
    setTables(prev => {
      const updated = { ...prev, [modalTable.id]: {
        ...prev[modalTable.id],
        chairs: prev[modalTable.id].chairs.map(c =>
          c.label === chairLabel ? { ...c, selected: !c.selected } : c
        )
      }}
      setModalTable(updated[modalTable.id])
      return updated
    })
  }, [modalTable])

  const allSelections = Object.values(tables).flatMap(table =>
    table.chairs
      .filter(c => c.selected)
      .map(c => ({ tableId: table.id, type: table.type, chair: c.label }))
  )

  const allowedSeats = paramData?.allowedSeats ?? 0
  const allowedTypes = paramData?.allowedTypes ?? []
  const totalSelected = allSelections.length
  const atLimit = totalSelected >= allowedSeats

  const canSelectMore = (table) => allowedTypes.includes(table.type) && !atLimit

  const handleTableClick = (table) => {
    if (!table.available || !allowedTypes.includes(table.type)) return
    openModal(table)
  }

  const clearAll = () => {
    setTables(prev => {
      const next = {}
      Object.entries(prev).forEach(([k, tbl]) => {
        next[k] = { ...tbl, chairs: tbl.chairs.map(c => ({ ...c, selected: false })) }
      })
      return next
    })
  }

  const confirmBooking = async () => {
    const seats = allSelections.map(s => `${s.tableId}-${s.chair}`)
    setShowConfirm(false)
    setProcessing(true)
    try {
      setProcessStep('Generating your pass...')
      const { dataUrl } = await generateLanyard({
        name: paramData.name,
        email: paramData.email,
        cnic: paramData.cnic,
        phone_number: paramData.phone_number,
        seats,
      })
      setLanyardUrl(dataUrl)
      setProcessStep('Sending via WhatsApp...')
      await sendLanyardWhatsapp(dataUrl, paramData.phone_number)
      const payload = {
        type: paramData.type,
        phone_number: paramData.phone_number,
        user: { name: paramData.name, email: paramData.email, cnic: paramData.cnic },
        totalSeats: allSelections.length,
        bookings: allSelections.map(s => ({
          table: s.tableId, chair: s.chair,
          seat: `${s.tableId}-${s.chair}`, type: s.type,
        }))
      }
      console.log('=== BOOKING PAYLOAD ===')
      console.log(JSON.stringify(payload, null, 2))
      setProcessStep('')
      setDone(true)
    } catch (err) {
      console.error('Booking error:', err)
      setProcessStep('Error: ' + (err?.response?.data?.message || err.message || 'Something went wrong'))
    } finally {
      setProcessing(false)
    }
  }

  if (!paramData) return <NotFound />

  const TB = (num, idx) => {
    if (num === null) return <div key={`r-${idx}`} className="reserved-slot"><span className="reserved-label">R</span></div>
    const tbl = t(num)
    if (!tbl) return null
    return (
      <TableBtn
        key={num} table={tbl}
        onClick={handleTableClick}
        dimmed={!allowedTypes.includes(tbl.type)}
      />
    )
  }

  return (
    <div className="app-bg">
      <div className="venue-card">

        <div className="venue-header">
          <div className="header-user-row">
            <div>
              <h1 className="venue-title">PAS AWARDS</h1>
              {paramData.name && (
                <p className="venue-sub">Hi <strong>{paramData.name}</strong> · Select up to <strong>{allowedSeats}</strong> chair{allowedSeats > 1 ? 's' : ''}</p>
              )}
            </div>
          </div>
          <span className={`counter-pill${atLimit ? ' counter-full' : ''}`}>
            {totalSelected} / {allowedSeats} selected
          </span>
        </div>

        <div className="stage-wrap">
          <div className="stage-bar"><span className="stage-text">&#9670; &nbsp; STAGE &nbsp; &#9670;</span></div>
        </div>

        {/* ── Main seating area ── */}
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
            {/* Left block */}
            <div className="block block--left">
              {LAYOUT.leftBlock.map((row, ri) => (
                <div key={ri} className="floor-row floor-row--left">
                  {row.map((n, ci) => TB(n, `lb-${ri}-${ci}`))}
                </div>
              ))}
            </div>

            {/* Aisle gap */}
            <div className="aisle" />

            {/* Right block */}
            <div className="block block--right">
              {LAYOUT.rightBlock.map((row, ri) => (
                <div key={ri} className="floor-row floor-row--right">
                  {row.map((n, ci) => TB(n, `rb-${ri}-${ci}`))}
                </div>
              ))}
            </div>
          </div>

          {/* Side column RIGHT */}
          <div className="side-col side-col--right " style={{marginTop:'30px'}}>
            {LAYOUT.sideRight.map((pair, i) => (
              <div key={i} className="side-pair">
                {pair.map((n, j) => TB(n, `sr-${i}-${j}`))}
              </div>
            ))}
          </div>
        </div>

        {/* ── Bottom row ── */}
        <div className="bottom-area">
          <div className="bottom-left">
            {LAYOUT.bottomLeft.map((n, i) => TB(n, `bl-${i}`))}
          </div>
          <div className="bottom-right">
            {LAYOUT.bottomRight.map((n, i) => TB(n, `br-${i}`))}
          </div>
        </div>

        <div className="legend">
          <LegendDot cls="inner-normal" label="Normal" />
          <LegendDot cls="inner-vip" label="VIP" />
          <LegendDot cls="inner-selected" label="Has Selection" />
          <LegendDot cls="inner-unavail" label="Unavailable" />
        </div>

        {totalSelected > 0 && (
          <div className="booking-bar">
            <div className="booking-bar-left">
              <span className="booking-count">{totalSelected} chair{totalSelected > 1 ? 's' : ''} selected</span>
              <button className="clear-btn" onClick={clearAll}>Clear All</button>
            </div>
            <button className="book-btn" onClick={() => setShowConfirm(true)}>Book Seats</button>
          </div>
        )}
      </div>

      {modalTable && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">
                Table {modalTable.num}
                <span className={`modal-type-tag modal-type-${modalTable.type}`}>{modalTable.type.toUpperCase()}</span>
              </h2>
              <button className="modal-close" onClick={closeModal}>&times;</button>
            </div>
            <p className="modal-hint">
              Select chairs · {totalSelected}/{allowedSeats} used
              {atLimit && <span className="modal-limit-warn"> · Limit reached</span>}
            </p>
            <ChairCircle
              table={modalTable}
              onToggleChair={toggleChair}
              canSelectMore={canSelectMore(modalTable)}
            />
            <div className="modal-legend">
              <span className="ml-item"><span className="ml-dot ml-available" />Available</span>
              <span className="ml-item"><span className="ml-dot ml-picked" />Selected</span>
              <span className="ml-item"><span className="ml-dot ml-taken" />Booked</span>
            </div>
            <button className="modal-done-btn" onClick={closeModal}>Done</button>
          </div>
        </div>
      )}

      {showConfirm && (
        <div className="modal-overlay" onClick={() => setShowConfirm(false)}>
          <div className="confirm-content" onClick={e => e.stopPropagation()}>
            <h2 className="confirm-title">Confirm Your Booking</h2>
            <div className="confirm-user-row">
              <div>
                <p className="confirm-user-name">{paramData.name}</p>
                <p className="confirm-user-email">{paramData.email}</p>
              </div>
            </div>
            <div className="confirm-list">
              {allSelections.map((s, i) => (
                <div key={i} className="confirm-row">
                  <span className={`confirm-tag confirm-tag-${s.type}`}>{s.type.toUpperCase()}</span>
                  <span className="confirm-seat">{s.tableId}-{s.chair}</span>
                </div>
              ))}
            </div>
            <div className="confirm-actions" style={{ marginTop: '1rem' }}>
              <button className="confirm-cancel" onClick={() => setShowConfirm(false)}>Cancel</button>
              <button className="confirm-ok" onClick={confirmBooking}>Confirm & Book</button>
            </div>
          </div>
        </div>
      )}

      {processing && (
        <div className="modal-overlay">
          <div className="spinner-card">
            <div className="spinner" />
            <p className="spinner-step">{processStep}</p>
          </div>
        </div>
      )}

      {!processing && processStep.startsWith('Error') && (
        <div className="modal-overlay" onClick={() => setProcessStep('')}>
          <div className="confirm-content" onClick={e => e.stopPropagation()}>
            <h2 className="confirm-title" style={{ color: '#fca5a5' }}>Something went wrong</h2>
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.85rem', margin: '0.75rem 0 1.25rem' }}>{processStep.replace('Error: ', '')}</p>
            <button className="confirm-ok" style={{ width: '100%' }} onClick={() => setProcessStep('')}>Dismiss</button>
          </div>
        </div>
      )}

      {done && (
        <div className="modal-overlay">
          <div className="done-card">
            <div className="done-check">✓</div>
            <h2 className="done-title">Booking Confirmed!</h2>
            <p className="done-sub">Your pass has been sent via WhatsApp to<br /><strong>{paramData.phone_number}</strong></p>
            {lanyardUrl && (
              <div className="done-lanyard-wrap">
                <img src={lanyardUrl} alt="Your Pass" className="done-lanyard-img" />
                <a href={lanyardUrl} download="pas-pass.png" className="done-download-btn">Download Pass</a>
              </div>
            )}
          </div>
        </div>
      )}
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
