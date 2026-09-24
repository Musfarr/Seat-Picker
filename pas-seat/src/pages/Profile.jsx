import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { getBookingData } from '../api'
import { breakoutSessions } from '../data/breakoutSessions'
import '../App.css'

function extractBreakoutSessions(booking) {
  if (!booking) return []

  // Case 1: Structured array in booking.breakoutSessions
  if (Array.isArray(booking.breakoutSessions) && booking.breakoutSessions.length > 0) {
    return booking.breakoutSessions
      .map((s, idx) => ({
        slotTitle: s.slotTitle || s.slot || `Slot ${idx + 1}`,
        time: s.time || '',
        topicTitle: s.title || s.topicTitle || '',
        speaker: s.speaker || '',
        designation: s.designation || '',
        venue: s.venue || 'Imperial Ballroom A',
        description: s.description || '',
      }))
      .filter(s => Boolean(s.topicTitle))
  }

  // Case 2: Array of topic IDs in booking.breakoutTopics
  if (Array.isArray(booking.breakoutTopics) && booking.breakoutTopics.length > 0) {
    const list = []
    breakoutSessions.forEach(session => {
      const topic = session.topics.find(t => booking.breakoutTopics.includes(t.id))
      if (topic) {
        list.push({
          slotTitle: session.title,
          time: session.time,
          topicTitle: topic.title,
          speaker: topic.speaker,
          designation: topic.designation || '',
          venue: topic.venue || 'Imperial Ballroom A',
          description: topic.description,
        })
      }
    })
    if (list.length > 0) return list
  }

  // Case 3: Flat fields session1, session2, session3
  const list = []
  if (booking.session1) {
    const s1 = breakoutSessions.find(s => s.id === 'session-1')
    const match1 = s1?.topics.find(t => t.title?.toLowerCase() === booking.session1?.toLowerCase())
    list.push({
      slotTitle: s1?.title || 'Track 1',
      time: s1?.time || '9:30 AM – 10:30 AM',
      topicTitle: booking.session1,
      speaker: booking.session1Speaker || match1?.speaker || '',
      designation: booking.session1Designation || match1?.designation || '',
      venue: booking.session1Venue || match1?.venue || 'Imperial Ballroom A',
      description: match1?.description || '',
    })
  }

  if (booking.session2) {
    const s2 = breakoutSessions.find(s => s.id === 'session-2')
    const match2 = s2?.topics.find(t => t.title?.toLowerCase() === booking.session2?.toLowerCase())
    list.push({
      slotTitle: s2?.title || 'Track 2',
      time: s2?.time || '10:45 AM – 11:45 AM',
      topicTitle: booking.session2,
      speaker: booking.session2Speaker || match2?.speaker || '',
      designation: booking.session2Designation || match2?.designation || '',
      venue: booking.session2Venue || match2?.venue || 'Imperial Ballroom A',
      description: match2?.description || '',
    })
  }

  if (booking.session3) {
    const s3 = breakoutSessions.find(s => s.id === 'session-3')
    const match3 = s3?.topics.find(t => t.title?.toLowerCase() === booking.session3?.toLowerCase())
    list.push({
      slotTitle: s3?.title || 'Track 3',
      time: s3?.time || '12:00 PM – 1:00 PM',
      topicTitle: booking.session3,
      speaker: booking.session3Speaker || match3?.speaker || '',
      designation: booking.session3Designation || match3?.designation || '',
      venue: booking.session3Venue || match3?.venue || 'Imperial Ballroom A',
      description: match3?.description || '',
    })
  }

  return list
}

export default function Profile() {
  const { id } = useParams()
  const [booking, setBooking] = useState(null)
  const [loading, setLoading] = useState(Boolean(id))
  const [error, setError] = useState(id ? '' : 'No pass ID provided')

  useEffect(() => {
    if (!id) return

    let isMounted = true

    async function fetchProfile() {
      try {
        const res = await getBookingData(id)
        if (!isMounted) return

        let data = res?.data?.data || res?.data?.booking || res?.data || res?.booking || res
        if (Array.isArray(data) && data.length > 0) {
          data = data[0]
        }

        if (data && typeof data === 'object' && (data._id || data.name || data.phone || data.corporateId)) {
          setBooking(data)
        } else {
          setError('No pass record found for this QR code')
        }
      } catch (err) {
        if (!isMounted) return
        console.error('Failed to load booking:', err)
        setError(err?.response?.data?.message || err.message || 'Failed to load booking details')
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    fetchProfile()

    return () => {
      isMounted = false
    }
  }, [id])

  if (loading) {
    return (
      <div className="profile-page">
        <div className="profile-header" style={{ marginBottom: '1.5rem' }}>
          <img src="/logo.png" alt="PAS Logo" className="profile-logo" />
        </div>
        <div className="corp-card" style={{ textAlign: 'center', padding: '3rem 2rem' }}>
          <div className="corp-spinner" style={{ margin: '0 auto 1rem' }} />
          <h2 className="corp-title" style={{ fontSize: '1.2rem' }}>Verifying Attendee Pass...</h2>
          <p className="corp-subtitle" style={{ margin: 0 }}>Scanning registration record</p>
        </div>
      </div>
    )
  }

  if (error || !booking) {
    return (
      <div className="profile-page">
        <div className="profile-container">
          <div className="profile-header">
            <img src="/logo.png" alt="PAS Logo" className="profile-logo" />
            <h1 className="profile-event-title">MADSEMBLE 2026</h1>
            <p className="profile-event-sub">PAS Marketing Summit</p>
          </div>

          <div className="profile-card" style={{ textAlign: 'center', marginTop: '1rem' }}>
            <div className="corp-exhausted-icon" style={{ margin: '0 auto 1rem' }}>✕</div>
            <h2 className="corp-title" style={{ color: '#ff6b9d' }}>Pass Not Found</h2>
            <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.9rem', marginTop: '0.5rem', lineHeight: 1.6 }}>
              {error || 'No booking record found for this QR code.'}
            </p>
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.8rem', marginTop: '1.25rem' }}>
              Please check the QR code or verify with the Madsemble event desk.
            </p>
          </div>
        </div>
      </div>
    )
  }

  const formattedDate = booking.createdAt
    ? new Date(booking.createdAt).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
    : null

  const passTypeLabel = booking.type
    ? `${booking.type.toUpperCase()} DELEGATE`
    : 'OFFICIAL DELEGATE'

  const confirmedBreakouts = extractBreakoutSessions(booking)

  return (
    <div className="profile-page">
      <div className="profile-container">
        {/* Header */}
        <div className="profile-header">
          <img src="/logo.png" alt="PAS Logo" className="profile-logo" />
          <h1 className="profile-event-title">MADSEMBLE 2026</h1>
          {/* <p className="profile-event-sub">PAS Marketing Summit • Presented by EBM</p> */}
        </div>

        {/* Main Pass Card */}
        <div className="profile-card">
          {/* Active Verified Badge */}
          <div className="profile-status-badge">
            <span className="profile-status-dot" />
            VERIFIED DIGITAL PASS
          </div>

          {/* Profile Photo */}
          <div className="profile-avatar-wrap">
            {booking.image ? (
              <img
                src={booking.image}
                alt={booking.name || 'Attendee'}
                className="profile-avatar"
              />
            ) : (
              <div className="profile-avatar-placeholder">
                {(booking.name || 'A').charAt(0).toUpperCase()}
              </div>
            )}
          </div>

          {/* Attendee Name */}
          <h2 className="profile-name">
            {booking.name || 'ATTENDEE'}
          </h2>

          {/* Designation */}
          {booking.designation && (
            <p className="profile-designation">
              {booking.designation}
            </p>
          )}

          {/* Company */}
          {booking.companyName && (
            <p className="profile-company">
              {booking.companyName}
            </p>
          )}

          {/* Pass Type Badge */}
          {/* <div className="profile-type-tag">
            {passTypeLabel}
          </div> */}

          {/* Details Grid */}
          <div className="profile-grid">
            {/* Seat Number or Access */}
            {/* <div className={`profile-grid-item ${booking.seatNumber ? 'profile-grid-highlight' : ''}`}>
              <span className="profile-item-label">
                {booking.seatNumber ? 'Seat Number' : 'Access Level'}
              </span>
              <span className={`profile-item-val ${booking.seatNumber ? 'profile-item-val-highlight' : ''}`}>
                {booking.seatNumber || 'All Access Pass'}
              </span>
            </div> */}

            {/* Company Name */}
            {booking.companyName && (
              <div className="profile-grid-item">
                <span className="profile-item-label">Organization</span>
                <span className="profile-item-val">{booking.companyName}</span>
              </div>
            )}

            {/* Phone */}
            {booking.phone && (
              <div className="profile-grid-item">
                <span className="profile-item-label">Contact</span>
                <span className="profile-item-val">{booking.phone}</span>
              </div>
            )}

            {/* CNIC */}
            {/* {booking.cnic && (
              <div className="profile-grid-item">
                <span className="profile-item-label">CNIC / ID</span>
                <span className="profile-item-val">{booking.cnic}</span>
              </div>
            )} */}

            {/* Pass ID */}
            {/* {booking._id && (
              <div className="profile-grid-item">
                <span className="profile-item-label">Pass Ref #</span>
                <span className="profile-item-val" style={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>
                  {String(booking._id).slice(-8).toUpperCase()}
                </span>
              </div>
            )} */}

            {/* Registration Date */}
            {formattedDate && (
              <div className="profile-grid-item">
                <span className="profile-item-label">Issued On</span>
                <span className="profile-item-val">{formattedDate}</span>
              </div>
            )}
          </div>

          {/* Confirmed Breakout Sessions */}
          {confirmedBreakouts.length > 0 && (
            <div className="profile-breakout-section">
              <div className="profile-breakout-badge">
                <span className="profile-breakout-dot" />
                CONFIRMED BREAKOUT SESSIONS
              </div>

              <div className="profile-breakout-list">
                {confirmedBreakouts.map((session, idx) => (
                  <div key={idx} className="profile-breakout-card">
                    <div className="profile-breakout-card-header">
                      <span className="profile-breakout-slot-badge">
                        {session.slotTitle ? session.slotTitle.split(':')[0] : `Slot ${idx + 1}`}
                      </span>
                      {session.time && (
                        <span className="profile-breakout-time-tag">
                          {session.time}
                        </span>
                      )}
                    </div>

                    <h4 className="profile-breakout-topic-title">
                      {session.topicTitle}
                    </h4>

                    <div className="profile-breakout-details">
                      {session.speaker && (
                        <div className="profile-breakout-detail-row">
                          <span className="profile-breakout-detail-label">Speaker</span>
                          <span className="profile-breakout-detail-val profile-breakout-speaker-val">
                            <span className="profile-breakout-speaker-name">{session.speaker}</span>
                            {session.designation && (
                              <span className="profile-breakout-speaker-desig">{session.designation}</span>
                            )}
                          </span>
                        </div>
                      )}
                      {session.venue && (
                        <div className="profile-breakout-detail-row">
                          <span className="profile-breakout-detail-label">Room</span>
                          <span className="profile-breakout-detail-val">
                            {session.venue}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Lanyard Download Action */}
          {booking.lanyardUrl && (
            <div className="profile-lanyard-action">
              <a
                href={booking.lanyardUrl}
                target="_blank"
                rel="noreferrer"
                download="madsemble-pass.png"
                className="profile-pass-btn"
              >
                📥 View / Download Lanyard Pass
              </a>
            </div>
          )}
        </div>

        {/* Event Details Footer */}
        <div className="profile-footer">
          <p style={{ margin: 0, fontWeight: 700 }}>THE MADNESS AWAITS</p>
          <p style={{ margin: '0.25rem 0' }}>
            <strong>7TH &amp; 8TH OCTOBER 2026</strong> • THE NISHAT HOTEL, LAHORE
          </p>
          {/* <p style={{ margin: 0, fontSize: '0.7rem', color: 'rgba(255,255,255,0.35)' }}>
            Pakistan Advertisers Society • Official Event Verification
          </p> */}
        </div>
      </div>
    </div>
  )
}