import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { decryptParams } from '../utils/Decrypt'
import BreakoutForm from './BreakoutForm'

export default function BreakoutPage() {
  const [searchParams] = useSearchParams()
  const [userData, setUserData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function loadParams() {
      try {
        const encryptedData = searchParams.get('data')

        if (!encryptedData) {
          // Fallback if accessed directly for testing
          console.warn('No encrypted data in query params, using default demo state.')
          setUserData({
            name: 'Attendee',
            phone: '',
            companyName: '',
            bookingId: '',
          })
          setLoading(false)
          return
        }

        const decrypted = await decryptParams(encryptedData)
        console.log('Decrypted breakout params:', decrypted)

        const normalized = {
          name: decrypted.name || decrypted.Full_Name || 'Attendee',
          phone: decrypted.phone || decrypted.phone_number || '',
          companyName: decrypted.companyName || decrypted.Company_Name || '',
          bookingId: decrypted.bookingId || decrypted._id || decrypted.id || '',
        }

        setUserData(normalized)
      } catch (err) {
        console.error('Decryption error:', err)
        setError('Invalid or expired session link. Please check the link sent to your WhatsApp.')
      } finally {
        setLoading(false)
      }
    }

    loadParams()
  }, [searchParams])

  return (
    <div className="bo-page">
      {/* Logo */}
      <div className="toplogo">
        <img style={{ width: '120px' }} src="/logo.png" alt="Logo" />
      </div>

      {/* Decorative blobs */}
      <div className="bo-blob bo-blob--top" />
      <div className="bo-blob bo-blob--bottom" />

      {/* Header */}
      <header className="bo-header">
        <p className="bo-header-eyebrow">MADsemble 2025</p>
        <h1 className="bo-header-title">
          Book Your <span className="bo-header-highlight">Breakout Sessions</span>
        </h1>
        <p className="bo-header-sub">
          {userData?.name && userData.name !== 'Attendee' ? (
            <>Welcome <strong>{userData.name}</strong>! Select your breakout topics below.</>
          ) : (
            'Choose expert-led sessions on creative strategy, business leadership, and digital transformation.'
          )}
        </p>
      </header>

      {/* Main Card */}
      <section className="bo-section">
        <div className="bo-card">
          {loading ? (
            <div className="bo-loading" style={{ padding: '3rem 0' }}>
              <div className="bo-spinner" />
              <span className="bo-loading-text">Loading your session details...</span>
            </div>
          ) : error ? (
            <div className="bo-error-card">
              <div className="bo-error-icon">⚠️</div>
              <h3 className="bo-error-title">Unable to Load Sessions</h3>
              <p className="bo-error-desc">{error}</p>
            </div>
          ) : (
            <BreakoutForm userData={userData} />
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="bo-footer">
        Questions? Email us at{' '}
        <span className="bo-footer-email">events@madsemble.org</span>
      </footer>
    </div>
  )
}
