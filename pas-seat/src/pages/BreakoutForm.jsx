import { useState, useEffect } from 'react'
import QRCode from 'qrcode'
import {
  updateBooking,
  createBooking,
  uploadFile,
  sendLanyardWhatsapp2,
  getBreakoutCapacities,
  checkBreakoutToken,
  saveBreakoutToken,
} from '../api'
import { generateBreakoutLanyard } from '../generateBreakoutLanyard'
import { breakoutSessions } from '../data/breakoutSessions'

export default function BreakoutForm({ userData = {} }) {
  const {
    name = 'Attendee',
    phone = '',
    companyName = '',
    bookingId = '',
    token = '',
  } = userData

  const [selectedTopics, setSelectedTopics] = useState({
    'session-1': null,
    'session-2': null,
    'session-3': null,
  })
  const [capacities, setCapacities] = useState({})
  const [step, setStep] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)
  const [lanyardUrl, setLanyardUrl] = useState(null)
  const [error, setError] = useState('')

  // Load live capacities from DB
  useEffect(() => {
    let isMounted = true
    getBreakoutCapacities()
      .then(data => {
        if (isMounted && data) {
          setCapacities(data)
        }
      })
      .catch(err => console.error('Failed to load breakout capacities:', err))

    return () => {
      isMounted = false
    }
  }, [])

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

  // Validate: At least 1 session must be selected out of 3
  function validate() {
    const hasAtLeastOne = Object.values(selectedTopics).some(Boolean)
    if (!hasAtLeastOne) {
      return 'Please select at least 1 session topic to continue.'
    }
    return null
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    const valError = validate()
    if (valError) {
      setError(valError)
      return
    }

    const chosenTopicIds = Object.values(selectedTopics).filter(Boolean)

    // Check if any selected topic is sold out
    for (const tid of chosenTopicIds) {
      const cap = capacities[tid]
      if (cap && (cap.availableSeats ?? 35) <= 0) {
        setError(`"${cap.title || tid}" is fully booked. Please select another topic.`)
        return
      }
    }

    setSubmitting(true)
    try {
      // 0. Double-check token if present
      if (token) {
        setStep('Verifying your session link...')
        try {
          const checkRes = await checkBreakoutToken(token)
          if (checkRes?.exists) {
            setError('This session link has already been used. You cannot register again.')
            setSubmitting(false)
            return
          }
        } catch (tokenErr) {
          console.warn('Token check error:', tokenErr)
        }
      }

      // Resolve selected topic objects
      const sel = {}
      breakoutSessions.forEach(s => {
        const topic = s.topics.find(t => t.id === selectedTopics[s.id])
        sel[s.id] = topic || null
      })

      const session1 = sel['session-1']
      const session2 = sel['session-2']
      const session3 = sel['session-3']

      const sessionPayload = {
        session1: session1?.title || null,
        session1Speaker: session1?.speaker || null,
        session2: session2?.title || null,
        session2Speaker: session2?.speaker || null,
        session3: session3?.title || null,
        session3Speaker: session3?.speaker || null,
        breakoutRegistered: true,
        breakoutTopics: chosenTopicIds,
      }

      let activeBookingId = bookingId

      // 1. Update existing booking if bookingId is provided, else create new
      setStep('Saving your sessions...')
      if (activeBookingId) {
        await updateBooking(activeBookingId, sessionPayload)
      } else {
        const bookingRes = await createBooking({
          phone: phone || '923000000000',
          name,
          companyName,
          type: 'Breakout',
          ...sessionPayload,
        })
        activeBookingId = bookingRes?.bookingId || bookingRes?.booking || 'breakout'
      }

      // 2. Generate QR code
      setStep('Generating QR code...')
      const profileUrl = `https://effie.convexinteractive.com/Profile/${activeBookingId}`
      const qrDataUrl = await QRCode.toDataURL(profileUrl, { width: 512, margin: 2 })
      const qrBlob = await (await fetch(qrDataUrl)).blob()
      const { url: lanyardQrUrl } = await uploadFile(qrBlob, `breakout-qr-${activeBookingId}.png`)

      // 3. Generate lanyard pass
      setStep('Generating your pass...')
      const { blob } = await generateBreakoutLanyard({
        name,
        companyName,
        session1: session1?.title,
        session1Speaker: session1?.speaker,
        session2: session2?.title,
        session2Speaker: session2?.speaker,
        session3: session3?.title,
        session3Speaker: session3?.speaker,
        lanyardQrUrl,
      })

      // 4. Upload lanyard pass
      setStep('Uploading your pass...')
      const { url: uploadedLanyardUrl } = await uploadFile(blob, `breakout-${phone || activeBookingId}.png`)
      setLanyardUrl(uploadedLanyardUrl)

      // 5. Update booking with lanyard URL in background
      if (activeBookingId) {
        updateBooking(activeBookingId, { lanyardUrl: uploadedLanyardUrl }).catch(() => { })
      }

      // 6. Save breakout token to database to prevent re-use and decrement DB counts atomically
      if (token) {
        setStep('Finalizing registration...')
        try {
          await saveBreakoutToken({
            token,
            bookingId: activeBookingId,
            phone,
            name,
            selectedTopics: chosenTopicIds,
            lanyardUrl: uploadedLanyardUrl,
          })
        } catch (saveTokErr) {
          console.error('Failed to save breakout token:', saveTokErr)
        }
      }

      // 7. Send pass via WhatsApp to the attendee's phone
      if (phone) {
        setStep('Sending your pass via WhatsApp...')
        try {
          await sendLanyardWhatsapp2({ contactNumber: phone, lanyardUrl: uploadedLanyardUrl })
        } catch (waErr) {
          console.error('WhatsApp send failed:', waErr)
          setError('WhatsApp delivery failed. Please download your pass below.')
        }
      }

      setDone(true)
    } catch (err) {
      console.error('Breakout booking error:', err)
      setError(err?.response?.data?.message || err.message || 'Something went wrong')
    } finally {
      setSubmitting(false)
      setStep('')
    }
  }

  // ── Success screen ──
  if (done) {
    return (
      <div className="bo-done">
        <div className="bo-done-check">✓</div>
        <h2 className="bo-done-title">You're Registered!</h2>
        {error ? (
          <p className="bo-done-warn">⚠️ {error}</p>
        ) : (
          phone && (
            <p className="bo-done-sub">
              Your pass has been sent via WhatsApp to <strong>{phone}</strong>
            </p>
          )
        )}
        <p className="bo-done-sub">
          Your breakout session pass has been generated.
        </p>
        {lanyardUrl && (
          <div className="bo-done-pass">
            <img src={lanyardUrl} alt="Breakout Pass" className="bo-done-img" />
            <a href={lanyardUrl} download="breakout-pass.png" className="bo-done-dl">
              ⬇ Download Pass
            </a>
          </div>
        )}
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="bo-form">
      {/* Attendee banner */}
      <div className="bo-attendee-card">
        <div className="bo-attendee-badge">ATTENDEE</div>
        <div className="bo-attendee-info">
          <span className="bo-attendee-name">{name}</span>
          {companyName && <span className="bo-attendee-company"> • {companyName}</span>}
          {phone && <div className="bo-attendee-phone">{phone}</div>}
        </div>
      </div>

      {/* Section header */}
      <div className="bo-section-header">
        <h2 className="bo-section-title">Select Your Sessions</h2>
        <p className="bo-section-sub">Choose at least 1 session below (pick any topic from 1, 2, or all 3 sessions)</p>
      </div>

      {/* Session pickers */}
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
                        {topic.speaker}
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

      {error && <p className="bo-error">{error}</p>}

      {/* Submit */}
      {submitting ? (
        <div className="bo-loading">
          <div className="bo-spinner" />
          <span className="bo-loading-text">{step}</span>
        </div>
      ) : (
        <button type="submit" className="bo-submit">
          Confirm My Sessions &amp; Get Pass
        </button>
      )}
    </form>
  )
}
