import { useState, useEffect, useMemo } from 'react'

/**
 * AttendeeFormModal
 * Collects Name + Phone for each selected seat.
 * Randomly shuffles seats and assigns them 1:1 to attendees in form order.
 *
 * Props:
 *  - allSelections: [{ tableId, type, chair }, ...]
 *  - paramData: { Company_Name, ... }
 *  - onSubmit(attendees[]): called with [{ name, phone, seatNumber, companyName }]
 *  - onCancel(): closes the modal
 */
export default function AttendeeFormModal({ allSelections, paramData, onSubmit, onCancel }) {
  const count = allSelections.length

  // Randomly shuffle seat assignments once on mount
  const shuffledSeats = useMemo(() => {
    const seats = allSelections.map(s => `${s.tableId}-${s.chair}`)
    // Fisher-Yates shuffle
    for (let i = seats.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[seats[i], seats[j]] = [seats[j], seats[i]]
    }
    return seats
  }, [allSelections])

  // Initialize form rows
  const [rows, setRows] = useState(() =>
    Array.from({ length: count }, () => ({ name: '', phone: '' }))
  )
  const [errors, setErrors] = useState({})

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onCancel()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onCancel])

  const updateRow = (index, field, value) => {
    setRows(prev => prev.map((r, i) => i === index ? { ...r, [field]: value } : r))
    // Clear error for this field
    if (errors[`${index}-${field}`]) {
      setErrors(prev => {
        const next = { ...prev }
        delete next[`${index}-${field}`]
        return next
      })
    }
  }

  const validate = () => {
    const errs = {}
    rows.forEach((row, i) => {
      if (!row.name.trim()) {
        errs[`${i}-name`] = 'Name is required'
      }
      if (!row.phone.trim()) {
        errs[`${i}-phone`] = 'Phone is required'
      } else if (!/^92\d{10}$/.test(row.phone.trim())) {
        errs[`${i}-phone`] = 'Format: 923001234567'
      }
    })
    return errs
  }

  const handleSubmit = () => {
    const errs = validate()
    if (Object.keys(errs).length > 0) {
      setErrors(errs)
      return
    }

    const attendees = rows.map((row, i) => ({
      name: row.name.trim(),
      phone: row.phone.trim(),
      seatNumber: shuffledSeats[i],
      companyName: paramData.Company_Name || '',
    }))

    onSubmit(attendees)
  }

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div
        className="attendee-form-modal modal-content--gala"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="modal-header">
          <div className="modal-title-wrap">
            <h2 className="modal-title">Attendee Details</h2>
            <span className="modal-type-tag modal-type-normal">
              {count} {count === 1 ? 'SEAT' : 'SEATS'} SELECTED
            </span>
          </div>
          <button className="modal-close" onClick={onCancel}>×</button>
        </div>

        {/* Company Name (shared, read-only) */}
        {paramData.Company_Name && (
          <div className="attendee-company-banner">
            <span className="attendee-company-label">COMPANY</span>
            <span className="attendee-company-name">{paramData.Company_Name}</span>
          </div>
        )}

        {/* Scrollable attendee form rows */}
        <div className="attendee-rows-scroll">
          {rows.map((row, i) => {
            const seatParts = shuffledSeats[i].split('-')
            return (
              <div key={i} className="attendee-row-card">
                <div className="attendee-seat-badge">
                  <span className="attendee-seat-icon">💺</span>
                  <span className="attendee-seat-text">
                    Table {seatParts[0]} · Seat {seatParts[1]}
                  </span>
                  <span className="attendee-index">#{i + 1}</span>
                </div>

                <div className="attendee-fields">
                  <div className="attendee-field">
                    <label className="attendee-label">Full Name *</label>
                    <input
                      type="text"
                      className={`attendee-input${errors[`${i}-name`] ? ' attendee-input--error' : ''}`}
                      placeholder="Enter full name"
                      value={row.name}
                      onChange={e => updateRow(i, 'name', e.target.value)}
                    />
                    {errors[`${i}-name`] && (
                      <span className="attendee-error">{errors[`${i}-name`]}</span>
                    )}
                  </div>

                  <div className="attendee-field">
                    <label className="attendee-label">Phone Number *</label>
                    <input
                      type="tel"
                      className={`attendee-input${errors[`${i}-phone`] ? ' attendee-input--error' : ''}`}
                      placeholder="923001234567"
                      value={row.phone}
                      onChange={e => updateRow(i, 'phone', e.target.value)}
                    />
                    {errors[`${i}-phone`] && (
                      <span className="attendee-error">{errors[`${i}-phone`]}</span>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Submit Button */}
        <button className="attendee-submit-btn" onClick={handleSubmit}>
          <span>Submit & Generate Passes</span>
          <span className="book-btn-arrow">→</span>
        </button>
      </div>
    </div>
  )
}
