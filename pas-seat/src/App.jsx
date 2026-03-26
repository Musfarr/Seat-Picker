import { useState, useCallback, useEffect } from 'react'
import './App.css'
import NotFound from './NotFound'
import { generateLanyard } from './generateLanyard'
import QRCode from 'qrcode'
import { sendLanyardWhatsapp, sendLinkWhatsapp, fetchSeatsData, bookSeats, bookCorporate, uploadFile, checkToken, saveToken } from './api'
import { INIT, applySeatsData } from './utils/seatLayout'
import { decryptParams } from './utils/Decrypt'
import VenueFloor from './components/VenueFloor'
import BookingBar from './components/BookingBar'
import ChairPickerModal from './components/ChairPickerModal'
import ConfirmModal from './components/ConfirmModal'
import ProcessingOverlay from './components/ProcessingOverlay'
import DoneModal from './components/DoneModal'

export default function App() {
  const [paramData, setParamData] = useState(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [authError, setAuthError] = useState('')
  const [tables, setTables] = useState(INIT)
  const [seatsLoading, setSeatsLoading] = useState(false)
  const [modalTable, setModalTable] = useState(null)
  const [showConfirm, setShowConfirm] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [processStep, setProcessStep] = useState('')
  const [done, setDone] = useState(false)
  const [lanyardUrl, setLanyardUrl] = useState(null)

  // Decrypt URL param, validate token, then load seats
  useEffect(() => {
    async function init() {
      const p = new URLSearchParams(window.location.search)
      const encryptedData = p.get('data')

      if (!encryptedData) {
        setAuthError('invalid')
        setAuthLoading(false)
        return
      }

      let parsed
      try {
        parsed = await decryptParams(encryptedData)
      } catch {
        setAuthError('invalid')
        setAuthLoading(false)
        return
      }

      if (!parsed?.phone_number) {
        setAuthError('invalid')
        setAuthLoading(false)
        return
      }

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

  useEffect(() => {
    if (!paramData) return
    setSeatsLoading(true)
    fetchSeatsData()
      .then(seatsArray => {
        if (seatsArray) setTables(prev => applySeatsData(prev, seatsArray))
      })
      .catch(err => console.error('Failed to load seat status:', err))
      .finally(() => setSeatsLoading(false))
  }, [paramData])

  const openModal = useCallback((table) => setModalTable(table), [])
  const closeModal = useCallback(() => setModalTable(null), [])

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
    setShowConfirm(false)
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
          type:"Individual",
          name:paramData.Full_Name,
          flow_token: paramData.flow_token,
          image: paramData.Image
        })

        // create profile url
        const profile_Url = window.location.origin + "/Profile/" + booking;


        // create qr of Profile URL for Lanyard
        const LanyardQrUrl = await QRCode.toDataURL(profile_Url, { width: 512, margin: 2 })
        const qrBlob = await (await fetch(LanyardQrUrl)).blob()
        const { url: lanyardQrUrl } = await uploadFile(qrBlob, `lanyard-qr-${booking}.png`)


        setProcessStep('Generating your pass...')
        const { blob } = await generateLanyard({
          name: paramData.Full_Name,
          cnic: paramData.CNIC_Number,
          seatNumber,
          imageUrl: paramData.Image,
          designation: paramData.Designation,
          companyName: paramData.Company_Name,
          lanyardQrUrl,
          image: paramData.Image,
        })

        const { url: lanyardUrl } = await uploadFile(blob, `lanyard-${paramData.phone_number}.png`)
        setLanyardUrl(lanyardUrl)


        setProcessStep('Sending your pass via WhatsApp...')
        await sendLanyardWhatsapp({ contactNumber: paramData.phone_number, lanyardUrl })
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

        const formLink = `${window.location.origin}/form/${key}`

        setProcessStep('Generating QR code...')
        const qrDataUrl = await QRCode.toDataURL(formLink, { width: 512, margin: 5 })
        const qrBlob = await (await fetch(qrDataUrl)).blob()
        const { url: qrUrl } = await uploadFile(qrBlob, `qr-${key}.png`)

        setProcessStep('Sending form link via WhatsApp...')
        await sendLinkWhatsapp({ contactNumber: paramData.phone_number, link: formLink, qrImageUrl: qrUrl })
        setDone(true)
      }
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
            This booking link has already been used. Each invitation can only be used once.
          </p>
        </div>
      </div>
    )
  }

  if (authError || !paramData) return <NotFound />

  return (
    <div className="app-bg">
      <div className="venue-card">

        <div className="venue-header">
          <div className="header-user-row">
            <div>
              <h1 className="venue-title">EFFIE AWARDS</h1>
              {paramData.Full_Name && (
                <p className="venue-sub">
                  Hi <strong>{paramData.Full_Name}</strong> ·{' '}
                  {paramData.flow === 'individual'
                    ? 'Select 1 chair'
                    : `Select up to ${allowedSeats} chairs`}
                </p>
              )}
            </div>
          </div>
          <span className={`counter-pill${atLimit ? ' counter-full' : ''}`}>
            {totalSelected} / {allowedSeats} selected
          </span>
        </div>

        <div className="stage-wrap">
          <div className="stage-bar">
            <span className="stage-text">&#9670; &nbsp; STAGE &nbsp; &#9670;</span>
          </div>
        </div>

        <VenueFloor
          tables={tables}
          allowedTypes={allowedTypes}
          onTableClick={handleTableClick}
        />

        <BookingBar
          totalSelected={totalSelected}
          onClear={clearAll}
          onBook={() => setShowConfirm(true)}
        />
      </div>

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
          onConfirm={confirmBooking}
        />
      )}

      {seatsLoading && <ProcessingOverlay step="Loading available seats..." />}

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
        <DoneModal phone_number={paramData.phone_number} lanyardUrl={lanyardUrl} />
      )}
    </div>
  )
}
