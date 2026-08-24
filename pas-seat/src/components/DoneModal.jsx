import { useState, useCallback } from 'react'
import { jsPDF } from 'jspdf'

function loadImageData(url) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = img.naturalWidth
      canvas.height = img.naturalHeight
      const ctx = canvas.getContext('2d')
      ctx.drawImage(img, 0, 0)
      resolve({
        dataUrl: canvas.toDataURL('image/jpeg', 0.95),
        width: img.naturalWidth,
        height: img.naturalHeight,
      })
    }
    img.onerror = reject
    img.src = url
  })
}

/**
 * DoneModal — shows N lanyard previews with download buttons and PDF download.
 *
 * Props:
 *  - lanyardUrls: [{ url, name, seatNumber }, ...]
 *  - broadcastFailed: boolean
 */
export default function DoneModal({ lanyardUrls = [], broadcastFailed }) {
  const [generatingPdf, setGeneratingPdf] = useState(false)

  const downloadAllAsPdf = useCallback(async () => {
    if (lanyardUrls.length === 0) return
    setGeneratingPdf(true)

    try {
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      })

      const pageWidth = pdf.internal.pageSize.getWidth()
      const pageHeight = pdf.internal.pageSize.getHeight()

      for (let i = 0; i < lanyardUrls.length; i++) {
        if (i > 0) {
          pdf.addPage('a4', 'portrait')
        }

        // Pure black background on each page
        pdf.setFillColor(0, 0, 0)
        pdf.rect(0, 0, pageWidth, pageHeight, 'F')

        const { dataUrl, width, height } = await loadImageData(lanyardUrls[i].url)
        const imgAspect = width / height
        const margin = 12
        const maxW = pageWidth - margin * 2
        const maxH = pageHeight - margin * 2

        let renderW = maxW
        let renderH = renderW / imgAspect

        if (renderH > maxH) {
          renderH = maxH
          renderW = renderH * imgAspect
        }

        const posX = (pageWidth - renderW) / 2
        const posY = (pageHeight - renderH) / 2

        pdf.addImage(dataUrl, 'JPEG', posX, posY, renderW, renderH)
      }

      pdf.save('dragons-awards-passes.pdf')
    } catch (err) {
      console.error('PDF generation failed:', err)
    } finally {
      setGeneratingPdf(false)
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
                  download={`${(item.name || 'pass').replace(/[^a-zA-Z0-9]/g, '_')}_pass.jpg`}
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

        {/* Download All as Multi-page PDF (Black Background) */}
        {lanyardUrls.length > 1 && (
          <button
            type="button"
            className="done-download-btn"
            onClick={downloadAllAsPdf}
            disabled={generatingPdf}
          >
            <span>{generatingPdf ? 'Generating PDF...' : 'Download All Passes (PDF)'}</span>
            <span>📄</span>
          </button>
        )}

        {lanyardUrls.length === 1 && (
          <a
            href={lanyardUrls[0].url}
            download="dragons-pass.jpg"
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
