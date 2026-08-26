import { useState, useEffect, useCallback } from 'react'
import QRCode from 'qrcode'
import { jsPDF } from 'jspdf'
import { bookSeats, uploadFile, sendPDFWhatsapp, fetchSeatsData } from '../api'
import { generateLanyard } from '../generateLanyard'
import { CHAIR_LABELS, UNAVAILABLE_TABLES } from '../utils/seatLayout'
import DoneModal from '../components/DoneModal'

const ALL_TABLE_NUMBERS = Array.from({ length: 56 }, (_, i) => i + 1)

function generateMongoId() {
  const timestamp = Math.floor(Date.now() / 1000).toString(16).padStart(8, '0')
  const randomBytes = Array.from(crypto.getRandomValues(new Uint8Array(8)))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
  return (timestamp + randomBytes).toLowerCase()
}

function loadImageData(url) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = img.naturalWidth
      canvas.height = img.naturalHeight
      const ctx = canvas.getContext('2d')
      ctx.drawImage(img, 0, 0)
      resolve({
        dataUrl: canvas.toDataURL('image/jpeg', 0.95),
        width: img.naturalWidth,
        height: img.naturalHeight,
      })
    }
    img.onerror = reject
    img.src = url
  })
}

async function createMultiPassPdfBlob(lanyardList) {
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  })
  const pageWidth = pdf.internal.pageSize.getWidth()
  const pageHeight = pdf.internal.pageSize.getHeight()

  for (let i = 0; i < lanyardList.length; i++) {
    if (i > 0) {
      pdf.addPage('a4', 'portrait')
    }
    // Pure black background on each page
    pdf.setFillColor(0, 0, 0)
    pdf.rect(0, 0, pageWidth, pageHeight, 'F')

    const { dataUrl, width, height } = await loadImageData(lanyardList[i].url)
    const imgAspect = width / height
    const margin = 12
    const maxW = pageWidth - margin * 2
    const maxH = pageHeight - margin * 2

    let renderW = maxW
    let renderH = renderW / imgAspect
    if (renderH > maxH) {
      renderH = maxH
      renderW = renderH * imgAspect
    }

    const posX = (pageWidth - renderW) / 2
    const posY = (pageHeight - renderH) / 2
    pdf.addImage(dataUrl, 'JPEG', posX, posY, renderW, renderH)
  }

  return pdf.output('blob')
}

export default function ReservedBooking() {
  const [companyName, setCompanyName] = useState('')
  const [phone, setPhone] = useState('')
  const [currentTable, setCurrentTable] = useState(3)
  const [selectedSeats, setSelectedSeats] = useState([])
  const [bookedSeatsSet, setBookedSeatsSet] = useState(new Set())
  const [loadingSeats, setLoadingSeats] = useState(true)

  const [processing, setProcessing] = useState(false)
  const [step, setStep] = useState('')
  const [done, setDone] = useState(false)
  const [broadcastFailed, setBroadcastFailed] = useState(false)
  const [lanyardUrls, setLanyardUrls] = useState([])
  const [pdfDownloadUrl, setPdfDownloadUrl] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})

  // Load latest booked seats status
  const refreshSeats = useCallback(async () => {
    try {
      setLoadingSeats(true)
      const data = await fetchSeatsData()
      const booked = new Set()
      data.forEach(s => {
        if (!s.seatStatus) {
          booked.add(s.seatNumber)
        }
      })
      setBookedSeatsSet(booked)
    } catch (err) {
      console.error('Failed to fetch seat data:', err)
    } finally {
      setLoadingSeats(false)
    }
  }, [])

  useEffect(() => {
    refreshSeats()
  }, [refreshSeats])

  // Chair selection toggles
  const isSeatSelected = (tableNum, chair) => selectedSeats.includes(`${tableNum}-${chair}`)
  const isSeatBooked = (tableNum, chair) => {
    if (UNAVAILABLE_TABLES.has(tableNum)) return true
    return bookedSeatsSet.has(`${tableNum}-${chair}`)
  }

  const toggleChair = (chair) => {
    const seatId = `${currentTable}-${chair}`
    if (isSeatBooked(currentTable, chair)) return

    setSelectedSeats(prev =>
      prev.includes(seatId) ? prev.filter(s => s !== seatId) : [...prev, seatId]
    )
  }

  const selectFullTable = () => {
    if (UNAVAILABLE_TABLES.has(currentTable)) return
    const tableSeats = CHAIR_LABELS
      .filter(c => !isSeatBooked(currentTable, c))
      .map(c => `${currentTable}-${c}`)

    setSelectedSeats(prev => {
      const filtered = prev.filter(s => !s.startsWith(`${currentTable}-`))
      return [...filtered, ...tableSeats]
    })
  }

  const clearCurrentTableSeats = () => {
    setSelectedSeats(prev => prev.filter(s => !s.startsWith(`${currentTable}-`)))
  }

  const removeSeatChip = (seatId) => {
    setSelectedSeats(prev => prev.filter(s => s !== seatId))
  }

  const clearAllSeats = () => {
    setSelectedSeats([])
  }

  // Submission handler
  const handleSubmit = async (e) => {
    if (e) e.preventDefault()

    const errs = {}
    if (!companyName.trim()) errs.companyName = 'Company / Recipient name is required'
    const cleanPhone = phone.trim().replace(/[^0-9]/g, '')
    if (!cleanPhone || cleanPhone.length < 10) {
      errs.phone = 'Valid WhatsApp phone number required (e.g. 923001234567)'
    }
    if (selectedSeats.length === 0) {
      errs.seats = 'Please select at least 1 seat'
    }

    setFieldErrors(errs)
    if (Object.keys(errs).length > 0) return

    setProcessing(true)
    setBroadcastFailed(false)
    const collectedLanyards = []
    const total = selectedSeats.length

    try {
      // 1. Process each seat: create MongoId, QR, Lanyard, upload, and book in backend
      for (let i = 0; i < total; i++) {
        const seatNumber = selectedSeats[i]
        const bookingId = generateMongoId()

        setStep(`[${i + 1}/${total}] Generating QR for seat ${seatNumber}...`)
        const profileUrl = `${window.location.origin}/Profile/${bookingId}`
        const qrDataUrl = await QRCode.toDataURL(profileUrl, { width: 512, margin: 2 })
        const qrBlob = await (await fetch(qrDataUrl)).blob()
        const { url: lanyardQrUrl } = await uploadFile(qrBlob, `lanyard-qr-${bookingId}.png`)

        setStep(`[${i + 1}/${total}] Generating lanyard pass for ${seatNumber}...`)
        const { blob: lanyardBlob } = await generateLanyard({
          name: companyName.trim(),
          companyName: companyName.trim(),
          seatNumber,
          lanyardQrUrl,
        })

        setStep(`[${i + 1}/${total}] Uploading pass for ${seatNumber}...`)
        const { url: lanyardUrl } = await uploadFile(
          lanyardBlob,
          `lanyard-${cleanPhone}-${seatNumber}.jpg`
        )

        collectedLanyards.push({
          url: lanyardUrl,
          name: companyName.trim(),
          seatNumber,
        })

        setStep(`[${i + 1}/${total}] Reserving seat ${seatNumber} in database...`)
        await bookSeats({
          _id: bookingId,
          seatNumber,
          phone: cleanPhone,
          name: companyName.trim(),
          companyName: companyName.trim(),
          type: 'Individual',
          image: lanyardUrl,
        })
      }

      // 2. Generate multi-page PDF with black background for all lanyards
      setStep('Generating consolidated multi-pass PDF...')
      const pdfBlob = await createMultiPassPdfBlob(collectedLanyards)

      // 3. Upload the generated PDF
      setStep('Uploading multi-pass PDF document...')
      const safeName = companyName.trim().replace(/[^a-zA-Z0-9]/g, '_')
      const { url: pdfUrl } = await uploadFile(pdfBlob, `${safeName}_event_passes.pdf`)
      setPdfDownloadUrl(pdfUrl)

      // 4. Send PDF via WhatsApp broadcast
      setStep('Dispatching event passes PDF via WhatsApp...')
      try {
        await sendPDFWhatsapp({ contactNumber: cleanPhone, pdfUrl })
      } catch (whatsappErr) {
        console.error('WhatsApp PDF dispatch failed:', whatsappErr)
        setBroadcastFailed(true)
      }

      setLanyardUrls(collectedLanyards)
      setDone(true)
      refreshSeats()
    } catch (err) {
      console.error('Direct booking failed:', err)
      setStep('Error: ' + (err?.response?.data?.message || err.message || 'Something went wrong during reservation'))
    } finally {
      setProcessing(false)
    }
  }

  const handleResetForm = () => {
    setDone(false)
    setCompanyName('')
    setPhone('')
    setSelectedSeats([])
    setLanyardUrls([])
    setPdfDownloadUrl('')
    setStep('')
    setFieldErrors({})
    refreshSeats()
  }

  if (processing) {
    return (
      <div className="app-bg" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="spinner-card" style={{ maxWidth: 420, textAlign: 'center' }}>
          <div className="spinner" />
          <h3 style={{ color: '#fff', fontSize: '1.1rem', margin: '1rem 0 0.5rem', fontWeight: 800 }}>
            Processing Reservation
          </h3>
          <p className="spinner-step" style={{ color: 'var(--gold-300)', fontSize: '0.85rem' }}>{step}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="app-bg" style={{ minHeight: '100vh', padding: '2rem 1rem' }}>
      <div style={{ maxWidth: 640, margin: '0 auto' }}>

        {/* Page Header */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{
            display: 'inline-block',
            background: 'rgba(212, 175, 55, 0.12)',
            border: '1px solid rgba(212, 175, 55, 0.3)',
            borderRadius: 6,
            padding: '4px 12px',
            fontSize: '0.72rem',
            fontWeight: 800,
            color: 'var(--gold-300)',
            letterSpacing: 1.5,
            marginBottom: 8,
          }}>
            DIRECT RESERVATION &amp; PDF DISPATCH
          </div>
          <h1 className="venue-title" style={{ margin: '0 0 6px' }}>PAS AWARDS 2026</h1>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.85rem' }}>
            Book seats directly, generate official digital lanyards, and broadcast the consolidated PDF via WhatsApp.
          </p>
        </div>

        {/* Error message modal if booking failed */}
        {!processing && step.startsWith('Error') && (
          <div className="modal-overlay" onClick={() => setStep('')}>
            <div className="confirm-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 440, textAlign: 'center' }}>
              <h2 className="confirm-title" style={{ color: '#fca5a5' }}>Reservation Failed</h2>
              <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.85rem', margin: '0.75rem 0 1.5rem' }}>
                {step.replace('Error: ', '')}
              </p>
              <button className="confirm-ok" style={{ width: '100%' }} onClick={() => setStep('')}>
                Dismiss
              </button>
            </div>
          </div>
        )}

        {/* Main Reservation Form Card */}
        <div className="confirm-content" style={{ maxWidth: '100%', padding: '2rem', display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Company / Recipient Name */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ color: 'var(--gold-300)', fontSize: '0.78rem', fontWeight: 800, letterSpacing: '0.04em' }}>
              COMPANY / ATTENDEE NAME <span style={{ color: '#fca5a5' }}>*</span>
            </label>
            <input
              type="text"
              value={companyName}
              onChange={e => {
                setCompanyName(e.target.value)
                if (fieldErrors.companyName) setFieldErrors(prev => ({ ...prev, companyName: null }))
              }}
              placeholder="e.g. Convex Interactive / Unilever"
              className="attendee-input"
              style={{
                border: fieldErrors.companyName ? '1px solid #fca5a5' : '1px solid rgba(255,255,255,0.12)',
              }}
            />
            {fieldErrors.companyName && (
              <span style={{ color: '#fca5a5', fontSize: '0.75rem' }}>{fieldErrors.companyName}</span>
            )}
          </div>

          {/* WhatsApp Phone */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ color: 'var(--gold-300)', fontSize: '0.78rem', fontWeight: 800, letterSpacing: '0.04em' }}>
              WHATSAPP PHONE NUMBER <span style={{ color: '#fca5a5' }}>*</span>
            </label>
            <input
              type="tel"
              value={phone}
              onChange={e => {
                setPhone(e.target.value)
                if (fieldErrors.phone) setFieldErrors(prev => ({ ...prev, phone: null }))
              }}
              placeholder="e.g. 923001234567"
              className="attendee-input"
              style={{
                border: fieldErrors.phone ? '1px solid #fca5a5' : '1px solid rgba(255,255,255,0.12)',
              }}
            />
            <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.72rem' }}>
              The multi-pass PDF will be dispatched to this WhatsApp contact.
            </span>
            {fieldErrors.phone && (
              <span style={{ color: '#fca5a5', fontSize: '0.75rem' }}>{fieldErrors.phone}</span>
            )}
          </div>

          {/* Seat Picker Section */}
          <div style={{
            borderTop: '1px solid rgba(255,255,255,0.08)',
            paddingTop: 18,
            display: 'flex',
            flexDirection: 'column',
            gap: 14,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <label style={{ color: 'var(--gold-300)', fontSize: '0.78rem', fontWeight: 800, letterSpacing: '0.04em' }}>
                SELECT SEATS &amp; TABLES <span style={{ color: '#fca5a5' }}>*</span>
              </label>
              {loadingSeats && (
                <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.72rem' }}>
                  Syncing live availability...
                </span>
              )}
            </div>

            {/* Table Selection Dropdown & Full-Table Action */}
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
              <div style={{ flex: '1 1 200px', display: 'flex', flexDirection: 'column', gap: 4 }}>
                <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.5)', fontWeight: 700 }}>
                  CHOOSE TABLE:
                </span>
                <select
                  value={currentTable}
                  onChange={e => setCurrentTable(Number(e.target.value))}
                  style={{
                    background: '#0f1829',
                    border: '1px solid rgba(212, 175, 55, 0.3)',
                    borderRadius: 8,
                    color: '#fff',
                    padding: '9px 12px',
                    fontSize: '0.9rem',
                    fontWeight: 700,
                    outline: 'none',
                    cursor: 'pointer',
                    width: '100%',
                  }}
                >
                  {ALL_TABLE_NUMBERS.map(t => {
                    const isUnavail = UNAVAILABLE_TABLES.has(t)
                    return (
                      <option key={t} value={t} style={{ background: '#0f1829' }}>
                        Table {t} {isUnavail ? '(Unavailable)' : ''}
                      </option>
                    )
                  })}
                </select>
              </div>

              <div style={{ display: 'flex', gap: 8, flex: '1 1 auto', marginTop: 18 }}>
                <button
                  type="button"
                  onClick={selectFullTable}
                  disabled={UNAVAILABLE_TABLES.has(currentTable)}
                  style={{
                    flex: 1,
                    background: UNAVAILABLE_TABLES.has(currentTable)
                      ? 'rgba(255,255,255,0.05)'
                      : 'linear-gradient(135deg, rgba(212,175,55,0.2) 0%, rgba(212,175,55,0.08) 100%)',
                    border: '1px solid var(--gold-border)',
                    borderRadius: 8,
                    color: UNAVAILABLE_TABLES.has(currentTable) ? 'rgba(255,255,255,0.3)' : 'var(--gold-300)',
                    padding: '9px 12px',
                    fontSize: '0.78rem',
                    fontWeight: 800,
                    cursor: UNAVAILABLE_TABLES.has(currentTable) ? 'not-allowed' : 'pointer',
                    transition: 'all 0.2s',
                  }}
                >
                  ⚡ Select Full Table (10 Chairs)
                </button>

                <button
                  type="button"
                  onClick={clearCurrentTableSeats}
                  style={{
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: 8,
                    color: 'rgba(255,255,255,0.6)',
                    padding: '9px 12px',
                    fontSize: '0.78rem',
                    cursor: 'pointer',
                  }}
                  title="Clear seats of this table"
                >
                  Clear Table
                </button>
              </div>
            </div>

            {/* Chair Picker Grid for Current Table */}
            <div style={{
              background: 'rgba(0, 0, 0, 0.35)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: 12,
              padding: '1rem',
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--gold-300)' }}>
                  Table {currentTable} Chairs:
                </span>
                <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.45)' }}>
                  Click chair to toggle selection
                </span>
              </div>

              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(5, 1fr)',
                gap: 8,
              }}>
                {CHAIR_LABELS.map(chair => {
                  const booked = isSeatBooked(currentTable, chair)
                  const selected = isSeatSelected(currentTable, chair)

                  let bg = 'rgba(255,255,255,0.04)'
                  let border = '1px solid rgba(255,255,255,0.1)'
                  let color = 'rgba(255,255,255,0.7)'

                  if (selected) {
                    bg = 'linear-gradient(135deg, #ffd700 0%, #d4af37 100%)'
                    border = '1px solid #fff'
                    color = '#1a0f02'
                  } else if (booked) {
                    bg = 'rgba(239, 68, 68, 0.08)'
                    border = '1px solid rgba(239, 68, 68, 0.2)'
                    color = 'rgba(239, 68, 68, 0.45)'
                  }

                  return (
                    <button
                      key={chair}
                      type="button"
                      disabled={booked}
                      onClick={() => toggleChair(chair)}
                      style={{
                        background: bg,
                        border,
                        color,
                        borderRadius: 8,
                        padding: '10px 4px',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 2,
                        cursor: booked ? 'not-allowed' : 'pointer',
                        transition: 'transform 0.15s, background 0.15s',
                        transform: selected ? 'scale(1.05)' : 'scale(1)',
                      }}
                    >
                      <span style={{ fontSize: '0.88rem', fontWeight: 900 }}>
                        {currentTable}-{chair}
                      </span>
                      <span style={{ fontSize: '0.62rem', fontWeight: 700 }}>
                        {selected ? '✓ Picked' : (booked ? 'Booked' : 'Available')}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Selected Seats Summary & Chips */}
            <div>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 8,
              }}>
                <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#fff' }}>
                  Total Selected: <span style={{ color: 'var(--gold-400)' }}>{selectedSeats.length} seats</span>
                </span>
                {selectedSeats.length > 0 && (
                  <button
                    type="button"
                    onClick={clearAllSeats}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#f87171',
                      fontSize: '0.72rem',
                      cursor: 'pointer',
                      textDecoration: 'underline',
                    }}
                  >
                    Clear All
                  </button>
                )}
              </div>

              {selectedSeats.length === 0 ? (
                <div style={{
                  padding: '12px',
                  background: 'rgba(255,255,255,0.02)',
                  border: '1px dashed rgba(255,255,255,0.1)',
                  borderRadius: 8,
                  textAlign: 'center',
                  color: 'rgba(255,255,255,0.4)',
                  fontSize: '0.78rem',
                }}>
                  No seats selected yet. Choose a table and pick chairs or click &quot;Select Full Table&quot;.
                </div>
              ) : (
                <div style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: 6,
                  maxHeight: 140,
                  overflowY: 'auto',
                  padding: '4px',
                  background: 'rgba(0,0,0,0.2)',
                  borderRadius: 8,
                }}>
                  {selectedSeats.map(seatId => (
                    <span
                      key={seatId}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        background: 'rgba(212, 175, 55, 0.15)',
                        border: '1px solid rgba(212, 175, 55, 0.35)',
                        borderRadius: 6,
                        padding: '3px 8px',
                        fontSize: '0.75rem',
                        fontWeight: 800,
                        color: 'var(--gold-300)',
                      }}
                    >
                      {seatId}
                      <button
                        type="button"
                        onClick={() => removeSeatChip(seatId)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'rgba(255,255,255,0.5)',
                          cursor: 'pointer',
                          padding: 0,
                          fontSize: '0.75rem',
                          lineHeight: 1,
                        }}
                      >
                        ✕
                      </button>
                    </span>
                  ))}
                </div>
              )}

              {fieldErrors.seats && (
                <span style={{ color: '#fca5a5', fontSize: '0.75rem', marginTop: 4, display: 'block' }}>
                  {fieldErrors.seats}
                </span>
              )}
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="button"
            className="confirm-ok"
            onClick={handleSubmit}
            style={{
              width: '100%',
              padding: '0.9rem',
              fontSize: '0.95rem',
              fontWeight: 800,
              marginTop: 6,
            }}
          >
            Book {selectedSeats.length > 0 ? `${selectedSeats.length} Seats & Send PDF` : 'Seats'} →
          </button>
        </div>
      </div>

      {/* Done Modal after successful booking & broadcast */}
      {done && (
        <DoneModal
          lanyardUrls={lanyardUrls}
          broadcastFailed={broadcastFailed}
          onClose={handleResetForm}
        />
      )}
    </div>
  )
}
