import { useState } from 'react'
import QRCode from 'qrcode'
import { sendLinkWhatsapp } from '../api'
import { encryptParams } from '../utils/Decrypt'

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

export default function QrBroadcast() {
  const [name, setName] = useState('')
  const [noOfSeats, setNoOfSeats] = useState('')
  const [phone, setPhone] = useState('')
  const [processing, setProcessing] = useState(false)
  const [step, setStep] = useState('')
  const [done, setDone] = useState(false)
  const [generatedUrl, setGeneratedUrl] = useState('')
  const [qrPreview, setQrPreview] = useState(null)
  const [copied, setCopied] = useState(false)
  const [errors, setErrors] = useState({})

  const validate = () => {
    const errs = {}
    if (!name.trim()) errs.name = 'Name / Company is required'
    if (!noOfSeats.trim()) {
      errs.noOfSeats = 'Number of seats is required'
    } else if (isNaN(parseInt(noOfSeats.trim(), 10)) || parseInt(noOfSeats.trim(), 10) <= 0) {
      errs.noOfSeats = 'Enter a valid number of seats'
    }
    if (!phone.trim()) {
      errs.phone = 'Phone number is required'
    } else if (!/^92\d{10}$/.test(phone.trim().replace(/\D/g, ''))) {
      errs.phone = 'Format: 923XXXXXXXXX'
    }
    return errs
  }

  const handleSubmit = async () => {
    const errs = validate()
    setErrors(errs)
    if (Object.keys(errs).length) return

    setProcessing(true)
    setDone(false)
    setGeneratedUrl('')
    setQrPreview(null)

    try {
      setStep('Encrypting invitation parameters...')
      const seatsCount = parseInt(noOfSeats.trim(), 10)
      const cleanPhone = phone.trim().replace(/\D/g, '')

      // Create encrypted URL payload in accordance with backend validateToken logic
      const encrypted = await encryptParams({
        allowedSeats: String(seatsCount),
        Company_Name: name.trim(),
        phone_number: cleanPhone,
      })

      const finalUrl = `${window.location.origin}/?data=${encrypted}`
      setGeneratedUrl(finalUrl)

      // Generate QR code preview for convenience
      try {
        const qrDataUrl = await QRCode.toDataURL(finalUrl, { width: 512, margin: 4 })
        setQrPreview(qrDataUrl)
      } catch (_) { }

      // Send WhatsApp broadcast link
      setStep('Sending invite via WhatsApp...')
      await sendLinkWhatsapp({
        contactNumber: cleanPhone,
        numberofseats: String(seatsCount),
        FinalURL: finalUrl,
      })

      setDone(true)
      setStep('')
    } catch (err) {
      setStep('Error: ' + (err?.response?.data?.message || err.message || 'Something went wrong'))
    } finally {
      setProcessing(false)
    }
  }

  const handleReset = () => {
    setName('')
    setNoOfSeats('')
    setPhone('')
    setDone(false)
    setGeneratedUrl('')
    setQrPreview(null)
    setErrors({})
    setStep('')
    setCopied(false)
  }

  const handleCopy = () => {
    if (!generatedUrl) return
    navigator.clipboard.writeText(generatedUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="app-bg" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem 1rem' }}>
      <div style={{ width: '100%', maxWidth: 460 }}>

        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <h1 className="venue-title" style={{ marginBottom: 6 }}>Invitation Broadcast</h1>
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.82rem' }}>
            Generate encrypted seat invitation links and send directly via WhatsApp
          </p>
        </div>

        <div className="confirm-content" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* Name / Company */}
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <label style={LABEL_STYLE}>NAME / COMPANY <span style={{ color: '#fca5a5' }}>*</span></label>
            <input
              type="text"
              value={name}
              onChange={e => { setName(e.target.value); setErrors(p => ({ ...p, name: '' })) }}
              placeholder="e.g. Convex Interactive"
              style={{ ...INPUT_STYLE, border: errors.name ? '1px solid #fca5a5' : INPUT_STYLE.border }}
            />
            {errors.name && <span style={{ color: '#fca5a5', fontSize: '0.75rem', marginTop: 4 }}>{errors.name}</span>}
          </div>

          {/* Number of seats */}
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <label style={LABEL_STYLE}>NUMBER OF SEATS <span style={{ color: '#fca5a5' }}>*</span></label>
            <input
              type="number"
              min="1"
              max="560"
              value={noOfSeats}
              onChange={e => { setNoOfSeats(e.target.value); setErrors(p => ({ ...p, noOfSeats: '' })) }}
              placeholder="e.g. 4"
              style={{ ...INPUT_STYLE, border: errors.noOfSeats ? '1px solid #fca5a5' : INPUT_STYLE.border }}
            />
            {errors.noOfSeats && <span style={{ color: '#fca5a5', fontSize: '0.75rem', marginTop: 4 }}>{errors.noOfSeats}</span>}
          </div>

          {/* Phone number */}
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <label style={LABEL_STYLE}>WHATSAPP PHONE NUMBER <span style={{ color: '#fca5a5' }}>*</span></label>
            <input
              type="text"
              value={phone}
              onChange={e => { setPhone(e.target.value); setErrors(p => ({ ...p, phone: '' })) }}
              placeholder="923XXXXXXXXX"
              style={{ ...INPUT_STYLE, border: errors.phone ? '1px solid #fca5a5' : INPUT_STYLE.border }}
            />
            {errors.phone && <span style={{ color: '#fca5a5', fontSize: '0.75rem', marginTop: 4 }}>{errors.phone}</span>}
          </div>

          {processing ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: 8 }}>
              <div className="spinner" style={{ width: 20, height: 20, borderWidth: 3 }} />
              <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.85rem' }}>{step}</span>
            </div>
          ) : (
            <button className="confirm-ok" style={{ width: '100%', marginTop: 8 }} onClick={handleSubmit}>
              Generate Link &amp; Send
            </button>
          )}

          {!processing && step.startsWith('Error') && (
            <p style={{ color: '#fca5a5', fontSize: '0.82rem', margin: 0 }}>{step.replace('Error: ', '')}</p>
          )}

          {done && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 6 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0.75rem 1rem', background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: 8 }}>
                <span style={{ color: '#4ade80', fontSize: '1.1rem' }}>✓</span>
                <span style={{ color: '#4ade80', fontSize: '0.875rem' }}>
                  Invitation for <strong>{noOfSeats} seat(s)</strong> sent successfully to <strong>{phone}</strong>!
                </span>
              </div>

              {generatedUrl && (
                <div style={{ background: 'rgba(0,0,0,0.35)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '0.75rem', display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.5)', letterSpacing: '0.5px' }}>GENERATED LINK:</span>
                  <input
                    type="text"
                    readOnly
                    value={generatedUrl}
                    style={{ ...INPUT_STYLE, padding: '6px 10px', fontSize: '0.75rem', background: 'rgba(255,255,255,0.05)' }}
                  />
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      type="button"
                      onClick={handleCopy}
                      style={{
                        flex: 1,
                        padding: '6px 12px',
                        borderRadius: 6,
                        border: '1px solid rgba(212,175,55,0.4)',
                        background: 'rgba(212,175,55,0.15)',
                        color: '#ffd700',
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      {copied ? '✓ Copied!' : 'Copy Link'}
                    </button>
                    <a
                      href={generatedUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        padding: '6px 12px',
                        borderRadius: 6,
                        border: '1px solid rgba(255,255,255,0.2)',
                        background: 'rgba(255,255,255,0.08)',
                        color: '#fff',
                        fontSize: '0.78rem',
                        fontWeight: 600,
                        textDecoration: 'none',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      Open Link ↗
                    </a>
                  </div>
                </div>
              )}

              {qrPreview && (
                <div style={{ textAlign: 'center', padding: '0.75rem', background: 'rgba(255,255,255,0.04)', borderRadius: 10 }}>
                  <img src={qrPreview} alt="QR Preview" style={{ width: 130, height: 130, display: 'block', margin: '0 auto' }} />
                </div>
              )}

              <button
                type="button"
                className="confirm-cancel"
                style={{ width: '100%' }}
                onClick={handleReset}
              >
                Send Another Invitation
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}
