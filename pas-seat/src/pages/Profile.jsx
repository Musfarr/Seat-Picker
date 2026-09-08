import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { getBookingData } from '../api'
import '../App.css'

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