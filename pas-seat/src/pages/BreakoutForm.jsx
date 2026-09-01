import { useState } from 'react'
import QRCode from 'qrcode'
import { updateBooking, createBooking, uploadFile, sendLanyardWhatsapp, sendLanyardWhatsapp2 } from '../api'
import { generateBreakoutLanyard } from '../generateBreakoutLanyard'
import { breakoutSessions } from '../data/breakoutSessions'

export default function BreakoutForm({ userData = {} }) {
  const {
    name = 'Attendee',
    phone = '',
    companyName = '',
    bookingId = '',
  } = userData

  const [selectedTopics, setSelectedTopics] = useState({
    'session-1': null,
    'session-2': null,
    'session-3': null,
  })
  const [sessionErrors, setSessionErrors] = useState({})
  const [step, setStep] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)
  const [lanyardUrl, setLanyardUrl] = useState(null)
  const [error, setError] = useState('')

  function pickTopic(sessionId, topicId) {
    setSelectedTopics(prev => ({ ...prev, [sessionId]: topicId }))
    if (sessionErrors[sessionId]) {
      setSessionErrors(prev => ({ ...prev, [sessionId]: '' }))
    }
  }

  function validate() {
    const errs = {}
    breakoutSessions.forEach(s => {
      if (!selectedTopics[s.id]) errs[s.id] = `Please select a topic from ${s.title}`
    })
    return errs
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    const errs = validate()
    if (Object.keys(errs).length > 0) {
      setSessionErrors(errs)
      return
    }

    setSubmitting(true)
    try {
      // Resolve selected topic objects
      const sel = {}
      breakoutSessions.forEach(s => {
        const topic = s.topics.find(t => t.id === selectedTopics[s.id])
        sel[s.id] = topic
      })

      const session1 = sel['session-1']
      const session2 = sel['session-2']
      const session3 = sel['session-3']

      const sessionPayload = {
        session1: session1?.title,
        session1Speaker: session1?.speaker,
        session2: session2?.title,
        session2Speaker: session2?.speaker,
        session3: session3?.title,
        session3Speaker: session3?.speaker,
        breakoutRegistered: true,
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

      // 6. Send pass via WhatsApp to the attendee's phone
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
        <p className="bo-section-sub">Choose one topic from each session below</p>
      </div>

      {/* Session pickers */}
      {breakoutSessions.map(session => {
        const sessionKey = session.id
        const selected = selectedTopics[sessionKey]
        const hasErr = sessionErrors[sessionKey]

        return (
          <div key={sessionKey} className={`bo-session${hasErr ? ' bo-session--err' : ''}`}>
            <div className="bo-session-header">
              <h3 className="bo-session-title">{session.title}</h3>
              <span className="bo-session-time">{session.time}</span>
            </div>

            <div className="bo-topics">
              {session.topics.map(topic => {
                const isSelected = selected === topic.id
                const isDimmed = selected && selected !== topic.id

                return (
                  <label
                    key={topic.id}
                    className={`bo-topic${isSelected ? ' bo-topic--active' : ''}${isDimmed ? ' bo-topic--dim' : ''}`}
                    onClick={() => pickTopic(sessionKey, topic.id)}
                  >
                    <input
                      type="radio"
                      name={sessionKey}
                      value={topic.id}
                      checked={isSelected}
                      onChange={() => pickTopic(sessionKey, topic.id)}
                      className="bo-topic-radio"
                    />
                    <div className="bo-topic-body">
                      <div className="bo-topic-title">{topic.title}</div>
                      <div className="bo-topic-speaker">
                        <span className="bo-topic-speaker-label">Speaker: </span>
                        {topic.speaker}
                      </div>
                      <div className="bo-topic-desc">{topic.description}</div>
                    </div>
                    {isSelected && <div className="bo-topic-check">✓</div>}
                  </label>
                )
              })}
            </div>

            {hasErr && <p className="bo-session-error">{hasErr}</p>}
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
