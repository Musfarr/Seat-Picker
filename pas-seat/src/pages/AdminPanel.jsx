import { useState, useEffect, useMemo } from 'react'
import QRCode from 'qrcode'
import {
  getAllBookings,
  uploadFile,
  updateBooking,
  sendLanyardWhatsapp2,
} from '../api'
import { generateLanyard } from '../generateLanyard'
import { breakoutSessions } from '../data/breakoutSessions'
import '../App.css'

function cleanPhoneNumber(raw) {
  let phone = String(raw || '').trim().replace(/[^\d]/g, '')
  if (phone.startsWith('0')) {
    phone = '92' + phone.slice(1)
  }
  return phone
}

function extractBreakoutSessionsList(booking) {
  if (!booking) return []

  // Case 1: Structured array
  if (Array.isArray(booking.breakoutSessions) && booking.breakoutSessions.length > 0) {
    return booking.breakoutSessions
      .map((s, idx) => ({
        title: s.title || s.topicTitle || s.topic || `Session ${idx + 1}`,
        speaker: s.speaker || '',
        venue: s.venue || 'Imperial Ballroom A',
        designation: s.designation || '',
      }))
      .filter(s => Boolean(s.title))
  }

  // Case 2: Array of topic IDs
  if (Array.isArray(booking.breakoutTopics) && booking.breakoutTopics.length > 0) {
    const list = []
    breakoutSessions.forEach(session => {
      const topic = session.topics?.find(t => booking.breakoutTopics.includes(t.id))
      if (topic) {
        list.push({
          title: topic.title,
          speaker: topic.speaker || '',
          venue: topic.venue || 'Imperial Ballroom A',
          designation: topic.designation || '',
        })
      }
    })
    if (list.length > 0) return list
  }

  // Case 3: Flat fields session1, session2, session3
  const list = []
  if (booking.session1) {
    list.push({
      title: booking.session1,
      speaker: booking.session1Speaker || '',
      venue: booking.session1Venue || 'Imperial Ballroom A',
      designation: booking.session1Designation || '',
    })
  }
  if (booking.session2) {
    list.push({
      title: booking.session2,
      speaker: booking.session2Speaker || '',
      venue: booking.session2Venue || 'Imperial Ballroom A',
      designation: booking.session2Designation || '',
    })
  }
  if (booking.session3) {
    list.push({
      title: booking.session3,
      speaker: booking.session3Speaker || '',
      venue: booking.session3Venue || 'Imperial Ballroom A',
      designation: booking.session3Designation || '',
    })
  }

  return list
}

export default function AdminPanel() {
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [lanyardFilter, setLanyardFilter] = useState('all') // 'all' | 'missing' | 'ready'
  const [breakoutFilter, setBreakoutFilter] = useState('all') // 'all' | 'registered' | 'not-registered'

  // Per-row processing status: { [id]: { status: 'idle'|'generating'|'sending'|'success'|'error', message: '' } }
  const [actionStatuses, setActionStatuses] = useState({})

  // Multi-select for bulk actions
  const [selectedIds, setSelectedIds] = useState(new Set())
  const [isBulkRunning, setIsBulkRunning] = useState(false)
  const [bulkProgress, setBulkProgress] = useState({ current: 0, total: 0, message: '' })

  // Modal preview
  const [previewItem, setPreviewItem] = useState(null)
  const [toast, setToast] = useState(null)

  useEffect(() => {
    fetchBookings()
  }, [])

  function showToast(msg, type = 'info') {
    setToast({ msg, type })
    setTimeout(() => {
      setToast(null)
    }, 4000)
  }

  async function fetchBookings() {
    setLoading(true)
    setError('')
    try {
      const data = await getAllBookings()
      const list = Array.isArray(data) ? data : (data?.data || [])
      setBookings(list)
    } catch (err) {
      console.error('Failed to load bookings:', err)
      setError(err?.response?.data?.message || err.message || 'Failed to fetch bookings')
    } finally {
      setLoading(false)
    }
  }

  // Row status updater helper
  function setRowStatus(id, status, message = '') {
    setActionStatuses(prev => ({
      ...prev,
      [id]: { status, message },
    }))
  }

  // --- Core Action: Generate Lanyard & update booking ---
  async function handleGenerateLanyard(booking) {
    if (!booking?._id) return null
    const id = booking._id

    setRowStatus(id, 'generating', 'Generating QR code...')
    try {
      const profileUrl = `https://seat-picker-git-madsemble-musfarrs-projects.vercel.app/Profile/${id}`
      const lanyardQrDataUrl = await QRCode.toDataURL(profileUrl, { width: 512, margin: 2 })
      const qrBlob = await (await fetch(lanyardQrDataUrl)).blob()

      setRowStatus(id, 'generating', 'Uploading QR code...')
      const { url: lanyardQrUrl } = await uploadFile(qrBlob, `lanyard-qr-${id}.png`)

      const activeSessionsList = extractBreakoutSessionsList(booking)

      setRowStatus(id, 'generating', 'Rendering canvas lanyard...')
      const { blob } = await generateLanyard({
        name: booking.name || 'ATTENDEE',
        imageUrl: booking.image,
        image: booking.image,
        designation: booking.designation || '',
        companyName: booking.companyName || '',
        lanyardQrUrl,
        sessions: activeSessionsList,
        session1: booking.session1,
        session1Speaker: booking.session1Speaker,
        session2: booking.session2,
        session2Speaker: booking.session2Speaker,
        session3: booking.session3,
        session3Speaker: booking.session3Speaker,
      })

      setRowStatus(id, 'generating', 'Uploading lanyard...')
      const phoneDigits = cleanPhoneNumber(booking.phone) || 'pass'
      const { url: generatedLanyardUrl } = await uploadFile(
        blob,
        `lanyard-${phoneDigits}-${Date.now()}.png`
      )

      setRowStatus(id, 'generating', 'Saving to database...')
      await updateBooking(id, { lanyardUrl: generatedLanyardUrl })

      // Update local state
      setBookings(prev =>
        prev.map(b => (b._id === id ? { ...b, lanyardUrl: generatedLanyardUrl } : b))
      )

      setRowStatus(id, 'success', 'Lanyard generated & saved!')
      showToast(`Pass ready for ${booking.name || 'Attendee'}`, 'success')
      return generatedLanyardUrl
    } catch (err) {
      console.error(`Failed to generate lanyard for ${booking.name}:`, err)
      setRowStatus(id, 'error', err?.message || 'Generation failed')
      showToast(`Failed for ${booking.name}: ${err?.message || 'Error'}`, 'error')
      return null
    }
  }

  // --- Core Action: Send WhatsApp ---
  async function handleSendWhatsapp(booking, urlOverride = null) {
    if (!booking?._id) return false
    const id = booking._id
    const targetUrl = urlOverride || booking.lanyardUrl

    if (!targetUrl) {
      setRowStatus(id, 'error', 'No lanyard URL to send')
      showToast(`Please generate lanyard first for ${booking.name || 'Attendee'}`, 'error')
      return false
    }

    const cleanPhone = cleanPhoneNumber(booking.phone)
    if (!cleanPhone) {
      setRowStatus(id, 'error', 'Invalid phone number')
      showToast(`No valid phone number for ${booking.name || 'Attendee'}`, 'error')
      return false
    }

    setRowStatus(id, 'sending', `Sending to ${cleanPhone}...`)
    try {
      await sendLanyardWhatsapp2({
        contactNumber: cleanPhone,
        lanyardUrl: targetUrl,
      })

      setRowStatus(id, 'success', 'WhatsApp sent!')
      showToast(`WhatsApp sent to ${booking.name} (${cleanPhone})`, 'success')
      return true
    } catch (err) {
      console.error(`Failed to send WhatsApp to ${cleanPhone}:`, err)
      setRowStatus(id, 'error', err?.response?.data?.message || err?.message || 'Send failed')
      showToast(`WhatsApp failed for ${booking.name}: ${err?.message}`, 'error')
      return false
    }
  }

  // --- Combo Action: Generate + Send ---
  async function handleGenerateAndSend(booking) {
    const url = await handleGenerateLanyard(booking)
    if (url) {
      await handleSendWhatsapp(booking, url)
    }
  }

  // --- Bulk Actions ---
  async function handleBulkAction(actionType) {
    if (selectedIds.size === 0 || isBulkRunning) return

    const targetBookings = bookings.filter(b => selectedIds.has(b._id))
    if (targetBookings.length === 0) return

    setIsBulkRunning(true)
    let processed = 0
    const total = targetBookings.length

    for (const b of targetBookings) {
      processed += 1
      setBulkProgress({
        current: processed,
        total,
        message: `Processing ${processed}/${total}: ${b.name || b.phone}...`,
      })

      if (actionType === 'regenerate') {
        await handleGenerateLanyard(b)
      } else if (actionType === 'send') {
        await handleSendWhatsapp(b)
      } else if (actionType === 'both') {
        const url = await handleGenerateLanyard(b)
        if (url) {
          await handleSendWhatsapp(b, url)
        }
      }

      // Small pause between items to avoid throttling
      await new Promise(res => setTimeout(res, 500))
    }

    setIsBulkRunning(false)
    setBulkProgress({ current: 0, total: 0, message: '' })
    showToast(`Bulk operation finished for ${total} attendees!`, 'success')
  }

  // Filtered and searched data
  const filteredBookings = useMemo(() => {
    const query = search.trim().toLowerCase()

    return bookings.filter(b => {
      // 1. Search match
      if (query) {
        const nameMatch = (b.name || '').toLowerCase().includes(query)
        const phoneMatch = (b.phone || '').toLowerCase().includes(query)
        const companyMatch = (b.companyName || '').toLowerCase().includes(query)
        const desigMatch = (b.designation || '').toLowerCase().includes(query)
        const cnicMatch = (b.cnic || '').toLowerCase().includes(query)
        const idMatch = String(b._id || '').toLowerCase().includes(query)
        if (!nameMatch && !phoneMatch && !companyMatch && !desigMatch && !cnicMatch && !idMatch) {
          return false
        }
      }

      // 2. Lanyard status filter
      if (lanyardFilter === 'missing' && Boolean(b.lanyardUrl)) return false
      if (lanyardFilter === 'ready' && !b.lanyardUrl) return false

      // 3. Breakout filter
      const isBreakoutReg = Boolean(
        b.breakoutRegistered ||
        (Array.isArray(b.breakoutTopics) && b.breakoutTopics.length > 0) ||
        (Array.isArray(b.breakoutSessions) && b.breakoutSessions.length > 0) ||
        b.session1 ||
        b.session2 ||
        b.session3
      )
      if (breakoutFilter === 'registered' && !isBreakoutReg) return false
      if (breakoutFilter === 'not-registered' && isBreakoutReg) return false

      return true
    })
  }, [bookings, search, lanyardFilter, breakoutFilter])

  // Select all helpers
  const allFilteredSelected =
    filteredBookings.length > 0 && filteredBookings.every(b => selectedIds.has(b._id))

  function toggleSelectAll() {
    if (allFilteredSelected) {
      setSelectedIds(new Set())
    } else {
      const next = new Set(selectedIds)
      filteredBookings.forEach(b => next.add(b._id))
      setSelectedIds(next)
    }
  }

  function toggleSelectRow(id) {
    const next = new Set(selectedIds)
    if (next.has(id)) {
      next.delete(id)
    } else {
      next.add(id)
    }
    setSelectedIds(next)
  }

  // Quick stats
  const totalCount = bookings.length
  const readyCount = bookings.filter(b => Boolean(b.lanyardUrl)).length
  const missingCount = totalCount - readyCount
  const breakoutCount = bookings.filter(
    b =>
      b.breakoutRegistered ||
      (Array.isArray(b.breakoutTopics) && b.breakoutTopics.length > 0) ||
      b.session1 ||
      b.session2 ||
      b.session3
  ).length

  return (
    <div className="bo-bc-page adm-page">
      {/* Toast Alert */}
      {toast && (
        <div className={`adm-toast adm-toast--${toast.type}`}>
          {toast.msg}
        </div>
      )}

      {/* Top Header */}
      <header className="bo-bc-header">
        <div className="bo-bc-header-left">
          <img src="/logo.png" alt="PAS Logo" className="bo-bc-logo" />
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <h1 className="bo-bc-title" style={{ margin: 0 }}>Lanyard Recovery &amp; Admin</h1>
              <span className="adm-badge-secret">🔒 RESTRICTED</span>
            </div>
            <p className="bo-bc-sub">
              Manage attendee passes, regenerate missing lanyards on the fly, and resend WhatsApp passes
            </p>
          </div>
        </div>

        <div className="bo-bc-header-right">
          <button
            type="button"
            onClick={fetchBookings}
            disabled={loading || isBulkRunning}
            className="bo-bc-refresh-btn"
          >
            {loading ? 'Refreshing...' : '🔄 Refresh Data'}
          </button>
        </div>
      </header>

      {/* Statistics Cards */}
      <div className="bo-bc-stats">
        <div className="bo-bc-stat-card">
          <div className="bo-bc-stat-label">Total Bookings</div>
          <div className="bo-bc-stat-val">{totalCount}</div>
        </div>
        <div className="bo-bc-stat-card" style={{ borderColor: 'rgba(74, 222, 128, 0.3)' }}>
          <div className="bo-bc-stat-label" style={{ color: '#4ade80' }}>Lanyard Ready</div>
          <div className="bo-bc-stat-val" style={{ color: '#4ade80' }}>{readyCount}</div>
        </div>
        <div className="bo-bc-stat-card" style={{ borderColor: missingCount > 0 ? 'rgba(248, 113, 113, 0.4)' : undefined }}>
          <div className="bo-bc-stat-label" style={{ color: missingCount > 0 ? '#f87171' : undefined }}>
            Missing Lanyard
          </div>
          <div className="bo-bc-stat-val" style={{ color: missingCount > 0 ? '#f87171' : '#fff' }}>
            {missingCount}
          </div>
        </div>
        <div className="bo-bc-stat-card">
          <div className="bo-bc-stat-label">Breakout Confirmed</div>
          <div className="bo-bc-stat-val">{breakoutCount}</div>
        </div>
      </div>

      {/* Bulk Progress Bar */}
      {isBulkRunning && (
        <div className="bo-bc-progress-wrap" style={{ margin: '1rem 0 1.5rem' }}>
          <div className="bo-bc-progress-bar">
            <div
              className="bo-bc-progress-fill"
              style={{
                width: `${bulkProgress.total ? (bulkProgress.current / bulkProgress.total) * 100 : 0}%`,
              }}
            />
          </div>
          <div className="bo-bc-progress-text">
            ⚡ {bulkProgress.message}
          </div>
        </div>
      )}

      {/* Controls & Filters */}
      <div className="adm-controls-panel">
        <div className="adm-controls-row">
          <input
            type="text"
            placeholder="Search by attendee name, phone, company, CNIC..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="bo-bc-search adm-search-input"
          />

          {/* Lanyard status filter tabs */}
          <div className="adm-filter-group">
            <span className="adm-filter-label">Lanyard:</span>
            <button
              type="button"
              className={`adm-pill-btn ${lanyardFilter === 'all' ? 'active' : ''}`}
              onClick={() => setLanyardFilter('all')}
            >
              All ({totalCount})
            </button>
            <button
              type="button"
              className={`adm-pill-btn ${lanyardFilter === 'missing' ? 'active active-danger' : ''}`}
              onClick={() => setLanyardFilter('missing')}
            >
              ⚠️ Missing ({missingCount})
            </button>
            <button
              type="button"
              className={`adm-pill-btn ${lanyardFilter === 'ready' ? 'active active-success' : ''}`}
              onClick={() => setLanyardFilter('ready')}
            >
              ✓ Ready ({readyCount})
            </button>
          </div>

          {/* Breakout filter tabs */}
          <div className="adm-filter-group">
            <span className="adm-filter-label">Breakout:</span>
            <button
              type="button"
              className={`adm-pill-btn ${breakoutFilter === 'all' ? 'active' : ''}`}
              onClick={() => setBreakoutFilter('all')}
            >
              All
            </button>
            <button
              type="button"
              className={`adm-pill-btn ${breakoutFilter === 'registered' ? 'active' : ''}`}
              onClick={() => setBreakoutFilter('registered')}
            >
              Registered
            </button>
            <button
              type="button"
              className={`adm-pill-btn ${breakoutFilter === 'not-registered' ? 'active' : ''}`}
              onClick={() => setBreakoutFilter('not-registered')}
            >
              None
            </button>
          </div>
        </div>

        {/* Bulk Action Bar */}
        {selectedIds.size > 0 && (
          <div className="adm-bulk-bar">
            <div className="adm-bulk-bar-left">
              <span className="adm-bulk-selected-badge">{selectedIds.size}</span>
              <span>attendee{selectedIds.size > 1 ? 's' : ''} selected</span>
              <button
                type="button"
                className="adm-link-btn"
                onClick={() => setSelectedIds(new Set())}
              >
                Clear
              </button>
            </div>

            <div className="adm-bulk-bar-right">
              <button
                type="button"
                disabled={isBulkRunning}
                onClick={() => handleBulkAction('regenerate')}
                className="adm-bulk-btn adm-bulk-btn--regen"
              >
                🔄 Regenerate Selected ({selectedIds.size})
              </button>
              <button
                type="button"
                disabled={isBulkRunning}
                onClick={() => handleBulkAction('send')}
                className="adm-bulk-btn adm-bulk-btn--send"
              >
                📤 Send WhatsApp ({selectedIds.size})
              </button>
              <button
                type="button"
                disabled={isBulkRunning}
                onClick={() => handleBulkAction('both')}
                className="adm-bulk-btn adm-bulk-btn--both"
              >
                🚀 Regenerate &amp; Send ({selectedIds.size})
              </button>
            </div>
          </div>
        )}
      </div>

      {error && <div className="bo-bc-error">{error}</div>}

      {/* Main Table */}
      <div className="bo-bc-table-wrap">
        {loading ? (
          <div className="bo-bc-loading" style={{ padding: '3.5rem' }}>
            <div className="bo-spinner" />
            <span>Fetching attendee records from database...</span>
          </div>
        ) : filteredBookings.length === 0 ? (
          <div className="bo-bc-empty" style={{ padding: '3rem', textAlign: 'center' }}>
            No bookings found matching the current search / filter criteria.
          </div>
        ) : (
          <table className="bo-bc-table adm-table">
            <thead>
              <tr>
                <th style={{ width: '40px', textAlign: 'center' }}>
                  <input
                    type="checkbox"
                    checked={allFilteredSelected}
                    onChange={toggleSelectAll}
                    style={{ cursor: 'pointer' }}
                    title="Select all filtered rows"
                  />
                </th>
                <th>Attendee</th>
                <th>Company &amp; Phone</th>
                <th>Breakouts</th>
                <th>Lanyard Pass</th>
                <th>Status / Log</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredBookings.map((b) => {
                const id = b._id
                const isSelected = selectedIds.has(id)
                const sessions = extractBreakoutSessionsList(b)
                const actionState = actionStatuses[id] || { status: 'idle', message: '' }
                const isProcessing =
                  actionState.status === 'generating' || actionState.status === 'sending'

                const cleanPhone = cleanPhoneNumber(b.phone)
                const hasLanyard = Boolean(b.lanyardUrl)

                return (
                  <tr
                    key={id}
                    className={`bo-bc-row ${isSelected ? 'adm-row-selected' : ''}`}
                  >
                    {/* Checkbox */}
                    <td style={{ textAlign: 'center' }}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelectRow(id)}
                        disabled={isBulkRunning}
                        style={{ cursor: 'pointer' }}
                      />
                    </td>

                    {/* Attendee Info */}
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        {b.image ? (
                          <img
                            src={b.image}
                            alt=""
                            className="adm-avatar"
                            onError={(e) => {
                              e.target.style.display = 'none'
                            }}
                          />
                        ) : (
                          <div className="adm-avatar adm-avatar--placeholder">
                            {(b.name || 'A').charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div>
                          <div className="bo-bc-name" style={{ fontWeight: 700 }}>
                            {b.name || '—'}
                          </div>
                          {b.designation && (
                            <div className="bo-bc-subtext">{b.designation}</div>
                          )}
                          {b.cnic && (
                            <div className="adm-cnic-text">CNIC: {b.cnic}</div>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Company & Phone */}
                    <td>
                      <div style={{ fontWeight: 600 }}>{b.companyName || '—'}</div>
                      <div className="bo-bc-phone" style={{ marginTop: '0.2rem' }}>
                        {cleanPhone || b.phone || '—'}
                      </div>
                      <span className="bo-bc-badge" style={{ marginTop: '0.35rem', display: 'inline-block' }}>
                        {b.type || 'Corporate'}
                      </span>
                    </td>

                    {/* Breakout Info */}
                    <td>
                      {sessions.length > 0 ? (
                        <div className="adm-breakout-chips">
                          {sessions.map((s, idx) => (
                            <span key={idx} className="adm-chip" title={`${s.title} (${s.speaker})`}>
                              {s.title.length > 25 ? s.title.slice(0, 24) + '...' : s.title}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="adm-text-muted">None selected</span>
                      )}
                    </td>

                    {/* Lanyard Status & Quick View */}
                    <td>
                      {hasLanyard ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                          <span className="adm-badge-ready">✓ Ready</span>
                          <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                            <button
                              type="button"
                              onClick={() => setPreviewItem(b)}
                              className="adm-btn-mini"
                              title="Preview Lanyard"
                            >
                              👁️ View
                            </button>
                            <a
                              href={b.lanyardUrl}
                              target="_blank"
                              rel="noreferrer"
                              download={`lanyard-${cleanPhone}.png`}
                              className="adm-btn-mini"
                              title="Download Direct PNG"
                            >
                              📥 Open
                            </a>
                            <button
                              type="button"
                              onClick={() => {
                                navigator.clipboard.writeText(b.lanyardUrl)
                                showToast('Lanyard URL copied to clipboard!', 'success')
                              }}
                              className="adm-btn-mini"
                              title="Copy URL"
                            >
                              📋 Copy
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div>
                          <span className="adm-badge-missing">⚠️ Missing</span>
                          <div className="adm-text-muted" style={{ fontSize: '0.75rem', marginTop: '0.25rem' }}>
                            Not yet generated
                          </div>
                        </div>
                      )}
                    </td>

                    {/* Status / Activity Message */}
                    <td>
                      {isProcessing ? (
                        <div className="adm-status-anim">
                          <span className="bo-spinner bo-spinner--sm" />
                          <span style={{ fontSize: '0.8rem', color: '#FED800' }}>
                            {actionState.message || 'Processing...'}
                          </span>
                        </div>
                      ) : actionState.status === 'success' ? (
                        <span className="adm-status-success">✓ {actionState.message}</span>
                      ) : actionState.status === 'error' ? (
                        <span className="adm-status-error" title={actionState.message}>
                          ✕ {actionState.message}
                        </span>
                      ) : b.attendance && Array.isArray(b.attendance) && b.attendance.length > 0 ? (
                        <span className="adm-status-attended" title={`Scanned ${b.attendance.length} time(s)`}>
                          🎟️ Scanned ({b.attendance.length})
                        </span>
                      ) : (
                        <span className="adm-text-muted" style={{ fontSize: '0.8rem' }}>Idle</span>
                      )}
                    </td>

                    {/* Actions Column */}
                    <td style={{ textAlign: 'right' }}>
                      <div className="adm-actions-cell">
                        {/* 1. Regenerate Lanyard */}
                        <button
                          type="button"
                          onClick={() => handleGenerateLanyard(b)}
                          disabled={isProcessing || isBulkRunning}
                          className="adm-act-btn adm-act-btn--regen"
                          title="Generate lanyard from template & update database"
                        >
                          🔄 {hasLanyard ? 'Regen' : 'Generate'}
                        </button>

                        {/* 2. Send WhatsApp */}
                        <button
                          type="button"
                          onClick={() => handleSendWhatsapp(b)}
                          disabled={isProcessing || isBulkRunning || !hasLanyard}
                          className="adm-act-btn adm-act-btn--send"
                          title={hasLanyard ? 'Send lanyard via WhatsApp' : 'Generate lanyard first'}
                        >
                          📤 Send WA
                        </button>

                        {/* 3. Both in One Click */}
                        <button
                          type="button"
                          onClick={() => handleGenerateAndSend(b)}
                          disabled={isProcessing || isBulkRunning}
                          className="adm-act-btn adm-act-btn--both"
                          title="Regenerate lanyard and send immediately via WhatsApp"
                        >
                          🚀 Both
                        </button>

                        {/* 4. Profile link */}
                        <a
                          href={`/Profile/${id}`}
                          target="_blank"
                          rel="noreferrer"
                          className="adm-act-btn adm-act-btn--profile"
                          title="Open attendee QR Profile page"
                        >
                          👤 Profile ↗
                        </a>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Lanyard Preview Modal */}
      {previewItem && (
        <div className="bo-bc-modal-overlay" onClick={() => setPreviewItem(null)}>
          <div
            className="bo-bc-modal adm-preview-modal"
            onClick={e => e.stopPropagation()}
            style={{ maxWidth: '480px', textAlign: 'center' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 className="bo-bc-modal-title" style={{ margin: 0 }}>
                {previewItem.name || 'Attendee'} Pass
              </h3>
              <button
                type="button"
                onClick={() => setPreviewItem(null)}
                className="bo-bc-btn-close"
              >
                ✕
              </button>
            </div>

            <div className="adm-preview-img-wrap">
              {previewItem.lanyardUrl ? (
                <img
                  src={previewItem.lanyardUrl}
                  alt="Lanyard Pass"
                  className="adm-preview-img"
                />
              ) : (
                <div style={{ padding: '3rem', color: '#f87171' }}>No lanyard generated yet</div>
              )}
            </div>

            <div style={{ marginTop: '1rem', display: 'flex', gap: '0.6rem', justifyContent: 'center' }}>
              {previewItem.lanyardUrl && (
                <a
                  href={previewItem.lanyardUrl}
                  target="_blank"
                  rel="noreferrer"
                  download
                  className="bo-bc-btn-send"
                >
                  📥 Download Full Pass
                </a>
              )}
              <button
                type="button"
                onClick={() => {
                  handleSendWhatsapp(previewItem)
                  setPreviewItem(null)
                }}
                className="adm-bulk-btn adm-bulk-btn--send"
              >
                📤 Send via WhatsApp
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
