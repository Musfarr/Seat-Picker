import { useState } from 'react'
import QRCode from 'qrcode'
import { uploadFile, sendLinkWhatsapp } from '../api'

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
  const [url, setUrl] = useState('')
  const [phone, setPhone] = useState('')
  const [processing, setProcessing] = useState(false)
  const [step, setStep] = useState('')
  const [done, setDone] = useState(false)
  const [qrPreview, setQrPreview] = useState(null)
  const [errors, setErrors] = useState({})

  const validate = () => {
    const errs = {}
    if (!url.trim()) errs.url = 'URL is required'
    if (!phone.trim()) errs.phone = 'Phone number is required'
    return errs
  }

  const handleSubmit = async () => {
    const errs = validate()
    setErrors(errs)
    if (Object.keys(errs).length) return

    setProcessing(true)
    setDone(false)
    try {
      setStep('Generating QR code...')
      const qrDataUrl = await QRCode.toDataURL(url.trim(), { width: 512, margin: 5 })
      setQrPreview(qrDataUrl)

      setStep('Uploading QR image...')
      const qrBlob = await (await fetch(qrDataUrl)).blob()
      const { url: qrUrl } = await uploadFile(qrBlob, `qr-manual-${Date.now()}.png`)

      setStep('Sending via WhatsApp...')
      await sendLinkWhatsapp({ contactNumber: phone.trim(), link: url.trim(), qrImageUrl: qrUrl })

      setDone(true)
      setStep('')
    } catch (err) {
      setStep('Error: ' + (err?.response?.data?.message || err.message || 'Something went wrong'))
    } finally {
      setProcessing(false)
    }
  }

  return (
    <div className="app-bg" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem 1rem' }}>
      <div style={{ width: '100%', maxWidth: 460 }}>

        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <h1 className="venue-title" style={{ marginBottom: 6 }}>QR Broadcast</h1>
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.82rem' }}>
            Generate a QR from a URL and send it via WhatsApp broadcast
          </p>
        </div>

        <div className="confirm-content" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: 14 }}>

          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <label style={LABEL_STYLE}>FORM URL <span style={{ color: '#fca5a5' }}>*</span></label>
            <input
              type="url"
              value={url}
              onChange={e => { setUrl(e.target.value); setErrors(p => ({ ...p, url: '' })) }}
              placeholder="https://effie.convexinteractive.com/form/..."
              style={{ ...INPUT_STYLE, border: errors.url ? '1px solid #fca5a5' : INPUT_STYLE.border }}
            />
            {errors.url && <span style={{ color: '#fca5a5', fontSize: '0.75rem', marginTop: 4 }}>{errors.url}</span>}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <label style={LABEL_STYLE}>PHONE NUMBER <span style={{ color: '#fca5a5' }}>*</span></label>
            <input
              type="text"
              value={phone}
              onChange={e => { setPhone(e.target.value); setErrors(p => ({ ...p, phone: '' })) }}
              placeholder="923XXXXXXXXX"
              style={{ ...INPUT_STYLE, border: errors.phone ? '1px solid #fca5a5' : INPUT_STYLE.border }}
            />
            {errors.phone && <span style={{ color: '#fca5a5', fontSize: '0.75rem', marginTop: 4 }}>{errors.phone}</span>}
          </div>

          {qrPreview && (
            <div style={{ textAlign: 'center', padding: '0.75rem', background: 'rgba(255,255,255,0.04)', borderRadius: 10 }}>
              <img src={qrPreview} alt="QR Preview" style={{ width: 140, height: 140 }} />
            </div>
          )}

          {processing ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: 4 }}>
              <div className="spinner" style={{ width: 20, height: 20, borderWidth: 3 }} />
              <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.85rem' }}>{step}</span>
            </div>
          ) : (
            <button className="confirm-ok" style={{ width: '100%', marginTop: 4 }} onClick={handleSubmit}>
              Generate QR &amp; Send
            </button>
          )}

          {!processing && step.startsWith('Error') && (
            <p style={{ color: '#fca5a5', fontSize: '0.82rem', margin: 0 }}>{step.replace('Error: ', '')}</p>
          )}

          {done && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0.75rem 1rem', background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: 8 }}>
              <span style={{ color: '#4ade80', fontSize: '1.1rem' }}>✓</span>
              <span style={{ color: '#4ade80', fontSize: '0.875rem' }}>Sent successfully to {phone}</span>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}
