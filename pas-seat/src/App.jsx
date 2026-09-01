import { useState, useCallback, useEffect } from 'react'
import './App.css'
import NotFound from './NotFound'
import { generateLanyard } from './generateLanyard'
import QRCode from 'qrcode'
import { sendLanyardWhatsapp, bookSeats, uploadFile, validateToken, fetchSeatsData } from './api'
import { INIT, applySeatsData } from './utils/seatLayout'
import VenueFloor from './components/VenueFloor'
import ChairPickerModal from './components/ChairPickerModal'
import ConfirmModal from './components/ConfirmModal'
import AttendeeFormModal from './components/AttendeeFormModal'
import SideBookingDrawer from './components/SideBookingDrawer'
import ProcessingOverlay from './components/ProcessingOverlay'
import DoneModal from './components/DoneModal'

function generateMongoId() {
  const timestamp = Math.floor(Date.now() / 1000).toString(16).padStart(8, '0')
  const randomBytes = Array.from(crypto.getRandomValues(new Uint8Array(8)))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
  return (timestamp + randomBytes).toLowerCase()
}

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

  // 1. Validate encrypted URL token with backend
  useEffect(() => {
    async function init() {
      const p = new URLSearchParams(window.location.search)
      const encryptedData = p.get('data') || p.get('p')

      if (!encryptedData) {
        setAuthError('invalid')
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
            allowedTypes: res.allowedTypes || ['normal', 'vip'],
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
        console.error('Backend token validation failed:', err)
        setAuthError('invalid')
        setAuthLoading(false)
      }

      console.log(parsed, "parsed")
      // Build paramData from decrypted fields
      const Number_of_ticket = parseInt(parsed.Number_of_ticket, 10)
      const isCorporate = !isNaN(Number_of_ticket) && Number_of_ticket > 0
      // console.log(parsed , " parseddd")
      setParamData({
        flow: isCorporate ? 'corporate' : 'individual',
        allowedSeats: isCorporate ? Number_of_ticket : 1,
        allowedTypes: ['normal', 'vip'],
        phone_number: parsed.phone_number,
        Email_Address: parsed.Email_Address || null,
        flow_token: parsed.flow_token || null,
        Company_Name: parsed.Company_Name || null,
        Full_Name: parsed.Full_Name || null,
        Designation: parsed.Designation || null,
        CNIC_Number: parsed.CNIC_Number || null,
        Image: parsed.Image || null,
        seats_api_url: parsed.seats_api_url || null,
        _token: encryptedData,
      })
      setAuthLoading(false)
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
    try {
      // Validate token before booking
      setProcessStep('Verifying your invitation...')
      const { exists } = await checkToken(paramData._token)
      if (exists) {
        setProcessStep('Error: This booking link has already been used.')
        return
      }
      await saveToken(paramData._token, paramData.phone_number)

      if (paramData.flow === 'individual') {
        const seatNumber = `${allSelections[0].tableId}-${allSelections[0].chair}`




        setProcessStep('Reserving your seat...')
        const { booking } = await bookSeats({
          seatNumber: seatNumber,
          phone: paramData.phone_number,
          designation: paramData.Designation,
          companyName: paramData.Company_Name,
          cnic: paramData.CNIC_Number,
          type: "Individual",
          name: paramData.Full_Name,
          flow_token: paramData.flow_token,
          image: paramData.Image
        })

        // create profile url
        // const profile_Url = window.location.origin + "/Profile/" + booking;
        const profile_Url = "https://effie.convexinteractive.com" + "/Profile/" + booking;


        // create qr of Profile URL for Lanyard
        const LanyardQrUrl = await QRCode.toDataURL(profile_Url, { width: 512, margin: 2 })
        const qrBlob = await (await fetch(LanyardQrUrl)).blob()
        const { url: lanyardQrUrl } = await uploadFile(qrBlob, `lanyard-qr-${booking}.png`)

        // 3. Generate lanyard pass
        setProcessStep(`Generating pass ${i + 1} of ${total}...`)
        const { blob } = await generateLanyard({
          name: attendee.name,
          companyName: attendee.companyName,
          seatNumber: attendee.seatNumber,
          lanyardQrUrl,
          image: paramData.Image,
        })

        const { url: lanyardUrl } = await uploadFile(blob, `lanyard-${paramData.phone_number}.png`)
        setLanyardUrl(lanyardUrl)


        setProcessStep('Sending your pass via WhatsApp...')

        try {
          await sendLanyardWhatsapp({ contactNumber: paramData.phone_number, lanyardUrl })
        } catch (whatsappErr) {
          console.error('WhatsApp send failed:', whatsappErr)
          setWhatsappError('WhatsApp delivery failed. Please download your pass below.')
        }
        setDone(true)

      }



      else {
        const bookings = allSelections.map(s => ({
          seatNumber: `${s.tableId}-${s.chair}`,
          seatStatus: true,
        }))

        setProcessStep('Reserving seats block...')
        const { key } = await bookCorporate({
          bookings,
          phone_number: paramData.phone_number,
          flow_token: paramData.flow_token,
          Company_Name: paramData.Company_Name,
          Full_Name: paramData.Full_Name,
          Email_Address: paramData.Email_Address,
          Designation: paramData.Designation,
        })

        // const formLink = `${window.location.origin}/form/${key}`
        const formLink = `https://effie.convexinteractive.com/form/${key}`

        setProcessStep('Generating QR code...')
        const qrDataUrl = await QRCode.toDataURL(formLink, { width: 512, margin: 5 })
        const qrBlob = await (await fetch(qrDataUrl)).blob()
        const { url: qrUrl } = await uploadFile(qrBlob, `qr-${key}.png`)

        setProcessStep('Sending form link via WhatsApp...')

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
          onClose={() => setDone(false)}
        />
      )}


    </div>
  )
}
