import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import QRCode from 'qrcode'
import { uploadFile, sendLanyardWhatsapp, checkToken, saveToken } from '../api'
import { generateLanyard } from '../generateLanyard'
import { decryptParams } from '../utils/Decrypt'


const MAX_IMAGE_SIZE_BYTES = 2 * 1024 * 1024

const FIELDS = [
  { name: 'Full_Name',    label: 'Full Name',       type: 'text',  required: true,  placeholder: 'John Doe' },
  { name: 'CNIC_Number',  label: 'CNIC Number',     type: 'text',  required: true,  placeholder: '41323-1393332-4' },
  { name: 'phone_number', label: 'Phone Number',    type: 'tel',   required: true,  placeholder: '923344342234' },
  { name: 'Company_Name', label: 'Company Name',    type: 'text',  required: true,  placeholder: 'Acme Corp' },
  { name: 'Designation',  label: 'Designation',     type: 'text',  required: true,  placeholder: 'Engineer' },
]

function validateForm(form) {
  const errors = {}

  if (!form.Full_Name || form.Full_Name.trim() === '') {
    errors.Full_Name = 'Full Name is required'
  }

  if (!form.CNIC_Number || form.CNIC_Number.trim() === '') {
    errors.CNIC_Number = 'CNIC Number is required'
  } else if (!/^\d{5}-\d{7}-\d{1}$/.test(form.CNIC_Number.trim())) {
    errors.CNIC_Number = 'CNIC format: 41323-1393332-4'
  }

  if (!form.phone_number || form.phone_number.trim() === '') {
    errors.phone_number = 'Phone Number is required'
  } else if (!/^92\d{10}$/.test(form.phone_number.trim())) {
    errors.phone_number = 'Phone must start with 92 and have 12 digits total'
  }

  if (!form.Company_Name || form.Company_Name.trim() === '') {
    errors.Company_Name = 'Company Name is required'
  }

  if (!form.Designation || form.Designation.trim() === '') {
    errors.Designation = 'Designation is required'
  }

  return errors
}

export default function CorporateForm() {
  const { id: token } = useParams()

  


  const [form, setForm] = useState({
    Full_Name: '', CNIC_Number: '', phone_number: '', Company_Name: '', Designation: '',
  })
  const [imageFile, setImageFile] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [step, setStep] = useState('')
  const [done, setDone] = useState(false)
  const [lanyardUrl, setLanyardUrl] = useState(null)
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})
  
  const [usedCount, setUsedCount] = useState(0)
  const [totalAllowed, setTotalAllowed] = useState(1)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {


      const p = new URLSearchParams(window.location.search)
      const encryptedData = p.get('data')
      console.log(encryptedData , " encryp")
      let parsed = await decryptParams(encryptedData)
      console.log(parsed , 'parsed')




      if (!token) {
        setError('No invitation token found.')
        setLoading(false)
        return
      }
      try {
        setStep('Verifying your invitation...')
        const parsed = await decryptParams(token)

        console.log(parsed, " parsed")

        if (!parsed || !parsed.phone_number) {
          setError('Invalid or corrupt invitation link.')
          setLoading(false)
          return
        }

        // Prefill form
        setForm({
          Full_Name: parsed.Full_Name || '',
          CNIC_Number: parsed.CNIC_Number || '',
          phone_number: parsed.phone_number || '',
          Company_Name: parsed.Company_Name || '',
          Designation: parsed.Designation || '',
        })

        if (parsed.Image) {
          setImagePreview(parsed.Image)
        }

        const totalTickets = parseInt(parsed.Number_of_ticket, 10) || 1

        // Check token in DB
        const status = await checkToken(token)

        let currentUsed = status.usedCount || 0
        let currentTotal = status.totalAllowed || totalTickets

        // If not exists in DB, initialize it
        if (!status.exists) {
          const initStatus = await saveToken(token, parsed.phone_number, 0, totalTickets)
          currentUsed = initStatus.usedCount || 0
          currentTotal = initStatus.totalAllowed || totalTickets
        }

        setUsedCount(currentUsed)
        setTotalAllowed(currentTotal)

        if (currentUsed >= currentTotal) {
          setError(`This link is exhausted. All ${currentTotal} of ${currentTotal} pass(es) have been claimed.`)
        }
      } catch (err) {
        console.error('Verifying token failed:', err)
        setError('Invalid or expired booking link.')
      } finally {
        setLoading(false)
        setStep('')
      }
    }
    load()
  }, [token])

  // Periodic token check on render (every 30 seconds)
  useEffect(() => {
    if (!token || loading) return

    const interval = setInterval(async () => {
      try {
        const status = await checkToken(token)
        if (status.exists) {
          setUsedCount(status.usedCount || 0)
          setTotalAllowed(status.totalAllowed || 1)
          
          if ((status.usedCount || 0) >= (status.totalAllowed || 1)) {
            setError(`This link is exhausted. All ${status.totalAllowed || 1} of ${status.totalAllowed || 1} pass(es) have been claimed.`)
          }
        }
      } catch (err) {
        console.error('Periodic token check failed:', err)
      }
    }, 30000) // Check every 30 seconds

    return () => clearInterval(interval)
  }, [token, loading])

  function handleChange(e) {
    const { name } = e.target
    setForm(prev => ({ ...prev, [name]: e.target.value }))
    if (fieldErrors[name]) {
      setFieldErrors(prev => ({ ...prev, [name]: '' }))
    }
  }

  function handleImage(e) {
    const file = e.target.files[0]
    if (!file) return

    if (file.size > MAX_IMAGE_SIZE_BYTES) {
      setImageFile(null)
      setImagePreview(null)
      setError('Image size must not exceed 2MB')
      e.target.value = ''
      return
    }

    setError('')
    setImageFile(file)
    setImagePreview(URL.createObjectURL(file))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setFieldErrors({})

    const errors = validateForm(form)
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors)
      return
    }

    if (usedCount >= totalAllowed) {
      setError(`All ${totalAllowed} pass(es) have already been claimed.`)
      return
    }

    let imageUrl = imagePreview
    if (imageFile) {
      if (imageFile.size > MAX_IMAGE_SIZE_BYTES) {
        setError('Image size must not exceed 2MB')
        return
      }
      setUploading(true)
      setStep('Uploading your photo...')
      const uploadRes = await uploadFile(imageFile, imageFile.name)
      imageUrl = uploadRes.url
    } else if (!imageUrl) {
      setError('Please upload your photo')
      return
    }

    setUploading(true)
    try {
      // Increment and save token count
      const nextUsed = usedCount + 1
      setStep('Saving booking status...')
      await saveToken(token, form.phone_number, nextUsed, totalAllowed)
      setUsedCount(nextUsed)

      // Generate bookingId from timestamp for profile URL
      const bookingId = Date.now().toString()
      const seatNumber = "Corporate"

      // Create profile URL
      const profileUrl = "https://effie.convexinteractive.com/Profile/" + bookingId

      // Generate QR code for profile URL
      setStep('Generating QR code...')
      const lanyardQrDataUrl = await QRCode.toDataURL(profileUrl, { width: 512, margin: 2 })
      const qrBlob = await (await fetch(lanyardQrDataUrl)).blob()
      const { url: lanyardQrUrl } = await uploadFile(qrBlob, `lanyard-qr-${bookingId}.png`)

      setStep('Generating your pass...')
      const { blob } = await generateLanyard({
        name: form.Full_Name,
        cnic: form.CNIC_Number,
        seatNumber,
        imageUrl,
        designation: form.Designation,
        companyName: form.Company_Name,
        lanyardQrUrl,
      })

      setStep('Uploading your pass...')
      const { url: lanyardUrl } = await uploadFile(blob, `lanyard-${form.phone_number}.png`)
      setLanyardUrl(lanyardUrl)

      setStep('Sending your pass via WhatsApp...')
      try {
        await sendLanyardWhatsapp({ contactNumber: form.phone_number, lanyardUrl })
      } catch (whatsappErr) {
        console.error('WhatsApp send failed:', whatsappErr)
        setError('WhatsApp delivery failed. Please download your pass below.')
      }

      setDone(true)
    } catch (err) {
      console.error('Form error:', err)
      setError(err?.response?.data?.message || err.message || 'Something went wrong')
    } finally {
      setUploading(false)
      setStep('')
    }
  }

  if (loading) {
    return (
      <div className="corp-page">
        <div style={{ textAlign: 'center' }}>
          <div className="corp-spinner" style={{ width: 44, height: 44, margin: '0 auto 1rem' }} />
          <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.9rem' }}>{step || 'Verifying your invitation...'}</p>
        </div>
      </div>
    )
  }

  if (done) {
    return (
      <div className="corp-page">
        <div className="corp-done-card">
          <div className="corp-done-check">✓</div>
          <h2 className="corp-done-title">{error ? 'Booking Confirmed!' : 'You\'re all set!'}</h2>
          {error ? (
            <div style={{ marginBottom: '1rem' }}>
              <p className="corp-done-warn">⚠️ {error}</p>
              <p className="corp-done-sub" style={{ marginTop: '0.5rem' }}>
                Your seat has been reserved. Download your pass below.
              </p>
            </div>
          ) : (
            <p className="corp-done-sub">
              Your pass has been sent via WhatsApp to<br />
              <strong>{form.phone_number}</strong>
            </p>
          )}
          {lanyardUrl && (
            <div className="corp-lanyard-wrap">
              <img src={lanyardUrl} alt="Your Pass" className="corp-lanyard-img" />
              <a href={lanyardUrl} download="effie-pass.png" className="corp-download-btn">
                Download Pass
              </a>
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="corp-page">

      <div className='toplogo'>
        <img style = {{ width:'120px'}} src='/logo.png'  />
      </div>

      <div className="corp-card">
        <h2 className="corp-title">Complete Your Booking</h2>
        
        {usedCount >= totalAllowed ? (
          <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>claim-status</div>
            <p className="corp-done-sub">
              All <strong style={{ color: '#edbb3a' }}>{totalAllowed}</strong> of <strong style={{ color: '#edbb3a' }}>{totalAllowed}</strong> ticket pass(es) under this link have been successfully claimed.
            </p>
          </div>
        ) : (
          <>
            <p className="corp-subtitle">Claim Pass {usedCount + 1} of {totalAllowed}</p>

            <form onSubmit={handleSubmit} className="corp-form">

              {/* Photo upload */}
              <div className="corp-photo-row">
                <label className="corp-label">
                  PHOTO <span className="corp-required">*</span>
                </label>
                <div className="corp-photo-inner">
                  {imagePreview
                    ? <img src={imagePreview} alt="preview" className="corp-photo-ring" />
                    : <div className="corp-photo-placeholder">👤</div>
                  }
                  <label className="corp-choose-btn">
                    Choose Photo
                    <input type="file" accept="image/*" onChange={handleImage} style={{ display: 'none' }} />
                  </label>
                </div>
              </div>

              {/* Text fields */}
              {FIELDS.map(({ name, label, type, required, placeholder }) => (
                <div key={name} className="corp-field">
                  <label htmlFor={name} className="corp-label">
                    {label.toUpperCase()}{required && ' *'}
                  </label>
                  <input
                    id={name}
                    name={name}
                    type={type}
                    required={required}
                    placeholder={placeholder}
                    value={form[name]}
                    onChange={handleChange}
                    className={`corp-input${fieldErrors[name] ? ' corp-input--err' : ''}`}
                  />
                  {fieldErrors[name] && (
                    <span className="corp-field-error">{fieldErrors[name]}</span>
                  )}
                </div>
              ))}

              {error && <p className="corp-error">{error}</p>}

              {uploading ? (
                <div className="corp-uploading-row">
                  <div className="corp-spinner" />
                  <span className="corp-uploading-text">{step}</span>
                </div>
              ) : (
                <button type="submit" className="corp-submit-btn">
                  Submit &amp; Get My Pass
                </button>
              )}
            </form>
          </>
        )}
      </div>
    </div>
  )
}
