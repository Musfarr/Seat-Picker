import { useCallback } from 'react'
import JSZip from 'jszip'

/**
 * DoneModal — shows N lanyard previews with download buttons and ZIP download.
 *
 * Props:
 *  - lanyardUrls: [{ url, name, seatNumber }, ...]
 *  - broadcastFailed: boolean
 */
export default function DoneModal({ lanyardUrls = [], broadcastFailed }) {

  const downloadAll = useCallback(async () => {
    if (lanyardUrls.length === 0) return

    try {
      const zip = new JSZip()
      const folder = zip.folder('dragons-awards-passes')

      for (let i = 0; i < lanyardUrls.length; i++) {
        const item = lanyardUrls[i]
        const res = await fetch(item.url)
        const blob = await res.blob()
        const safeName = (item.name || `attendee-${i + 1}`).replace(/[^a-zA-Z0-9]/g, '_')
        folder.file(`${safeName}_pass.png`, blob)
      }

      const zipBlob = await zip.generateAsync({ type: 'blob' })
      const link = document.createElement('a')
      link.href = URL.createObjectURL(zipBlob)
      link.download = 'dragons-awards-passes.zip'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(link.href)
    } catch (err) {
      console.error('ZIP download failed:', err)
    }
  }, [lanyardUrls])

  return (
    <div className="modal-overlay">
      <div className="done-card modal-content--gala">
        <div className="done-check-wrapper">
          <div className="done-check-halo" />
          <div className="done-check">✓</div>
        </div>

        <h2 className="done-title">
          {broadcastFailed ? 'Booking Confirmed!' : 'Reservation Complete!'}
        </h2>

        {broadcastFailed ? (
          <div className="done-error-box">
            <p className="done-err-txt">⚠️ Some WhatsApp broadcasts failed. Please download passes below.</p>
            <p className="done-sub">All seat reservations are confirmed in our system.</p>
          </div>
        ) : (
          <p className="done-sub">
            Official event passes have been dispatched via WhatsApp to all attendees.
          </p>
        )}

        {/* Lanyard Previews Grid */}
        {lanyardUrls.length > 0 && (
          <div className="done-lanyards-grid">
            {lanyardUrls.map((item, i) => (
              <div key={i} className="done-lanyard-card">
                <div className="done-lanyard-preview">
                  <img src={item.url} alt={`Pass for ${item.name}`} className="done-lanyard-img" />
                </div>
                <div className="done-lanyard-info">
                  <span className="done-lanyard-name">{item.name}</span>
                  <span className="done-lanyard-seat">Seat {item.seatNumber}</span>
                </div>
                <a
                  href={item.url}
                  download={`${(item.name || 'pass').replace(/[^a-zA-Z0-9]/g, '_')}_pass.png`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="done-single-download"
                >
                  ↓
                </a>
              </div>
            ))}
          </div>
        )}

        {/* Download All ZIP */}
        {lanyardUrls.length > 1 && (
          <button className="done-download-btn" onClick={downloadAll}>
            <span>Download All Passes (ZIP)</span>
            <span>📦</span>
          </button>
        )}

        {lanyardUrls.length === 1 && (
          <a
            href={lanyardUrls[0].url}
            download="dragons-pass.png"
            target="_blank"
            rel="noopener noreferrer"
            className="done-download-btn"
          >
            <span>Download Digital Pass</span>
            <span>↓</span>
          </a>
        )}
      </div>
    </div>
  )
}
