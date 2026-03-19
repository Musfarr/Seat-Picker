import { useState, useMemo, useCallback, useRef } from 'react'
import './App.css'
import NotFound from './NotFound'
import { generateLanyard } from './generateLanyard'
import { sendLanyardWhatsapp } from './api'

const CHAIR_LABELS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']

const UNAVAILABLE_NORMAL = new Set([3, 11, 19, 28, 35, 42, 57, 63])
const UNAVAILABLE_VIP = new Set([2, 7])

const UNAVAILABLE_CHAIRS = {
  'N5': ['C', 'D'],
  'N22': ['A'],
  'V3': ['E', 'F'],
}

function parseParams() {
  const p = new URLSearchParams(window.location.search)
  const type = p.get('type')
  const number = parseInt(p.get('number'), 10)
  const phone_number = p.get('phone_number')
  if (!type || !number || isNaN(number) || !phone_number) return null
  const allowedTypes = type === 'vip' ? ['vip'] : type === 'normal' ? ['normal'] : ['normal', 'vip']
  return { type, allowedSeats: number, allowedTypes, phone_number }
}

function buildTables() {
  const normal = []
  for (let r = 0; r < 7; r++) {
    for (let c = 0; c < 10; c++) {
      const n = r * 10 + c + 1
      const chairs = CHAIR_LABELS.map(label => ({
        label,
        booked: (UNAVAILABLE_CHAIRS[`N${n}`] || []).includes(label),
        selected: false,
      }))
      normal.push({
        id: `N${n}`, num: n, type: 'normal', row: r, col: c,
        available: !UNAVAILABLE_NORMAL.has(n), chairs,
      })
    }
  }
  const vip = []
  for (let r = 0; r < 5; r++) {
    for (let c = 0; c < 2; c++) {
      const n = r * 2 + c + 1
      const chairs = CHAIR_LABELS.map(label => ({
        label,
        booked: (UNAVAILABLE_CHAIRS[`V${n}`] || []).includes(label),
        selected: false,
      }))
      vip.push({
        id: `V${n}`, num: n, displayNum: `V${n}`, type: 'vip', row: r, col: c,
        available: !UNAVAILABLE_VIP.has(n), chairs,
      })
    }
  }
  return { normal, vip }
}

const INIT = buildTables()

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

/* ─── User Info Form ─────────────────────────────────────────── */
function UserForm({ onSubmit, phone_number }) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [cnic, setCnic] = useState('')
  const [image, setImage] = useState(null)
  const [preview, setPreview] = useState(null)
  const [errors, setErrors] = useState({})
  const fileRef = useRef()

  const handleImage = (e) => {
    const file = e.target.files[0]
    if (!file) return
    setImage(file)
    setPreview(URL.createObjectURL(file))
  }

  const validate = () => {
    const e = {}
    if (!name.trim()) e.name = 'Name is required'
    if (!email.trim() || !/\S+@\S+\.\S+/.test(email)) e.email = 'Valid email is required'
    if (!cnic.trim()) e.cnic = 'CNIC is required'
    if (!image) e.image = 'Profile image is required'
    return e
  }

  const handleSubmit = (ev) => {
    ev.preventDefault()
    const e = validate()
    if (Object.keys(e).length) { setErrors(e); return }
    onSubmit({ name: name.trim(), email: email.trim(), cnic: cnic.trim(), image })
  }

  return (
    <div className="app-bg">
      <div className="form-card">
        <h1 className="venue-title" style={{ textAlign: 'center', marginBottom: '0.3rem' }}>PAS</h1>
        <p className="venue-sub" style={{ textAlign: 'center', marginBottom: '2rem' }}>Please fill in your details to continue</p>

        <form onSubmit={handleSubmit} noValidate>
          <div className="form-avatar-row">
            <div className="form-avatar" onClick={() => fileRef.current.click()}>
              {preview
                ? <img src={preview} alt="preview" className="form-avatar-img" />
                : <span className="form-avatar-placeholder">&#43;<br /><span>Photo</span></span>
              }
            </div>
            <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleImage} />
            {errors.image && <p className="form-error">{errors.image}</p>}
          </div>

          <div className="form-field">
            <label className="form-label">Full Name</label>
            <input
              className={`form-input${errors.name ? ' form-input--err' : ''}`}
              type="text" placeholder="John Doe"
              value={name} onChange={e => setName(e.target.value)}
            />
            {errors.name && <p className="form-error">{errors.name}</p>}
          </div>

          <div className="form-field">
            <label className="form-label">Email Address</label>
            <input
              className={`form-input${errors.email ? ' form-input--err' : ''}`}
              type="email" placeholder="john@example.com"
              value={email} onChange={e => setEmail(e.target.value)}
            />
            {errors.email && <p className="form-error">{errors.email}</p>}
          </div>

          <div className="form-field">
            <label className="form-label">CNIC</label>
            <input
              className={`form-input${errors.cnic ? ' form-input--err' : ''}`}
              type="text" placeholder="12345-1234567-8"
              value={cnic} onChange={e => setCnic(e.target.value)}
            />
            {errors.cnic && <p className="form-error">{errors.cnic}</p>}
          </div>
          <div className="form-field">
            <label className="form-label">Phone Number</label>
            <input
              className="form-input"
              type="text" value={phone_number || ''} disabled placeholder="0300-1234567"
            />
          </div>

          <button type="submit" className="book-btn" style={{ width: '100%', marginTop: '1.25rem' }}>
            Continue to Seat Selection
          </button>
        </form>
      </div>
    </div>
  )
}

/* ─── Main App ───────────────────────────────────────────────── */
export default function App() {
  const paramData = parseParams()
  const [userData, setUserData] = useState(null)
  const [normal, setNormal] = useState(INIT.normal)
  const [vip, setVip] = useState(INIT.vip)
  const [modalTable, setModalTable] = useState(null)
  const [showConfirm, setShowConfirm] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [processStep, setProcessStep] = useState('')
  const [done, setDone] = useState(false)
  const [lanyardUrl, setLanyardUrl] = useState(null)

  const openModal = useCallback((table) => {
    setModalTable(table)
  }, [])

  const closeModal = useCallback(() => {
    setModalTable(null)
  }, [])

  const toggleChair = useCallback((chairLabel) => {
    if (!modalTable) return
    const setter = modalTable.type === 'vip' ? setVip : setNormal
    setter(prev => {
      const updated = prev.map(t => {
        if (t.id !== modalTable.id) return t
        return { ...t, chairs: t.chairs.map(c => c.label === chairLabel ? { ...c, selected: !c.selected } : c) }
      })
      setModalTable(updated.find(t => t.id === modalTable.id))
      return updated
    })
  }, [modalTable])

  const allSelections = useMemo(() => {
    const sel = []
    ;[...normal, ...vip].forEach(table => {
      table.chairs.forEach(c => {
        if (c.selected) sel.push({ tableId: table.id, tableNum: table.displayNum || table.num, type: table.type, chair: c.label })
      })
    })
    return sel
  }, [normal, vip])

  const allowedSeats = paramData?.allowedSeats ?? 0
  const allowedTypes = paramData?.allowedTypes ?? []
  const totalSelected = allSelections.length
  const atLimit = totalSelected >= allowedSeats


  console.log(paramData , "ParamData")

  const canSelectMore = (table) => {
    if (!allowedTypes.includes(table.type)) return false
    if (atLimit) return false
    return true
  }

  const handleTableClick = (table) => {
    if (!allowedTypes.includes(table.type)) return
    openModal(table)
  }

  const clearAll = () => {
    setNormal(p => p.map(t => ({ ...t, chairs: t.chairs.map(c => ({ ...c, selected: false })) })))
    setVip(p => p.map(t => ({ ...t, chairs: t.chairs.map(c => ({ ...c, selected: false })) })))
  }

  const confirmBooking = async () => {
    const seats = allSelections.map(s => `${s.tableId}-${s.chair}`)
    setShowConfirm(false)
    setProcessing(true)

    try {
      setProcessStep('Generating your pass...')
      const { dataUrl, blob } = await generateLanyard({
        name: userData.name,
        email: userData.email,
        cnic: userData.cnic,
        phone_number: paramData.phone_number,
        seats,
        imageFile: userData.image,
      })
      setLanyardUrl(dataUrl)

      setProcessStep('Sending via WhatsApp...')
      await sendLanyardWhatsapp(dataUrl, paramData.phone_number)

      const payload = {
        type: paramData?.type,
        phone_number: paramData?.phone_number,
        user: { name: userData.name, email: userData.email, cnic: userData.cnic },
        totalSeats: allSelections.length,
        bookings: allSelections.map(s => ({
          table: s.tableId,
          chair: s.chair,
          seat: `${s.tableId}-${s.chair}`,
          type: s.type,
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

  if (!paramData) return <NotFound />
  if (!userData) return <UserForm onSubmit={setUserData} phone_number={paramData.phone_number} />

  const showVip = allowedTypes.includes('vip')
  const showNormal = allowedTypes.includes('normal')

  return (
    <div className="app-bg">
      <div className="venue-card">

        <div className="venue-header">
            {userData.image && <img src={URL.createObjectURL(userData.image)} className="header-avatar" alt="avatar" />}
          <div className="header-user-row">
            <div>
              <h1 className="venue-title">PAS AWARDS</h1>
              <p className="venue-sub">Hi {userData.name} · Select up to <strong>{allowedSeats}</strong> chair{allowedSeats > 1 ? 's' : ''}</p>
            </div>
          </div>
          <div className="seat-counter">
            {/* <span className={`counter-pill${atLimit ? ' counter-full' : ''}`}>
              {totalSelected} / {allowedSeats} selected
            </span> */}
          </div>
        </div>

        <div className="stage-wrap">
          <div className="stage-bar"><span className="stage-text">&#9670; &nbsp; STAGE &nbsp; &#9670;</span></div>
        </div>

        {showVip && (
          <div className="vip-section" style={{ marginBottom: '20px' }}>
            <div className="vip-badge">V I P</div>
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              {vipRows.map((row, ri) => (
                <div key={ri}>
                  {row.map(t => (
                    <TableBtn
                      key={t.id} table={t}
                      onClick={handleTableClick}
                      dimmed={!allowedTypes.includes(t.type)}
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>
        )}

        {showNormal && (
          <div className="seat-area">
            <div className="normal-section">
              {normalRows.map((row, ri) => (
                <div key={ri} className="seat-row">
                  <span className="row-lbl">{rowLetters[ri]}</span>
                  {row.map(t => (
                    <TableBtn
                      key={t.id} table={t}
                      onClick={handleTableClick}
                      dimmed={!allowedTypes.includes(t.type)}
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="legend">
          {showNormal && <LegendDot cls="inner-normal" label="Normal" />}
          {showVip && <LegendDot cls="inner-vip" label="VIP" />}
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
                Table {modalTable.displayNum || modalTable.num}
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
              {userData.image && <img src={URL.createObjectURL(userData.image)} className="confirm-avatar" alt="avatar" />}
              <div>
                <p className="confirm-user-name">{userData.name}</p>
                <p className="confirm-user-email">{userData.email}</p>
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
