import { useState } from 'react'
import QRCode from 'qrcode'
import { bookSeats, bookCorporate, uploadFile, sendLinkWhatsapp, sendReservedEmail } from '../api'
import { generateLanyard } from '../generateLanyard'

const FULL_TABLE_SEATS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']

const RESERVED_SEATS_BY_TABLE = {
  1: FULL_TABLE_SEATS,
  3: FULL_TABLE_SEATS,
  7: FULL_TABLE_SEATS,
  8: FULL_TABLE_SEATS,
  9: FULL_TABLE_SEATS,
  12: ['A', 'B', 'C'],
  14: FULL_TABLE_SEATS,
  15: FULL_TABLE_SEATS,
  16: FULL_TABLE_SEATS,
  19: ['B', 'C'],
  20: FULL_TABLE_SEATS,
  21: ['A', 'B', 'G', 'H'],
  22: FULL_TABLE_SEATS,
  23: FULL_TABLE_SEATS,
  24: FULL_TABLE_SEATS,
  25: FULL_TABLE_SEATS,
  28: FULL_TABLE_SEATS,
  29: FULL_TABLE_SEATS,
  30: FULL_TABLE_SEATS,
  31: FULL_TABLE_SEATS,
  46: FULL_TABLE_SEATS,
  47: FULL_TABLE_SEATS,
  48: FULL_TABLE_SEATS,
  52: FULL_TABLE_SEATS,
  53: FULL_TABLE_SEATS,
  57: ['A', 'B', 'C', 'D', 'G', 'H'],
  58: FULL_TABLE_SEATS,
  59: FULL_TABLE_SEATS,
  60: FULL_TABLE_SEATS,
  66: FULL_TABLE_SEATS,
  67: FULL_TABLE_SEATS,
  68: FULL_TABLE_SEATS,
  69: FULL_TABLE_SEATS,
  70: FULL_TABLE_SEATS,
  73: FULL_TABLE_SEATS,
  74: FULL_TABLE_SEATS,
  R1: FULL_TABLE_SEATS,
  R2: FULL_TABLE_SEATS,
  R3: FULL_TABLE_SEATS,
  R4: FULL_TABLE_SEATS,
  R5: FULL_TABLE_SEATS,
  R6: FULL_TABLE_SEATS,
  R7: FULL_TABLE_SEATS,
  R8: FULL_TABLE_SEATS,
  R9: FULL_TABLE_SEATS,
  R10: FULL_TABLE_SEATS,
  R11: FULL_TABLE_SEATS,
  R12: FULL_TABLE_SEATS,
  R13: FULL_TABLE_SEATS,
  R14: FULL_TABLE_SEATS,
}
const RESERVED_TABLES = Object.keys(RESERVED_SEATS_BY_TABLE)
const PAS_LOGO_URL = `${window.location.origin}/test.jpeg`

const INPUT_STYLE = {
  background: '#0f1829',
  border: '1px solid #1e293b',
  borderRadius: 8,
  color: '#fff',
  padding: '10px 14px',
  fontSize: '0.9rem',
  outline: 'none',
  width: '100%',
  boxSizing: 'border-box',
}

const LABEL_STYLE = {
  color: 'rgba(255,255,255,0.55)',
  fontSize: '0.75rem',
  letterSpacing: '0.04em',
  display: 'block',
  marginBottom: 4,
}

function FormField({ label, value, onChange, type = 'text', required, placeholder, error }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      <label style={LABEL_STYLE}>
        {label.toUpperCase()}{required && <span style={{ color: '#fca5a5', marginLeft: 2 }}>*</span>}
      </label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder || label}
        style={{ ...INPUT_STYLE, border: error ? '1px solid #fca5a5' : INPUT_STYLE.border }}
      />
      {error && <span style={{ color: '#fca5a5', fontSize: '0.75rem', marginTop: 4 }}>{error}</span>}
    </div>
  )
}

function SeatPicker({ tableVal, chairVal, onTableChange, onChairChange, label, tableError, chairError }) {
  return (
    <div>
      {label && (
        <p style={{ ...LABEL_STYLE, marginBottom: 8 }}>{label.toUpperCase()}</p>
      )}
      <div style={{ display: 'flex', gap: 8 }}>
        <div style={{ flex: 1 }}>
          <label style={LABEL_STYLE}>TABLE <span style={{ color: '#fca5a5' }}>*</span></label>
          <select
            value={tableVal}
            onChange={e => onTableChange(e.target.value)}
            style={{
              ...INPUT_STYLE,
              cursor: 'pointer',
              border: tableError ? '1px solid #fca5a5' : INPUT_STYLE.border,
            }}
          >
            <option value="" disabled style={{ background: '#0f1829' }}>Select</option>
            {RESERVED_TABLES.map(t => (
              <option key={t} value={t} style={{ background: '#0f1829' }}>{t}</option>
            ))}
          </select>
          {tableError && <span style={{ color: '#fca5a5', fontSize: '0.75rem', marginTop: 4, display: 'block' }}>{tableError}</span>}
        </div>
        <div style={{ flex: 1 }}>
          <label style={LABEL_STYLE}>CHAIR <span style={{ color: '#fca5a5' }}>*</span></label>
          <select
            value={chairVal}
            onChange={e => onChairChange(e.target.value)}
            disabled={!tableVal}
            style={{
              ...INPUT_STYLE,
              cursor: tableVal ? 'pointer' : 'not-allowed',
              opacity: tableVal ? 1 : 0.45,
              border: chairError ? '1px solid #fca5a5' : INPUT_STYLE.border,
            }}
          >
            <option value="" disabled style={{ background: '#0f1829' }}>Select</option>
            {(tableVal ? RESERVED_SEATS_BY_TABLE[tableVal] || [] : []).map(c => (
              <option key={c} value={c} style={{ background: '#0f1829' }}>{c}</option>
            ))}
          </select>
          {chairError && <span style={{ color: '#fca5a5', fontSize: '0.75rem', marginTop: 4, display: 'block' }}>{chairError}</span>}
        </div>
      </div>
    </div>
  )
}

export default function ReservedBooking() {
  const [flow, setFlow] = useState(null)

  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [cnic, setCnic] = useState('')
  const [companyName, setCompanyName] = useState('')

  const [indTable, setIndTable] = useState('')
  const [indChair, setIndChair] = useState('')

  const [corpSeats, setCorpSeats] = useState([{ table: '', chair: '' }])

  const [processing, setProcessing] = useState(false)
  const [step, setStep] = useState('')
  const [done, setDone] = useState(false)
  const [doneMsg, setDoneMsg] = useState('')
  const [lanyardUrl, setLanyardUrl] = useState(null)
  const [emailError, setEmailError] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})

  const addCorpSeat = () => setCorpSeats(prev => [...prev, { table: '', chair: '' }])
  const removeCorpSeat = idx => setCorpSeats(prev => prev.filter((_, i) => i !== idx))
  const updateCorpSeat = (idx, field, val) =>
    setCorpSeats(prev => prev.map((s, i) =>
      i === idx ? { ...s, [field]: val, ...(field === 'table' ? { chair: '' } : {}) } : s
    ))

  const handleIndividualSubmit = async () => {
    const errs = {}
    if (!fullName.trim()) errs.fullName = 'Required'
    if (!email.trim()) errs.email = 'Required'
    // if (!phone.trim()) errs.phone = 'Required'
    if (!indTable) errs.indTable = 'Select table'
    if (!indChair) errs.indChair = 'Select chair'
    setFieldErrors(errs)
    if (Object.keys(errs).length) return

    setProcessing(true)
    const seatNumber = `${indTable}-${indChair}`
    try {
      setStep('Reserving your seat...')
      const { booking } = await bookSeats({
        seatNumber,
        phone: phone.trim(),
        companyName: companyName.trim() || undefined,
        cnic: cnic.trim(),
        type: 'Individual',
        name: fullName.trim(),
        image: PAS_LOGO_URL,
      })

      const profileUrl = `https://effie.convexinteractive.com/Profile/${booking}`
      const qrDataUrl = await QRCode.toDataURL(profileUrl, { width: 512, margin: 2 })
      const qrBlob = await (await fetch(qrDataUrl)).blob()
      const { url: lanyardQrUrl } = await uploadFile(qrBlob, `lanyard-qr-${booking}.png`)

      setStep('Generating your pass...')
      const { blob } = await generateLanyard({
        name: fullName.trim(),
        cnic: cnic.trim(),
        seatNumber,
        imageUrl: PAS_LOGO_URL,
        companyName: companyName.trim() || undefined,
        lanyardQrUrl,
      })

      setStep('Uploading pass...')
      const { url: uploadedUrl } = await uploadFile(blob, `reserved-lanyard-${phone.trim()}.png`)
      setLanyardUrl(uploadedUrl)

      setStep('Sending pass via Email...')
      try {
        await sendReservedEmail({
          toEmail: email.trim(),
          name: fullName.trim(),
          seatNumber,
          lanyardUrl: uploadedUrl,
        })
        setDoneMsg(`Pass sent to ${email.trim()}`)
      } catch (emailErr) {
        console.error('Email send failed:', emailErr)
        setEmailError('Email delivery failed. Download the pass below to send manually.')
        setDoneMsg(`Seat ${seatNumber} reserved for ${fullName.trim()}`)
      }

      setDone(true)
    } catch (err) {
      setStep('Error: ' + (err?.response?.data?.message || err.message || 'Something went wrong'))
    } finally {
      setProcessing(false)
    }
  }

  const handleCorporateSubmit = async () => {
    const errs = {}
    if (!fullName.trim()) errs.fullName = 'Required'
    if (!phone.trim()) errs.phone = 'Required'
    if (!companyName.trim()) errs.companyName = 'Required'
    corpSeats.forEach((s, i) => {
      if (!s.table) errs[`seat_table_${i}`] = 'Select table'
      if (!s.chair) errs[`seat_chair_${i}`] = 'Select chair'
    })
    setFieldErrors(errs)
    if (Object.keys(errs).length) return

    setProcessing(true)
    try {
      const bookings = corpSeats.map(s => ({
        seatNumber: `${s.table}-${s.chair}`,
        seatStatus: true,
      }))

      setStep('Reserving seats...')
      const { key } = await bookCorporate({
        bookings,
        phone_number: phone.trim(),
        Company_Name: companyName.trim(),
        Full_Name: fullName.trim(),
        Email_Address: email.trim() || undefined,
        Designation: designation.trim() || undefined,
      })

      const formLink = `https://effie.convexinteractive.com/form/${key}`

      setStep('Generating QR code...')
      const qrDataUrl = await QRCode.toDataURL(formLink, { width: 512, margin: 5 })
      const qrBlob = await (await fetch(qrDataUrl)).blob()
      const { url: qrUrl } = await uploadFile(qrBlob, `qr-${key}.png`)

      setStep('Sending form link via WhatsApp...')
      await sendLinkWhatsapp({ contactNumber: phone.trim(), link: formLink, qrImageUrl: qrUrl })

      setDoneMsg(`Form link sent to ${phone.trim()} via WhatsApp`)
      setDone(true)
    } catch (err) {
      setStep('Error: ' + (err?.response?.data?.message || err.message || 'Something went wrong'))
    } finally {
      setProcessing(false)
    }
  }

  if (processing) {
    return (
      <div className="app-bg" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="spinner-card">
          <div className="spinner" />
          <p className="spinner-step">{step}</p>
        </div>
      </div>
    )
  }

  if (!processing && step.startsWith('Error')) {
    return (
      <div className="app-bg" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
        <div className="confirm-content" style={{ maxWidth: 420, textAlign: 'center' }}>
          <h2 className="confirm-title" style={{ color: '#fca5a5' }}>Something went wrong</h2>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.85rem', margin: '0.75rem 0 1.5rem' }}>
            {step.replace('Error: ', '')}
          </p>
          <button className="confirm-ok" style={{ width: '100%' }} onClick={() => setStep('')}>
            Try Again
          </button>
        </div>
      </div>
    )
  }

  if (done) {
    return (
      <div className="app-bg" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
        <div className="done-card" style={{ textAlign: 'center' }}>
          <div className="done-check">✓</div>
          <h2 className="done-title">Booking Confirmed!</h2>
          <p className="done-sub">{doneMsg}</p>
          {emailError && (
            <p style={{ color: '#fca5a5', fontSize: '0.82rem', margin: '0.75rem 0 0' }}>⚠️ {emailError}</p>
          )}
          {lanyardUrl && (
            <div className="done-lanyard-wrap" style={{ marginTop: '1.5rem' }}>
              <img src={lanyardUrl} alt="Reserved Pass" className="done-lanyard-img" />
              <a href={lanyardUrl} download="reserved-pass.png" className="done-download-btn">
                Download Pass
              </a>
            </div>
          )}
          <button
            onClick={() => {
              setDone(false); setFlow(null)
              setFullName(''); setEmail(''); setPhone(''); setCnic('')
              setCompanyName('')
              setIndTable(''); setIndChair('')
              setCorpSeats([{ table: '', chair: '' }])
              setLanyardUrl(null); setEmailError(''); setFieldErrors({})
            }}
            style={{ marginTop: '1.5rem', background: 'none', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 8, color: 'rgba(255,255,255,0.55)', padding: '8px 20px', cursor: 'pointer', fontSize: '0.85rem' }}
          >
            Book Another
          </button>
        </div>
      </div>
    )
  }

  if (!flow) {
    return (
      <div className="app-bg" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
        <div style={{ maxWidth: 480, width: '100%' }}>
          <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
            <h1 className="venue-title">PAS AWARDS</h1>
            <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.88rem', marginTop: 8 }}>
              Reserved Seat Booking
            </p>
          </div>
          <div style={{ display: 'flex', gap: 16 }}>
            <button
              onClick={() => setFlow('individual')}
              style={{
                flex: 1, padding: '2rem 1rem',
                background: 'rgba(255,255,255,0.05)',
                border: '1.5px solid rgba(255,255,255,0.12)',
                borderRadius: 16, color: '#fff', cursor: 'pointer',
                textAlign: 'center', transition: 'border-color 0.2s',
              }}
              onMouseOver={e => e.currentTarget.style.borderColor = 'rgba(250,204,21,0.5)'}
              onMouseOut={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)'}
            >
              <div style={{ fontSize: '2.2rem', marginBottom: 10 }}>👤</div>
              <div style={{ fontWeight: 700, fontSize: '1rem', marginBottom: 6 }}>Individual</div>
              <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', lineHeight: 1.5 }}>
                Single seat<br />Lanyard sent via email
              </div>
            </button>
            <button
              onClick={() => setFlow('corporate')}
              style={{
                flex: 1, padding: '2rem 1rem',
                background: 'rgba(255,255,255,0.05)',
                border: '1.5px solid rgba(255,255,255,0.12)',
                borderRadius: 16, color: '#fff', cursor: 'pointer',
                textAlign: 'center', transition: 'border-color 0.2s',
              }}
              onMouseOver={e => e.currentTarget.style.borderColor = 'rgba(250,204,21,0.5)'}
              onMouseOut={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)'}
            >
              <div style={{ fontSize: '2.2rem', marginBottom: 10 }}>🏢</div>
              <div style={{ fontWeight: 700, fontSize: '1rem', marginBottom: 6 }}>Corporate</div>
              <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', lineHeight: 1.5 }}>
                Multiple seats<br />Form link via WhatsApp
              </div>
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="app-bg" style={{ minHeight: '100vh', padding: '2rem 1rem' }}>
      <div style={{ maxWidth: 500, margin: '0 auto' }}>

        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <h1 className="venue-title" style={{ marginBottom: 6 }}>PAS AWARDS</h1>
          <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.82rem' }}>
            Reserved · {flow === 'individual' ? 'Individual Booking' : 'Corporate Booking'}
          </p>
          <button
            onClick={() => { setFlow(null); setFieldErrors({}) }}
            style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)', fontSize: '0.8rem', cursor: 'pointer', marginTop: 6 }}
          >
            ← Change type
          </button>
        </div>

        <div className="confirm-content" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: 14 }}>

          <FormField
            label="Full Name" value={fullName} onChange={setFullName}
            required error={fieldErrors.fullName}
          />

          {flow === 'individual' && (
            <FormField
              label="Email Address" value={email} onChange={setEmail}
              type="email" required placeholder="attendee@company.com"
              error={fieldErrors.email}
            />
          )}

          <FormField
            label="Phone Number" value={phone} onChange={setPhone}
            placeholder="923XXXXXXXXX" 
          />

          {flow === 'individual' && (
            <FormField
              label="CNIC Number" value={cnic} onChange={setCnic}
              placeholder="XXXXX-XXXXXXX-X" error={fieldErrors.cnic}
            />
          )}

          <FormField
            label="Company Name" value={companyName} onChange={setCompanyName}
            required={flow === 'corporate'} error={fieldErrors.companyName}
          />

          {flow === 'corporate' && (
            <FormField
              label="Email Address (optional)" value={email} onChange={setEmail}
              type="email" placeholder="contact@company.com"
            />
          )}

          <div style={{ borderTop: '1px solid rgba(255,255,255,0.07)', paddingTop: 14 }}>
            <p style={{ ...LABEL_STYLE, marginBottom: 12 }}>
              SEAT SELECTION
            </p>

            {flow === 'individual' ? (
              <SeatPicker
                tableVal={indTable} chairVal={indChair}
                onTableChange={v => { setIndTable(v); setIndChair('') }}
                onChairChange={setIndChair}
                tableError={fieldErrors.indTable}
                chairError={fieldErrors.indChair}
              />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {corpSeats.map((seat, idx) => (
                  <div key={idx} style={{ display: 'flex', alignItems: 'flex-end', gap: 8 }}>
                    <div style={{ flex: 1 }}>
                      <SeatPicker
                        tableVal={seat.table} chairVal={seat.chair}
                        onTableChange={v => updateCorpSeat(idx, 'table', v)}
                        onChairChange={v => updateCorpSeat(idx, 'chair', v)}
                        label={`Seat ${idx + 1}`}
                        tableError={fieldErrors[`seat_table_${idx}`]}
                        chairError={fieldErrors[`seat_chair_${idx}`]}
                      />
                    </div>
                    {corpSeats.length > 1 && (
                      <button
                        onClick={() => removeCorpSeat(idx)}
                        style={{
                          background: 'rgba(239,68,68,0.12)',
                          border: '1px solid rgba(239,68,68,0.25)',
                          borderRadius: 8, color: '#f87171',
                          padding: '10px 12px', cursor: 'pointer',
                          flexShrink: 0, marginBottom: fieldErrors[`seat_chair_${idx}`] ? 22 : 0,
                        }}
                      >
                        ✕
                      </button>
                    )}
                  </div>
                ))}
                <button
                  onClick={addCorpSeat}
                  style={{
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px dashed rgba(255,255,255,0.18)',
                    borderRadius: 8, color: 'rgba(255,255,255,0.45)',
                    padding: '9px 14px', cursor: 'pointer', fontSize: '0.85rem',
                  }}
                >
                  + Add Seat
                </button>
              </div>
            )}
          </div>

          <button
            className="confirm-ok"
            style={{ width: '100%', marginTop: 4 }}
            onClick={flow === 'individual' ? handleIndividualSubmit : handleCorporateSubmit}
          >
            {flow === 'individual' ? 'Book & Send Pass via Email' : 'Book & Send WhatsApp Link'}
          </button>
        </div>
      </div>
    </div>
  )
}
