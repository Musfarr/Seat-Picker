import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { getBookingData } from '../api'
import '../App.css'

export default function Profile() {
  const { id } = useParams()
  const [booking, setBooking] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!id) return
    setLoading(true)
    getBookingData(id)
      .then(data => {
        if (Array.isArray(data) && data.length > 0) {
          setBooking(data[0])
        } else if (data && !Array.isArray(data)) {
          setBooking(data)
        } else {
          setError('No booking found')
        }
      })
      .catch(err => {
        console.error('Failed to load booking:', err)
        setError(err?.response?.data?.message || err.message || 'Failed to load booking')
      })
      .finally(() => setLoading(false))
  }, [id])

  if (loading) {
    return (
      <div className="app-bg" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="spinner-card">
          <div className="spinner" />
          <p className="spinner-step">Loading profile...</p>
        </div>
      </div>
    )
  }

  if (error || !booking) {
    return (
      <div className="app-bg" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
        <div className="confirm-content" style={{ maxWidth: 400 }}>
          <h2 className="confirm-title" style={{ color: '#fca5a5' }}>Not Found</h2>
          <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.9rem', margin: '1rem 0' }}>
            {error || 'Booking not found'}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="app-bg" style={{ minHeight: '100vh', padding: '2rem 1rem' }}>
      <div style={{ maxWidth: 500, margin: '0 auto' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <h1 style={{ color: 'rgb(254, 242, 194)', fontSize: '1.8rem', fontWeight: 'bold', margin: '0 0 0.5rem' }}>
            EFFIE AWARDS
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.85rem', margin: 0 }}>
            Gala Night 2026
          </p>
        </div>

        {/* Profile Card */}
        <div className="confirm-content" style={{ padding: '2rem' }}>
          {/* Profile Image */}
          {booking.image && (
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.5rem' }}>
              <img 
                src={booking.image} 
                alt={booking.name || 'Profile'} 
                style={{ 
                  width: 120, 
                  height: 120, 
                  borderRadius: '50%', 
                  objectFit: 'cover',
                  border: '3px solid rgb(254, 242, 194)',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
                }} 
              />
            </div>
          )}

          {/* Name */}
          <h2 style={{ 
            color: 'rgb(254, 242, 194)', 
            fontSize: '1.5rem', 
            fontWeight: 'bold', 
            textAlign: 'center',
            margin: '0 0 0.5rem',
            textTransform: 'uppercase'
          }}>
            {booking.name || 'Guest'}
          </h2>

          {/* Designation & Company */}
          {(booking.designation || booking.companyName) && (
            <p style={{ 
              color: 'rgba(255,255,255,0.75)', 
              fontSize: '0.95rem', 
              textAlign: 'center',
              margin: '0 0 2rem'
            }}>
              {[booking.designation, booking.companyName].filter(Boolean).join(', ')}
            </p>
          )}

          {/* Info Grid */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {/* Seat Number */}
            <div style={{ 
              background: 'rgba(254, 242, 194, 0.1)', 
              borderRadius: 8, 
              padding: '1rem',
              border: '1px solid rgba(254, 242, 194, 0.2)'
            }}>
              <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.75rem', margin: '0 0 0.25rem', letterSpacing: '0.05em' }}>
                SEAT NUMBER
              </p>
              <p style={{ color: 'rgb(254, 242, 194)', fontSize: '1.3rem', fontWeight: 'bold', margin: 0 }}>
                {booking.seatNumber || 'N/A'}
              </p>
            </div>

            {/* CNIC */}
            {booking.cnic && (
              <div style={{ 
                background: 'rgba(255,255,255,0.05)', 
                borderRadius: 8, 
                padding: '0.875rem 1rem',
                border: '1px solid rgba(255,255,255,0.1)'
              }}>
                <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.75rem', margin: '0 0 0.25rem', letterSpacing: '0.05em' }}>
                  CNIC NUMBER
                </p>
                <p style={{ color: '#fff', fontSize: '1rem', margin: 0 }}>
                  {booking.cnic}
                </p>
              </div>
            )}

            {/* Phone */}
            {booking.phone && (
              <div style={{ 
                background: 'rgba(255,255,255,0.05)', 
                borderRadius: 8, 
                padding: '0.875rem 1rem',
                border: '1px solid rgba(255,255,255,0.1)'
              }}>
                <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.75rem', margin: '0 0 0.25rem', letterSpacing: '0.05em' }}>
                  PHONE NUMBER
                </p>
                <p style={{ color: '#fff', fontSize: '1rem', margin: 0 }}>
                  {booking.phone}
                </p>
              </div>
            )}

            {/* Type Badge */}
            {booking.type && (
              <div style={{ textAlign: 'center', marginTop: '0.5rem' }}>
                <span style={{
                  display: 'inline-block',
                  background: 'rgba(251,191,36,0.15)',
                  color: 'rgb(251,191,36)',
                  padding: '0.5rem 1.25rem',
                  borderRadius: 20,
                  fontSize: '0.8rem',
                  fontWeight: 'bold',
                  letterSpacing: '0.05em',
                  border: '1px solid rgba(251,191,36,0.3)'
                }}>
                  {booking.type.toUpperCase()}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div style={{ textAlign: 'center', marginTop: '2rem', color: 'rgba(255,255,255,0.3)', fontSize: '0.75rem' }}>
          <p style={{ margin: 0 }}>SATURDAY, 5PM • 25TH APRIL 2026</p>
          <p style={{ margin: '0.25rem 0 0' }}>EXPO CENTER KARACHI</p>
        </div>
      </div>
    </div>
  )
}