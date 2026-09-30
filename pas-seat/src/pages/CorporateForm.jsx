import { useState, useEffect } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import QRCode from 'qrcode'
import {
  createBooking,
  uploadFile,
  sendLanyardWhatsapp2,
  checkToken,
  saveToken,
  getAllBookings,
  getBreakoutCapacities,
  updateBooking,
} from '../api'
import { generateLanyard } from '../generateLanyard'
import { decryptParams } from '../utils/Decrypt'
import { breakoutSessions } from '../data/breakoutSessions'

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

  // Breakout sessions state
  const [selectedTopics, setSelectedTopics] = useState({
    'session-1': null,
    'session-2': null,
    'session-3': null,
  })
  const [capacities, setCapacities] = useState({})
  const [bookedSessions, setBookedSessions] = useState([])

  // Load breakout capacities
  useEffect(() => {
    getBreakoutCapacities()
      .then(cap => {
        if (cap && typeof cap === 'object') {
          setCapacities(cap)
        }
      })
      .catch(err => {
        console.warn('Could not load breakout capacities:', err)
      })
  }, [])

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

  // Toggle selection: Clicking selected topic deselects it; clicking another selects it
  function toggleTopic(sessionId, topicId) {
    const cap = capacities[topicId]
    const isSoldOut = cap && (cap.availableSeats ?? 35) <= 0
    if (isSoldOut) return

    setSelectedTopics(prev => {
      const isAlreadySelected = prev[sessionId] === topicId
      return {
        ...prev,
        [sessionId]: isAlreadySelected ? null : topicId,
      }
    })
    setError('')
  }

  function handleBookNext() {
    setDone(false)
    setLanyardUrl(null)
    setImageFile(null)
    setImagePreview(null)
    setError('')
    setFieldErrors({})
    setSelectedTopics({
      'session-1': null,
      'session-2': null,
      'session-3': null,
    })
    setBookedSessions([])
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

    // Check if any selected breakout topic is sold out
    const chosenTopicIds = Object.values(selectedTopics).filter(Boolean)
    for (const tid of chosenTopicIds) {
      const cap = capacities[tid]
      if (cap && (cap.availableSeats ?? 35) <= 0) {
        setError(`"${cap.title || tid}" is fully booked. Please select another topic.`)
        return
      }
    }

    setUploading(true)
    try {
      setStep('Checking phone number...')
      const allBookings = await getAllBookings()
      const cleanPhone = String(form.phone_number || '').trim()
      const isDuplicate = Array.isArray(allBookings) && allBookings.some(b => {
        const bPhone = String(b.phone || b.phone_number || '').trim()
        return bPhone && bPhone === cleanPhone
      })

      if (isDuplicate) {
        setError('This phone number has already been used for a booking. Please use a different phone number.')
        setFieldErrors(prev => ({
          ...prev,
          phone_number: 'This phone number is already registered.',
        }))
        setUploading(false)
        setStep('')
        return
      }

      setStep('Uploading your photo...')
      const { url: imageUrl } = await uploadFile(imageFile, imageFile.name)

      // Map chosen breakout topics
      const session1 = breakoutSessions[0]?.topics.find(t => t.id === selectedTopics['session-1'])
      const session2 = breakoutSessions[1]?.topics.find(t => t.id === selectedTopics['session-2'])
      const session3 = breakoutSessions[2]?.topics.find(t => t.id === selectedTopics['session-3'])
      const activeSessionsList = [session1, session2, session3].filter(Boolean)
      setBookedSessions(activeSessionsList)

      const sessionPayload = {
        session1: session1?.title || null,
        session1Speaker: session1?.speaker || null,
        session1Designation: session1?.designation || null,
        session1Venue: session1?.venue || null,
        session2: session2?.title || null,
        session2Speaker: session2?.speaker || null,
        session2Designation: session2?.designation || null,
        session2Venue: session2?.venue || null,
        session3: session3?.title || null,
        session3Speaker: session3?.speaker || null,
        session3Designation: session3?.designation || null,
        session3Venue: session3?.venue || null,
        breakoutRegistered: chosenTopicIds.length > 0,
        breakoutTopics: chosenTopicIds,
        breakoutSessions: activeSessionsList,
      }

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
        ...sessionPayload,
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

      // Generate unified lanyard with profile info and selected breakout sessions
      setStep('Generating your pass...')
      const { blob } = await generateLanyard({
        name: form.Full_Name,
        imageUrl,
        designation: form.Designation,
        companyName: form.Company_Name,
        lanyardQrUrl,
        sessions: activeSessionsList,
        session1: session1?.title,
        session1Speaker: session1?.speaker,
        session2: session2?.title,
        session2Speaker: session2?.speaker,
        session3: session3?.title,
        session3Speaker: session3?.speaker,
      })

      setStep('Uploading your pass...')
      const { url: generatedLanyardUrl } = await uploadFile(blob, `lanyard-${form.phone_number}.png`)
      setLanyardUrl(generatedLanyardUrl)

      // Persist lanyard URL and breakout session details to the booking record
      if (bookingId && bookingId !== 'corporate') {
        updateBooking(bookingId, { lanyardUrl: generatedLanyardUrl, ...sessionPayload }).catch(() => {})
      }

      setStep('Sending your pass via WhatsApp...')
      try {
        await sendLanyardWhatsapp2({ contactNumber: form.phone_number, lanyardUrl: generatedLanyardUrl })
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
        <div className="corp-card corp-card-sm" style={{ textAlign: 'center', padding: '3rem 2rem' }}>
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
        <div className="corp-card corp-card-sm" style={{ textAlign: 'center', padding: '2.5rem 2rem' }}>
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
        <div className="corp-card corp-card-sm" style={{ textAlign: 'center', padding: '2.5rem 2rem' }}>
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

          {/* Registered Breakout Sessions Summary */}
          {bookedSessions.length > 0 && (
            <div className="corp-breakout-summary">
              <h3 className="corp-breakout-summary-title">Registered Breakout Sessions</h3>
              <div className="corp-breakout-summary-list">
                {bookedSessions.map((s, idx) => (
                  <div key={idx} className="corp-breakout-summary-item">
                    <span className="corp-breakout-summary-bullet">✦</span>
                    <div>
                      <strong>{s.title}</strong>
                      {s.speaker && (
                        <div style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.7)', marginTop: '0.15rem' }}>
                          Speaker: {s.speaker}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
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

  // 5. Active Unified Registration Form view
  return (
    <div className="corp-page">
      <div className="toplogo">
        <img style={{ width: '120px' }} src="/logo.png" alt="Logo" />
      </div>

      <div className="corp-card">
        <h2 className="corp-title">Complete Your Booking</h2>
        <p className="corp-subtitle">Fill in details and select your breakout sessions</p>

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

          {/* ── Breakout Sessions Section (Optional) ── */}
          <div className="bo-section-header" style={{ marginTop: '1.5rem' }}>
            <h2 className="bo-section-title" style={{ fontSize: '1.25rem', color: '#FED800' }}>
              Breakout Sessions <span style={{ fontSize: '0.85rem', fontWeight: 'normal', color: 'rgba(255,255,255,0.6)' }}>(Optional)</span>
            </h2>
            <p className="bo-section-sub">
              Choose up to 1 topic from any session below, or leave unselected to skip.
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', marginTop: '0.5rem' }}>
            {breakoutSessions.map(session => {
              const sessionKey = session.id
              const selected = selectedTopics[sessionKey]

              return (
                <div key={sessionKey} className="bo-session">
                  <div className="bo-session-header">
                    <h3 className="bo-session-title">{session.title}</h3>
                    <span className="bo-session-time">{session.time}</span>
                  </div>

                  <div className="bo-topics">
                    {session.topics.map(topic => {
                      const isSelected = selected === topic.id
                      const isDimmed = selected && selected !== topic.id
                      const topicCap = capacities[topic.id]
                      const seatsLeft = topicCap !== undefined ? (topicCap.availableSeats ?? 35) : 35
                      const isSoldOut = seatsLeft <= 0

                      return (
                        <div
                          key={topic.id}
                          className={`bo-topic${isSelected ? ' bo-topic--active' : ''}${isDimmed ? ' bo-topic--dim' : ''}${isSoldOut ? ' bo-topic--soldout' : ''}`}
                          onClick={() => toggleTopic(sessionKey, topic.id)}
                          role="button"
                          tabIndex={isSoldOut ? -1 : 0}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            readOnly
                            className="bo-topic-radio"
                            style={{ pointerEvents: 'none' }}
                            tabIndex={-1}
                          />
                          <div className="bo-topic-body">
                            <div className="bo-topic-header-row">
                              <div className="bo-topic-title">{topic.title}</div>
                              <span className={`bo-topic-seats${isSoldOut ? ' bo-topic-seats--soldout' : seatsLeft <= 5 ? ' bo-topic-seats--low' : ''}`}>
                                {isSoldOut ? 'Sold Out' : `${seatsLeft} seats left`}
                              </span>
                            </div>
                            <div className="bo-topic-speaker">
                              <span className="bo-topic-speaker-label">Speaker: </span>
                              <span className="bo-topic-speaker-name">{topic.speaker}</span>
                              {topic.designation && (
                                <div className="bo-topic-designation">{topic.designation}</div>
                              )}
                            </div>
                            <div className="bo-topic-desc">{topic.description}</div>
                          </div>
                          {isSelected && <div className="bo-topic-check">✓</div>}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>

          {error && <p className="corp-error">{error}</p>}

          {uploading ? (
            <div className="corp-uploading-row" style={{ marginTop: '1.5rem' }}>
              <div className="corp-spinner" />
              <span className="corp-uploading-text">{step}</span>
            </div>
          ) : (
            <button type="submit" className="corp-submit-btn" style={{ marginTop: '1.5rem' }}>
              Submit &amp; Get My Pass
            </button>
          )}
        </form>
      </div>
    </div>
  )
}
