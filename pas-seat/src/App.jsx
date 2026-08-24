import { useState, useCallback, useEffect } from 'react'
import './App.css'
import NotFound from './NotFound'
import { generateLanyard } from './generateLanyard'
import QRCode from 'qrcode'
import { sendLanyardWhatsapp, bookSeats, uploadFile, validateToken, fetchSeatsData } from './api'
import { INIT, applySeatsData } from './utils/seatLayout'
import { decryptParams } from './utils/Decrypt'
import VenueFloor from './components/VenueFloor'
import ChairPickerModal from './components/ChairPickerModal'
import ConfirmModal from './components/ConfirmModal'
import AttendeeFormModal from './components/AttendeeFormModal'
import SideBookingDrawer from './components/SideBookingDrawer'
import ProcessingOverlay from './components/ProcessingOverlay'
import DoneModal from './components/DoneModal'

export default function App() {
  const [paramData, setParamData] = useState(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [authError, setAuthError] = useState('')
  const [tables, setTables] = useState(INIT)
  const [modalTable, setModalTable] = useState(null)
  const [showConfirm, setShowConfirm] = useState(false)
  const [showAttendeeForm, setShowAttendeeForm] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [processStep, setProcessStep] = useState('')
  const [done, setDone] = useState(false)
  const [lanyardUrls, setLanyardUrls] = useState([]) // array of { url, name, seatNumber }
  const [broadcastFailed, setBroadcastFailed] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(true)

  // 1. Validate encrypted URL token with backend (or use mock data in dev)
  useEffect(() => {
    async function init() {
      const p = new URLSearchParams(window.location.search)
      const encryptedData = p.get('data') || p.get('p')

      if (!encryptedData) {
        // Static mock data for direct testing without URL params
        setParamData({
          allowedSeats: 4,
          totalAllowed: 4,
          usedSeats: 0,
          allowedTypes: ['normal', 'vip'],
          phone_number: '923001234567',
          Company_Name: 'Convex Interactive',
          _token: null,
        })
        setAuthLoading(false)
        return
      }

      try {
        const res = await validateToken(encryptedData)
        if (res.valid) {
          setParamData({
            allowedSeats: res.remainingSeats,
            totalAllowed: res.allowedSeats,
            usedSeats: res.usedSeats,
            allowedTypes: ['normal', 'vip'],
            phone_number: res.phone || '',
            Company_Name: res.companyName || 'Guest Company',
            _token: encryptedData,
          })
          setAuthLoading(false)
        } else if (res.reason === 'fully_used') {
          setAuthError('used')
          setAuthLoading(false)
        } else {
          setAuthError('invalid')
          setAuthLoading(false)
        }
      } catch (err) {
        console.warn('Backend token validation failed, attempting client-side fallback:', err)
        try {
          const parsed = await decryptParams(encryptedData)
          const seats = parseInt(parsed.allowedSeats || parsed.Number_of_ticket || 4, 10)
          setParamData({
            allowedSeats: seats,
            totalAllowed: seats,
            usedSeats: 0,
            allowedTypes: ['normal', 'vip'],
            phone_number: parsed.phone_number || parsed.phone || '',
            Company_Name: parsed.Company_Name || parsed.companyName || 'Guest Company',
            _token: encryptedData,
          })
          setAuthLoading(false)
        } catch (decryptErr) {
          console.error('Client-side decryption also failed:', decryptErr)
          setAuthError('invalid')
          setAuthLoading(false)
        }
      }
    }
    init()
  }, [])

  // 2. Fetch real seat status from backend DB
  useEffect(() => {
    fetchSeatsData()
      .then(seatsArray => {
        if (seatsArray && seatsArray.length > 0) {
          setTables(prev => applySeatsData(prev, seatsArray))
        }
      })
      .catch(err => console.error('Failed to load seat status from DB:', err))
  }, [])

  const openModal = useCallback((table) => setModalTable(table), [])
  const closeModal = useCallback(() => {
    setModalTable(null)
    setDrawerOpen(true) // Ensure drawer opens when modal closes
  }, [])

  const toggleChair = useCallback((chairLabel) => {
    if (!modalTable) return
    setTables(prev => {
      const updated = {
        ...prev,
        [modalTable.id]: {
          ...prev[modalTable.id],
          chairs: prev[modalTable.id].chairs.map(c =>
            c.label === chairLabel ? { ...c, selected: !c.selected } : c
          ),
        },
      }
      setModalTable(updated[modalTable.id])
      return updated
    })
  }, [modalTable])

  const removeSeat = useCallback((tableId, chairLabel) => {
    setTables(prev => {
      if (!prev[tableId]) return prev
      return {
        ...prev,
        [tableId]: {
          ...prev[tableId],
          chairs: prev[tableId].chairs.map(c =>
            c.label === chairLabel ? { ...c, selected: false } : c
          ),
        },
      }
    })
  }, [])

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

  // Step 1: ConfirmModal → open AttendeeFormModal
  const handleConfirmToForm = () => {
    setShowConfirm(false)
    setShowAttendeeForm(true)
  }

  // Step 2: AttendeeFormModal submits → process all bookings
  const processBookings = async (attendees) => {
    setShowAttendeeForm(false)
    setProcessing(true)
    setBroadcastFailed(false)

    const collectedLanyards = []
    const total = attendees.length

    try {
      for (let i = 0; i < total; i++) {
        const attendee = attendees[i]

        // 1. Book the seat
        setProcessStep(`Reserving seat ${i + 1} of ${total}...`)
        const { booking } = await bookSeats({
          token: paramData._token,
          seatNumber: attendee.seatNumber,
          phone: attendee.phone,
          name: attendee.name,
          companyName: attendee.companyName,
          type: 'Individual',
        })

        // 2. Generate QR code pointing to Profile page
        const profileUrl = `${window.location.origin}/Profile/${booking}`
        setProcessStep(`Generating QR code ${i + 1} of ${total}...`)
        const qrDataUrl = await QRCode.toDataURL(profileUrl, { width: 512, margin: 2 })
        const qrBlob = await (await fetch(qrDataUrl)).blob()
        const { url: lanyardQrUrl } = await uploadFile(qrBlob, `lanyard-qr-${booking}.png`)

        // 3. Generate lanyard
        setProcessStep(`Generating pass ${i + 1} of ${total}...`)
        const { blob } = await generateLanyard({
          name: attendee.name,
          companyName: attendee.companyName,
          seatNumber: attendee.seatNumber,
          lanyardQrUrl,
        })

        // 4. Upload lanyard
        const { url: lanyardUrl } = await uploadFile(blob, `lanyard-${attendee.phone}-${i}.jpg`)
        collectedLanyards.push({
          url: lanyardUrl,
          name: attendee.name,
          seatNumber: attendee.seatNumber,
        })

        // 5. Broadcast via WhatsApp
        setProcessStep(`Broadcasting pass ${i + 1} of ${total}...`)
        try {
          await sendLanyardWhatsapp({ contactNumber: attendee.phone, lanyardUrl })
        } catch (whatsappErr) {
          console.error(`WhatsApp broadcast failed for ${attendee.name}:`, whatsappErr)
          setBroadcastFailed(true)
        }
      }

      setLanyardUrls(collectedLanyards)
      setDone(true)
    } catch (err) {
      console.error('Booking error:', err)
      setProcessStep('Error: ' + (err?.response?.data?.message || err.message || 'Something went wrong'))
    } finally {
      setProcessing(false)
    }
  }

  if (authLoading) {
    return (
      <div className="app-bg" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="spinner-card">
          <div className="spinner" />
          <p className="spinner-step">Verifying your invitation...</p>
        </div>
      </div>
    )
  }

  if (authError === 'used') {
    return (
      <div className="app-bg" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
        <div className="confirm-content" style={{ maxWidth: 400, textAlign: 'center' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🔒</div>
          <h2 className="confirm-title" style={{ color: '#fca5a5' }}>Already Used</h2>
          <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.9rem', margin: '1rem 0' }}>
            This booking link has already been used for all allocated seats.
          </p>
        </div>
      </div>
    )
  }

  if (authError || !paramData) return <NotFound />

  return (
    <div className="app-bg">
      <div className="venue-card">

        <div className="venue-scale-outer">
          <div className="venue-scale-inner">
            <VenueFloor
              tables={tables}
              allowedTypes={allowedTypes}
              onTableClick={handleTableClick}
            />
          </div>
        </div>
      </div>

      {/* Floating Toggle Button when Drawer is Closed */}
      {!modalTable && totalSelected > 0 && !drawerOpen && (
        <button
          type="button"
          className="side-drawer-toggle-btn"
          onClick={() => setDrawerOpen(true)}
          title="Open Selection Summary"
        >
          <span className="side-drawer-toggle-icon">💺</span>
          <span className="side-drawer-toggle-badge">{totalSelected}</span>
        </button>
      )}

      {/* Side Booking Drawer (matching reference image) */}
      {!modalTable && (
        <SideBookingDrawer
          allSelections={allSelections}
          allowedSeats={allowedSeats}
          totalSelected={totalSelected}
          paramData={paramData}
          onClear={clearAll}
          onBook={() => setShowConfirm(true)}
          onRemoveSeat={removeSeat}
          isOpen={drawerOpen}
          onClose={() => setDrawerOpen(false)}
        />
      )}

      {modalTable && (
        <ChairPickerModal
          table={modalTable}
          totalSelected={totalSelected}
          allowedSeats={allowedSeats}
          atLimit={atLimit}
          onToggleChair={toggleChair}
          canSelectMore={canSelectMore(modalTable)}
          onClose={closeModal}
        />
      )}

      {showConfirm && (
        <ConfirmModal
          paramData={paramData}
          allSelections={allSelections}
          onCancel={() => setShowConfirm(false)}
          onConfirm={handleConfirmToForm}
        />
      )}

      {showAttendeeForm && (
        <AttendeeFormModal
          allSelections={allSelections}
          paramData={paramData}
          onSubmit={processBookings}
          onCancel={() => setShowAttendeeForm(false)}
        />
      )}

      {processing && <ProcessingOverlay step={processStep} />}

      {!processing && processStep.startsWith('Error') && (
        <div className="modal-overlay" onClick={() => setProcessStep('')}>
          <div className="confirm-content" onClick={e => e.stopPropagation()}>
            <h2 className="confirm-title" style={{ color: '#fca5a5' }}>Something went wrong</h2>
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.85rem', margin: '0.75rem 0 1.25rem' }}>
              {processStep.replace('Error: ', '')}
            </p>
            <button className="confirm-ok" style={{ width: '100%' }} onClick={() => setProcessStep('')}>
              Dismiss
            </button>
          </div>
        </div>
      )}

      {done && (
        <DoneModal
          lanyardUrls={lanyardUrls}
          broadcastFailed={broadcastFailed}
        />
      )}

    </div>
  )
}
