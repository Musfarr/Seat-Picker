import { useState } from 'react'
import QRCode from 'qrcode'
import { uploadFile, sendCompanyBroadcast } from '../api'
import { encryptParams } from '../utils/Encrypt'

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
  transition: 'border-color 0.2s',
}

const LABEL_STYLE = {
  color: 'rgba(255,255,255,0.7)',
  fontSize: '0.78rem',
  fontWeight: 600,
  letterSpacing: '0.04em',
  display: 'block',
  marginBottom: 6,
}

function cleanPhoneNumber(phone) {
  let cleaned = String(phone || '').replace(/[\s\-+]/g, '')
  if (cleaned.startsWith('03')) {
    cleaned = '92' + cleaned.slice(1)
  }
  return cleaned
}

export default function CompanyBroadcast() {
  const [form, setForm] = useState({
    companyName: '',
    numberOfTickets: '',
    contactNumber: '',
    pocName: '',
  })

  const [errors, setErrors] = useState({})
  const [processing, setProcessing] = useState(false)
  const [step, setStep] = useState('')
  const [doneData, setDoneData] = useState(null)
  const [copied, setCopied] = useState(false)

  const handleChange = (field, val) => {
    setForm(prev => ({ ...prev, [field]: val }))
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  const validate = () => {
    const errs = {}
    if (!form.companyName.trim()) errs.companyName = 'Company name is required'

    const ticketsNum = parseInt(form.numberOfTickets, 10)
    if (!form.numberOfTickets || isNaN(ticketsNum) || ticketsNum < 1) {
      errs.numberOfTickets = 'Enter a valid number of tickets (min 1)'
    }

    const cleanedPhone = cleanPhoneNumber(form.contactNumber)
    if (!cleanedPhone) {
      errs.contactNumber = 'Contact number is required'
    } else if (!/^92\d{10}$/.test(cleanedPhone)) {
      errs.contactNumber = 'Phone must be in format 923XXXXXXXXX or 03XXXXXXXXX'
    }

    if (!form.pocName.trim()) errs.pocName = 'POC name is required'

    return errs
  }

  const handleSubmit = async (e) => {
    if (e) e.preventDefault()
    const errs = validate()
    setErrors(errs)
    if (Object.keys(errs).length > 0) return

    setProcessing(true)
    setStep('Encrypting POC details...')
    setDoneData(null)

    try {
      const ticketsCount = parseInt(form.numberOfTickets, 10)
      const phoneClean = cleanPhoneNumber(form.contactNumber)

      // 1. Encrypt parameters in exact expected format
      const payload = {
        Company_Name: form.companyName.trim(),
        Number_of_ticket: ticketsCount,
        phone_number: phoneClean,
        Full_Name: form.pocName.trim(),
      }

      const encrypted = await encryptParams(payload)
      const generatedLink = `${window.location.origin}/form?data=${encrypted}`

      // 2. Generate QR code of the link
      setStep('Generating QR code...')
      const qrDataUrl = await QRCode.toDataURL(generatedLink, {
        width: 600,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#ffffff',
        },
      })

      // 3. Upload QR image
      setStep('Uploading QR image...')
      const qrBlob = await (await fetch(qrDataUrl)).blob()
      const { url: qrImageUrl } = await uploadFile(
        qrBlob,
        `qr-company-${form.companyName.toLowerCase().replace(/[^a-z0-9]/g, '_')}-${Date.now()}.png`
      )

      // 4. Send WhatsApp Broadcast
      setStep('Sending WhatsApp broadcast...')
      await sendCompanyBroadcast({
        contactNumber: phoneClean,
        name: form.pocName.trim(),
        link: generatedLink,
        qrImageUrl,
      })

      setDoneData({
        companyName: form.companyName.trim(),
        numberOfTickets: ticketsCount,
        contactNumber: phoneClean,
        pocName: form.pocName.trim(),
        link: generatedLink,
        qrImageUrl,
        qrPreviewUrl: qrDataUrl,
      })

      setStep('')
    } catch (err) {
      console.error('Company broadcast error:', err)
      setStep('Error: ' + (err?.response?.data?.message || err.message || 'Something went wrong'))
    } finally {
      setProcessing(false)
    }
  }

  const handleCopyLink = () => {
    if (!doneData?.link) return
    navigator.clipboard.writeText(doneData.link)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleReset = () => {
    setDoneData(null)
    setForm({
      companyName: '',
      numberOfTickets: '',
      contactNumber: '',
      pocName: '',
    })
    setErrors({})
    setStep('')
  }

  return (
    <div
      className="app-bg"
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem 1rem',
        boxSizing: 'border-box',
      }}
    >
      <div style={{ width: '100%', maxWidth: 500 }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          {/* <div
            style={{
              display: 'inline-block',
              background: 'rgba(254, 216, 0, 0.1)',
              border: '1px solid rgba(254, 216, 0, 0.3)',
              color: '#FED800',
              fontSize: '0.7rem',
              fontWeight: 700,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              padding: '4px 10px',
              borderRadius: 20,
              marginBottom: 10,
            }}
          >
            🔒 Internal Management Only
          </div> */}
          {/* <h1 className="venue-title" style={{ marginBottom: 6, fontSize: '1.5rem' }}>
            Company POC Broadcast
          </h1> */}
          {/* <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.84rem', margin: 0 }}>
            Generate encrypted corporate booking link and dispatch WhatsApp broadcast
          </p> */}
        </div>

        {/* Card Content */}
        <div
          className="confirm-content"
          style={{
            padding: '1.75rem',
            display: 'flex',
            flexDirection: 'column',
            gap: 16,
            background: 'rgba(15, 23, 42, 0.85)',
            backdropFilter: 'blur(12px)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: 14,
            boxShadow: '0 20px 40px rgba(0, 0, 0, 0.5)',
          }}
        >
          {!doneData ? (
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {/* Company Name */}
              <div>
                <label style={LABEL_STYLE}>
                  COMPANY NAME <span style={{ color: '#fca5a5' }}>*</span>
                </label>
                <input
                  type="text"
                  value={form.companyName}
                  onChange={e => handleChange('companyName', e.target.value)}
                  placeholder="e.g. Unilever / Nestle"
                  disabled={processing}
                  style={{
                    ...INPUT_STYLE,
                    borderColor: errors.companyName ? '#fca5a5' : '#1e293b',
                  }}
                />
                {errors.companyName && (
                  <span style={{ color: '#fca5a5', fontSize: '0.74rem', marginTop: 4, display: 'block' }}>
                    {errors.companyName}
                  </span>
                )}
              </div>

              {/* Number of Tickets */}
              <div>
                <label style={LABEL_STYLE}>
                  NUMBER OF TICKETS <span style={{ color: '#fca5a5' }}>*</span>
                </label>
                <input
                  type="number"
                  min="1"
                  value={form.numberOfTickets}
                  onChange={e => handleChange('numberOfTickets', e.target.value)}
                  placeholder="e.g. 5"
                  disabled={processing}
                  style={{
                    ...INPUT_STYLE,
                    borderColor: errors.numberOfTickets ? '#fca5a5' : '#1e293b',
                  }}
                />
                {errors.numberOfTickets && (
                  <span style={{ color: '#fca5a5', fontSize: '0.74rem', marginTop: 4, display: 'block' }}>
                    {errors.numberOfTickets}
                  </span>
                )}
              </div>

              {/* Contact Number */}
              <div>
                <label style={LABEL_STYLE}>
                  CONTACT NUMBER (WHATSAPP) <span style={{ color: '#fca5a5' }}>*</span>
                </label>
                <input
                  type="tel"
                  value={form.contactNumber}
                  onChange={e => handleChange('contactNumber', e.target.value)}
                  placeholder="923XXXXXXXXX or 03XXXXXXXXX"
                  disabled={processing}
                  style={{
                    ...INPUT_STYLE,
                    borderColor: errors.contactNumber ? '#fca5a5' : '#1e293b',
                  }}
                />
                {errors.contactNumber && (
                  <span style={{ color: '#fca5a5', fontSize: '0.74rem', marginTop: 4, display: 'block' }}>
                    {errors.contactNumber}
                  </span>
                )}
              </div>

              {/* POC Name */}
              <div>
                <label style={LABEL_STYLE}>
                  POC NAME <span style={{ color: '#fca5a5' }}>*</span>
                </label>
                <input
                  type="text"
                  value={form.pocName}
                  onChange={e => handleChange('pocName', e.target.value)}
                  placeholder="e.g. John Doe"
                  disabled={processing}
                  style={{
                    ...INPUT_STYLE,
                    borderColor: errors.pocName ? '#fca5a5' : '#1e293b',
                  }}
                />
                {errors.pocName && (
                  <span style={{ color: '#fca5a5', fontSize: '0.74rem', marginTop: 4, display: 'block' }}>
                    {errors.pocName}
                  </span>
                )}
              </div>

              {/* Status / Processing */}
              {processing && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '10px 14px',
                    background: 'rgba(255, 255, 255, 0.04)',
                    borderRadius: 8,
                    marginTop: 4,
                  }}
                >
                  <div className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }} />
                  <span style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '0.84rem' }}>{step}</span>
                </div>
              )}

              {/* Error Message */}
              {!processing && step.startsWith('Error') && (
                <div
                  style={{
                    padding: '10px 14px',
                    background: 'rgba(239, 68, 68, 0.1)',
                    border: '1px solid rgba(239, 68, 68, 0.25)',
                    borderRadius: 8,
                    color: '#fca5a5',
                    fontSize: '0.82rem',
                  }}
                >
                  {step.replace('Error: ', '')}
                </div>
              )}

              {/* Submit Button */}
              {!processing && (
                <button
                  type="submit"
                  className="confirm-ok"
                  style={{
                    width: '100%',
                    marginTop: 6,
                    padding: '12px',
                    fontSize: '0.95rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Generate Link &amp; Send Broadcast
                </button>
              )}
            </form>
          ) : (
            /* Result Screen */
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Success Badge */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '12px 14px',
                  background: 'rgba(34, 197, 94, 0.12)',
                  border: '1px solid rgba(34, 197, 94, 0.3)',
                  borderRadius: 10,
                }}
              >
                <span style={{ color: '#4ade80', fontSize: '1.3rem' }}>✓</span>
                <div>
                  <div style={{ color: '#4ade80', fontWeight: 600, fontSize: '0.9rem' }}>
                    Broadcast Sent Successfully!
                  </div>
                  <div style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '0.78rem' }}>
                    Delivered to WhatsApp: +{doneData.contactNumber}
                  </div>
                </div>
              </div>

              {/* Details Summary */}
              <div
                style={{
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid rgba(255, 255, 255, 0.06)',
                  borderRadius: 10,
                  padding: '12px 14px',
                  fontSize: '0.82rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 6,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'rgba(255,255,255,0.5)' }}>Company:</span>
                  <strong style={{ color: '#fff' }}>{doneData.companyName}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'rgba(255,255,255,0.5)' }}>POC Name:</span>
                  <span style={{ color: '#fff' }}>{doneData.pocName}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'rgba(255,255,255,0.5)' }}>Tickets:</span>
                  <span style={{ color: '#FED800', fontWeight: 600 }}>{doneData.numberOfTickets} seats</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'rgba(255,255,255,0.5)' }}>Contact:</span>
                  <span style={{ color: '#fff' }}>{doneData.contactNumber}</span>
                </div>
              </div>

              {/* QR Preview */}
              {doneData.qrPreviewUrl && (
                <div
                  style={{
                    textAlign: 'center',
                    background: '#fff',
                    padding: '12px',
                    borderRadius: 10,
                    width: 'fit-content',
                    margin: '0 auto',
                  }}
                >
                  <img
                    src={doneData.qrPreviewUrl}
                    alt="Generated QR"
                    style={{ width: 140, height: 140, display: 'block' }}
                  />
                  <span style={{ color: '#333', fontSize: '0.7rem', fontWeight: 600, marginTop: 4, display: 'block' }}>
                    Generated QR Code
                  </span>
                </div>
              )}

              {/* Generated Link Box */}
              <div>
                <label style={LABEL_STYLE}>GENERATED ENCRYPTED LINK</label>
                <div
                  style={{
                    background: '#0a0f1d',
                    border: '1px solid #1e293b',
                    borderRadius: 8,
                    padding: '10px 12px',
                    fontSize: '0.78rem',
                    color: '#94a3b8',
                    wordBreak: 'break-all',
                    maxHeight: 70,
                    overflowY: 'auto',
                    fontFamily: 'monospace',
                  }}
                >
                  {doneData.link}
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  type="button"
                  onClick={handleCopyLink}
                  style={{
                    flex: 1,
                    background: copied ? '#15803d' : '#1e293b',
                    color: '#fff',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: 8,
                    padding: '10px',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'background 0.2s',
                  }}
                >
                  {copied ? '✓ Copied!' : '📋 Copy Link'}
                </button>
                <button
                  type="button"
                  onClick={() => window.open(doneData.link, '_blank')}
                  style={{
                    flex: 1,
                    background: 'transparent',
                    color: '#FED800',
                    border: '1px solid rgba(254, 216, 0, 0.4)',
                    borderRadius: 8,
                    padding: '10px',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Open Link ↗
                </button>
              </div>

              {/* Reset to Send Another */}
              <button
                type="button"
                onClick={handleReset}
                className="confirm-ok"
                style={{
                  width: '100%',
                  marginTop: 4,
                  padding: '11px',
                  fontSize: '0.9rem',
                  cursor: 'pointer',
                }}
              >
                + Send Another Broadcast
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
