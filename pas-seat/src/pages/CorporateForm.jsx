import { useState, useEffect } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import QRCode from 'qrcode'
import { createBooking, uploadFile, sendLanyardWhatsapp, checkToken, saveToken } from '../api'
import { generateLanyard } from '../generateLanyard'
import { decryptParams } from '../utils/Decrypt'

const MAX_IMAGE_SIZE_BYTES = 2 * 1024 * 1024

const FIELDS = [
  { name: 'Company_Name', label: 'Company Name', type: 'text', required: true, placeholder: 'Acme Corp' },
  { name: 'Full_Name', label: 'Full Name', type: 'text', required: true, placeholder: 'John Doe' },
  { name: 'CNIC_Number', label: 'CNIC Number', type: 'text', required: true, placeholder: '41323-1393332-4' },
  { name: 'phone_number', label: 'Phone Number', type: 'tel', required: true, placeholder: '923344342234' },
  { name: 'Designation', label: 'Designation', type: 'text', required: true, placeholder: 'Engineer' },
]

function validateForm(form) {
  const errors = {}

  if (!form.Company_Name || form.Company_Name.trim() === '') {
    errors.Company_Name = 'Company Name is required'
  }

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

  if (!form.Designation || form.Designation.trim() === '') {
    errors.Designation = 'Designation is required'
  }

  return errors
}

export default function CorporateForm() {
  const { id: routeCorporateId } = useParams()
  const [searchParams] = useSearchParams()
  const encryptedData = searchParams.get('data')

  const [form, setForm] = useState({
    Full_Name: '',
    CNIC_Number: '',
    phone_number: '',
    Company_Name: '',
    Designation: '',
  })
  const [companyLocked, setCompanyLocked] = useState(false)
  const [tokenStatus, setTokenStatus] = useState(null)
  const [pageLoading, setPageLoading] = useState(true)
  const [pageError, setPageError] = useState('')
  const [isExhausted, setIsExhausted] = useState(false)

  const [imageFile, setImageFile] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [step, setStep] = useState('')
  const [done, setDone] = useState(false)
  const [lanyardUrl, setLanyardUrl] = useState(null)
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})

  // Load and verify encrypted token on mount
  useEffect(() => {
    let isMounted = true

    async function initToken() {
      if (!encryptedData) {
        if (isMounted) {
          setPageError('No booking token provided. Please use the corporate registration link sent to you.')
          setPageLoading(false)
        }
        return
      }

      try {
        // 1. Decrypt token locally
        let decrypted = null
        try {
          decrypted = await decryptParams(encryptedData)
        } catch (decErr) {
          console.error('Decryption failed:', decErr)
          if (isMounted) {
            setPageError('Invalid or corrupted booking link. Please verify your link.')
            setPageLoading(false)
          }
          return
        }

        // 2. Query backend to verify token usage in AuthTokens collection
        let backendStatus = null
        try {
          backendStatus = await checkToken(encryptedData)
        } catch (statusErr) {
          console.warn('Backend check-token warning:', statusErr)
        }

        if (!isMounted) return

        const usedCount = backendStatus?.usedCount || 0
        const totalAllowed =
          backendStatus?.totalAllowed ||
          decrypted?.Number_of_ticket ||
          1
        const remaining = Math.max(0, totalAllowed - usedCount)
        const exhausted = backendStatus?.isExhausted || usedCount >= totalAllowed

        const company = backendStatus?.companyName || decrypted?.Company_Name || ''

        const status = {
          exists: backendStatus?.exists || false,
          usedCount,
          totalAllowed,
          remaining,
          isExhausted: exhausted,
          hasMultipleTickets: totalAllowed > 1,
          companyName: company,
        }

        setTokenStatus(status)

        if (exhausted) {
          setIsExhausted(true)
          setPageLoading(false)
          return
        }

        // Pre-fill form from decrypted data
        setForm({
          Company_Name: company,
          Full_Name: decrypted?.Full_Name || '',
          CNIC_Number: decrypted?.CNIC_Number || '',
          phone_number: decrypted?.phone_number || '',
          Designation: decrypted?.Designation || '',
        })

        if (company) {
          setCompanyLocked(true)
        }

        setPageLoading(false)
      } catch (err) {
        console.error('Token initialization error:', err)
        if (isMounted) {
          setPageError('Unable to load registration link. Please try again.')
          setPageLoading(false)
        }
      }
    }

    initToken()

    return () => {
      isMounted = false
    }
  }, [encryptedData])

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

  function handleBookNext() {
    setDone(false)
    setLanyardUrl(null)
    setImageFile(null)
    setImagePreview(null)
    setError('')
    setFieldErrors({})
    setForm(prev => ({
      Company_Name: prev.Company_Name,
      Full_Name: '',
      CNIC_Number: '',
      phone_number: '',
      Designation: '',
    }))
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

    if (!imageFile) {
      setError('Please upload your photo')
      return
    }

    if (imageFile.size > MAX_IMAGE_SIZE_BYTES) {
      setError('Image size must not exceed 2MB')
      return
    }

    setUploading(true)
    try {
      setStep('Uploading your photo...')
      const { url: imageUrl } = await uploadFile(imageFile, imageFile.name)

      setStep('Saving your booking...')
      const corporateId = routeCorporateId || form.Company_Name

      const bookingRes = await createBooking({
        corporateId,
        phone: form.phone_number,
        image: imageUrl,
        name: form.Full_Name,
        cnic: form.CNIC_Number,
        designation: form.Designation,
        companyName: form.Company_Name,
        type: 'Corporate',
        token: encryptedData,
      })

      const bookingId = bookingRes?.bookingId || bookingRes?.booking || bookingRes?._id || 'corporate'

      // Atomically register/increment ticket token usage in AuthTokens
      if (encryptedData) {
        try {
          const saveRes = await saveToken({
            token: encryptedData,
            companyName: form.Company_Name,
            totalAllowed: tokenStatus?.totalAllowed,
          })
          if (saveRes?.success) {
            setTokenStatus(prev => ({
              ...prev,
              usedCount: saveRes.usedCount,
              totalAllowed: saveRes.totalAllowed,
              remaining: saveRes.remaining,
              isExhausted: saveRes.isExhausted,
            }))
          }
        } catch (tokenErr) {
          console.warn('saveToken warning:', tokenErr)
        }
      }

      // Create profile URL for QR
      const profileUrl = window.location.origin + '/Profile/' + bookingId

      // Generate QR code for profile URL
      setStep('Generating QR code...')
      const lanyardQrDataUrl = await QRCode.toDataURL(profileUrl, { width: 512, margin: 2 })
      const qrBlob = await (await fetch(lanyardQrDataUrl)).blob()
      const { url: lanyardQrUrl } = await uploadFile(qrBlob, `lanyard-qr-${bookingId}.png`)

      setStep('Generating your pass...')
      const { blob } = await generateLanyard({
        name: form.Full_Name,
        imageUrl,
        designation: form.Designation,
        companyName: form.Company_Name,
        lanyardQrUrl,
      })

      setStep('Uploading your pass...')
      const { url: generatedLanyardUrl } = await uploadFile(blob, `lanyard-${form.phone_number}.png`)
      setLanyardUrl(generatedLanyardUrl)

      setStep('Sending your pass via WhatsApp...')
      try {
        await sendLanyardWhatsapp({ contactNumber: form.phone_number, lanyardUrl: generatedLanyardUrl, name: form.Full_Name })
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

  // 1. Loading state
  if (pageLoading) {
    return (
      <div className="corp-page">
        <div className="corp-card" style={{ textAlign: 'center', padding: '3rem 2rem' }}>
          <div className="corp-spinner" style={{ margin: '0 auto 1rem' }} />
          <h2 className="corp-title" style={{ fontSize: '1.2rem' }}>Verifying Registration Link...</h2>
          <p className="corp-subtitle" style={{ margin: 0 }}>Please wait a moment.</p>
        </div>
      </div>
    )
  }

  // 2. Token error / Missing token
  if (pageError) {
    return (
      <div className="corp-page">
        <div className="toplogo">
          <img style={{ width: '120px' }} src="/logo.png" alt="Logo" />
        </div>
        <div className="corp-card" style={{ textAlign: 'center', padding: '2.5rem 2rem' }}>
          <div className="corp-exhausted-icon" style={{ margin: '0 auto 1rem' }}>✕</div>
          <h2 className="corp-title" style={{ color: '#ff6b9d' }}>Registration Link Error</h2>
          <p className="corp-subtitle" style={{ marginTop: '0.5rem', color: 'rgba(255,255,255,0.7)' }}>
            {pageError}
          </p>
        </div>
      </div>
    )
  }

  // 3. Link exhausted / Used up
  if (isExhausted) {
    const isMulti = tokenStatus?.totalAllowed > 1
    return (
      <div className="corp-page">
        <div className="toplogo">
          <img style={{ width: '120px' }} src="/logo.png" alt="Logo" />
        </div>
        <div className="corp-card" style={{ textAlign: 'center', padding: '2.5rem 2rem' }}>
          <div className="corp-exhausted-icon" style={{ margin: '0 auto 1rem' }}>✓</div>
          <h2 className="corp-title">
            {isMulti ? 'All Passes Booked' : 'Link Already Used'}
          </h2>
          <p className="corp-subtitle" style={{ marginTop: '0.75rem', color: 'rgba(255,255,255,0.75)', lineHeight: 1.6 }}>
            {isMulti
              ? `All ${tokenStatus.totalAllowed} passes allocated to ${tokenStatus.companyName || 'your organization'} have already been booked.`
              : 'This registration link has already been used to issue a seat pass.'}
          </p>
          <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)', marginTop: '1rem' }}>
            If you need additional passes, please contact the event organizers.
          </p>
        </div>
      </div>
    )
  }

  // 4. Success / Done view
  if (done) {
    const hasMoreTickets = tokenStatus?.remaining > 0
    return (
      <div className="corp-page">
        <div className="corp-done-card">
          <div className="corp-done-check">✓</div>
          <h2 className="corp-done-title">{error ? 'Booking Confirmed!' : "You're all set!"}</h2>
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

          {tokenStatus?.hasMultipleTickets && (
            <div style={{ fontSize: '0.85rem', color: '#fed800', textAlign: 'center', marginTop: '0.25rem' }}>
              Booked {tokenStatus.usedCount} of {tokenStatus.totalAllowed} tickets
            </div>
          )}

          {lanyardUrl && (
            <div className="corp-lanyard-wrap">
              <img src={lanyardUrl} alt="Your Pass" className="corp-lanyard-img" />
              <a href={lanyardUrl} download="madsemble-pass.png" className="corp-download-btn">
                Download Pass
              </a>
            </div>
          )}

          {/* If there are more tickets to book with this token */}
          {hasMoreTickets && (
            <button
              type="button"
              onClick={handleBookNext}
              className="corp-next-btn"
            >
              Book Next Attendee ({tokenStatus.remaining} remaining) →
            </button>
          )}
        </div>
      </div>
    )
  }

  // 5. Active Registration Form view
  return (
    <div className="corp-page">
      <div className="toplogo">
        <img style={{ width: '120px' }} src="/logo.png" alt="Logo" />
      </div>

      <div className="corp-card">
        <h2 className="corp-title">Complete Your Booking</h2>
        <p className="corp-subtitle">Fill in details to receive your seat pass</p>

        {/* Multi-ticket allocation banner */}
        {tokenStatus?.hasMultipleTickets && (
          <div className="corp-quota-badge">
            <span>
              Attendee <strong>{Math.min(tokenStatus.usedCount + 1, tokenStatus.totalAllowed)}</strong> of <strong>{tokenStatus.totalAllowed}</strong>
            </span>
            <span className="corp-quota-tag">
              {tokenStatus.remaining} Remaining
            </span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="corp-form">
          {/* Photo upload */}
          <div className="corp-photo-row">
            <label className="corp-label">
              PHOTO <span className="corp-required">*</span>
            </label>
            <div className="corp-photo-inner">
              {imagePreview ? (
                <img src={imagePreview} alt="preview" className="corp-photo-ring" />
              ) : (
                <div className="corp-photo-placeholder">👤</div>
              )}
              <label className="corp-choose-btn">
                Choose Photo
                <input type="file" accept="image/*" onChange={handleImage} style={{ display: 'none' }} />
              </label>
            </div>
          </div>

          {/* Text fields */}
          {FIELDS.map(({ name, label, type, required, placeholder }) => {
            const isCompanyField = name === 'Company_Name'
            const isReadOnly = isCompanyField && companyLocked

            return (
              <div key={name} className="corp-field">
                <label htmlFor={name} className="corp-label">
                  {label.toUpperCase()}{required && ' *'}
                  {isReadOnly && ' (LOCKED)'}
                </label>
                <input
                  id={name}
                  name={name}
                  type={type}
                  required={required}
                  placeholder={placeholder}
                  value={form[name]}
                  readOnly={isReadOnly}
                  onChange={handleChange}
                  className={`corp-input${isReadOnly ? ' corp-input-readonly' : ''}${fieldErrors[name] ? ' corp-input--err' : ''}`}
                />
                {fieldErrors[name] && (
                  <span className="corp-field-error">{fieldErrors[name]}</span>
                )}
              </div>
            )
          })}

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
      </div>
    </div>
  )
}

