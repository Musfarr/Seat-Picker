import { useState, useEffect } from 'react'
import { getAllBookings, sendBreakoutLink } from '../api'
import { encryptParams } from '../utils/Encrypt'

const BASE_BREAKOUT_URL = 'https://effie.convexinteractive.com/breakout'

export default function BreakoutBroadcast() {
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [statuses, setStatuses] = useState({}) // { [bookingId]: 'pending' | 'sending' | 'sent' | 'error' }
  const [errorMessages, setErrorMessages] = useState({})
  const [isBroadcasting, setIsBroadcasting] = useState(false)
  const [broadcastProgress, setBroadcastProgress] = useState({ sent: 0, total: 0 })
  const [previewLink, setPreviewLink] = useState(null)

  useEffect(() => {
    fetchBookings()
  }, [])

  async function fetchBookings() {
    setLoading(true)
    setError('')
    try {
      const data = await getAllBookings()
      setBookings(data)
      const initialStatuses = {}
      data.forEach(b => {
        initialStatuses[b._id] = b.breakoutInviteSent ? 'sent' : 'pending'
      })
      setStatuses(initialStatuses)
    } catch (err) {
      console.error('Failed to fetch bookings:', err)
      setError('Failed to fetch bookings from backend. Make sure the backend server is running.')
    } finally {
      setLoading(false)
    }
  }

  async function generateEncryptedUrl(booking) {
    const payload = {
      name: booking.name || 'Attendee',
      phone: booking.phone || '',
      companyName: booking.companyName || '',
      bookingId: booking._id,
    }
    const encrypted = await encryptParams(payload)
    return `${window.location.origin}/breakout?data=${encrypted}`
  }

  async function handleSendSingle(booking) {
    const id = booking._id
    if (!booking.phone) {
      alert('This booking does not have a phone number.')
      return
    }

    setStatuses(prev => ({ ...prev, [id]: 'sending' }))
    setErrorMessages(prev => ({ ...prev, [id]: '' }))

    try {
      const link = await generateEncryptedUrl(booking)
      await sendBreakoutLink({
        contactNumber: booking.phone,
        link,
        name: booking.name || ''
      })
      setStatuses(prev => ({ ...prev, [id]: 'sent' }))
    } catch (err) {
      console.error(`Failed to send to ${booking.phone}:`, err)
      setStatuses(prev => ({ ...prev, [id]: 'error' }))
      setErrorMessages(prev => ({
        ...prev,
        [id]: err?.response?.data?.message || err.message || 'Send failed',
      }))
    }
  }

  async function handleBroadcastAll() {
    const targetBookings = filteredBookings.filter(
      b => b.phone && statuses[b._id] !== 'sent'
    )

    if (targetBookings.length === 0) {
      alert('No pending bookings with valid phone numbers to send to.')
      return
    }

    if (!window.confirm(`Are you sure you want to send WhatsApp invites to ${targetBookings.length} attendee(s)?`)) {
      return
    }

    setIsBroadcasting(true)
    setBroadcastProgress({ sent: 0, total: targetBookings.length })

    let sentCount = 0
    for (const booking of targetBookings) {
      const id = booking._id
      setStatuses(prev => ({ ...prev, [id]: 'sending' }))

      try {
        const link = await generateEncryptedUrl(booking)
        await sendBreakoutLink({
          contactNumber: booking.phone,
          link,
        })
        setStatuses(prev => ({ ...prev, [id]: 'sent' }))
      } catch (err) {
        console.error(`Failed to send to ${booking.phone}:`, err)
        setStatuses(prev => ({ ...prev, [id]: 'error' }))
        setErrorMessages(prev => ({
          ...prev,
          [id]: err?.response?.data?.message || err.message || 'Send failed',
        }))
      }

      sentCount++
      setBroadcastProgress({ sent: sentCount, total: targetBookings.length })

      // Small delay between calls to prevent rate limits
      await new Promise(r => setTimeout(r, 600))
    }

    setIsBroadcasting(false)
  }

  async function handlePreviewLink(booking) {
    const link = await generateEncryptedUrl(booking)
    setPreviewLink({ name: booking.name, link })
  }

  const filteredBookings = bookings.filter(b => {
    const q = search.toLowerCase()
    const nameMatch = (b.name || '').toLowerCase().includes(q)
    const phoneMatch = (b.phone || '').toLowerCase().includes(q)
    const compMatch = (b.companyName || '').toLowerCase().includes(q)
    return nameMatch || phoneMatch || compMatch
  })

  const totalCount = bookings.length
  const sentCount = Object.values(statuses).filter(s => s === 'sent').length
  const pendingCount = totalCount - sentCount

  return (
    <div className="bo-bc-page">
      {/* Top Bar */}
      <header className="bo-bc-header">
        <div className="bo-bc-header-left">
          <img src="/logo.png" alt="Logo" className="bo-bc-logo" />
          <div>
            <h1 className="bo-bc-title">Breakout Session Broadcast</h1>
            <p className="bo-bc-sub">Send personalized, encrypted breakout registration links via WhatsApp</p>
          </div>
        </div>
        <div className="bo-bc-header-right">
          <button onClick={fetchBookings} className="bo-bc-refresh-btn" disabled={loading || isBroadcasting}>
            ↻ Refresh Data
          </button>
          <button
            onClick={handleBroadcastAll}
            className="bo-bc-send-all-btn"
            disabled={loading || isBroadcasting || pendingCount === 0}
          >
            {isBroadcasting
              ? `Sending (${broadcastProgress.sent}/${broadcastProgress.total})...`
              : `🚀 Send to All Pending (${pendingCount})`}
          </button>
        </div>
      </header>

      {/* Stats row */}
      <div className="bo-bc-stats">
        <div className="bo-bc-stat-card">
          <div className="bo-bc-stat-label">Total Bookings</div>
          <div className="bo-bc-stat-val">{totalCount}</div>
        </div>
        <div className="bo-bc-stat-card">
          <div className="bo-bc-stat-label">Pending Invite</div>
          <div className="bo-bc-stat-val" style={{ color: '#FED800' }}>{pendingCount}</div>
        </div>
        <div className="bo-bc-stat-card">
          <div className="bo-bc-stat-label">Sent</div>
          <div className="bo-bc-stat-val" style={{ color: '#4ade80' }}>{sentCount}</div>
        </div>
      </div>

      {/* Broadcasting progress bar */}
      {isBroadcasting && (
        <div className="bo-bc-progress-wrap">
          <div className="bo-bc-progress-bar">
            <div
              className="bo-bc-progress-fill"
              style={{ width: `${(broadcastProgress.sent / broadcastProgress.total) * 100}%` }}
            />
          </div>
          <div className="bo-bc-progress-text">
            Sending WhatsApp invites: {broadcastProgress.sent} of {broadcastProgress.total} completed
          </div>
        </div>
      )}

      {/* Controls / Search */}
      <div className="bo-bc-controls">
        <input
          type="text"
          placeholder="Search by name, phone, or company..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="bo-bc-search"
        />
        <div className="bo-bc-count-text">
          Showing {filteredBookings.length} of {totalCount} records
        </div>
      </div>

      {/* Error state */}
      {error && <div className="bo-bc-error">{error}</div>}

      {/* Main Table */}
      <div className="bo-bc-table-wrap">
        {loading ? (
          <div className="bo-bc-loading">
            <div className="bo-spinner" />
            <span>Loading bookings...</span>
          </div>
        ) : filteredBookings.length === 0 ? (
          <div className="bo-bc-empty">No bookings found matching your search.</div>
        ) : (
          <table className="bo-bc-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Attendee Name</th>
                <th>Phone Number</th>
                <th>Company</th>
                <th>Type</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredBookings.map((b, idx) => {
                const st = statuses[b._id] || 'pending'
                const isSending = st === 'sending'
                const isSent = st === 'sent'
                const isErr = st === 'error'

                return (
                  <tr key={b._id} className={`bo-bc-row ${isSent ? 'bo-bc-row--sent' : ''}`}>
                    <td className="bo-bc-idx">{idx + 1}</td>
                    <td>
                      <div className="bo-bc-name">{b.name || '—'}</div>
                      {b.designation && <div className="bo-bc-subtext">{b.designation}</div>}
                    </td>
                    <td>
                      <span className="bo-bc-phone">{b.phone || '—'}</span>
                    </td>
                    <td>{b.companyName || '—'}</td>
                    <td>
                      <span className="bo-bc-badge">{b.type || 'Standard'}</span>
                    </td>
                    <td>
                      {isSending && <span className="bo-bc-status bo-bc-status--sending">⏳ Sending...</span>}
                      {isSent && <span className="bo-bc-status bo-bc-status--sent">✓ Sent</span>}
                      {isErr && (
                        <span className="bo-bc-status bo-bc-status--error" title={errorMessages[b._id]}>
                          ⚠️ Failed
                        </span>
                      )}
                      {!isSending && !isSent && !isErr && (
                        <span className="bo-bc-status bo-bc-status--pending">Pending</span>
                      )}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div className="bo-bc-actions">
                        <button
                          type="button"
                          onClick={() => handlePreviewLink(b)}
                          className="bo-bc-btn-ghost"
                          title="Preview Encrypted Link"
                        >
                          🔗 Link
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSendSingle(b)}
                          disabled={isSending || isBroadcasting}
                          className={`bo-bc-btn-send ${isSent ? 'bo-bc-btn-send--again' : ''}`}
                        >
                          {isSending ? 'Sending...' : isSent ? 'Resend' : 'Send WhatsApp'}
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Link Preview Modal */}
      {previewLink && (
        <div className="bo-bc-modal-overlay" onClick={() => setPreviewLink(null)}>
          <div className="bo-bc-modal" onClick={e => e.stopPropagation()}>
            <h3 className="bo-bc-modal-title">Encrypted URL Preview</h3>
            <p className="bo-bc-modal-sub">Attendee: <strong>{previewLink.name}</strong></p>
            <textarea
              readOnly
              value={previewLink.link}
              className="bo-bc-modal-textarea"
              rows={3}
              onClick={e => e.target.select()}
            />
            <div className="bo-bc-modal-footer">
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(previewLink.link)
                  alert('Link copied to clipboard!')
                }}
                className="bo-bc-btn-send"
              >
                📋 Copy Link
              </button>
              <button
                type="button"
                onClick={() => window.open(previewLink.link, '_blank')}
                className="bo-bc-btn-ghost"
              >
                Open in New Tab ↗
              </button>
              <button
                type="button"
                onClick={() => setPreviewLink(null)}
                className="bo-bc-btn-close"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
