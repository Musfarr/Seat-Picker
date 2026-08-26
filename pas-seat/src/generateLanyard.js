const TEMPLATE_URL = import.meta.env.VITE_TEMPLATE_IMAGE_URL || 'https://mediaupload.convexinteractive.com/api/file/1786977606323-362082422.jpeg'

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = src
  })
}

/**
 * Generate a Dragons Awards lanyard.
 *
 * Label positions on the template (from the provided image):
 *   - "Name"             label at ~34% Y, ~24% X (left-aligned)
 *   - "Company Name"     label at ~34% Y, ~50% X (center)
 *   - "No. Seat or Table" label at ~34% Y, ~76% X (right-aligned)
 *   - QR Code area below "Pearl Continental" (~82-88% Y, centered)
 */
export async function generateLanyard({ name, companyName, seatNumber, seatNumbers, lanyardQrUrl }) {
  const template = await loadImage(TEMPLATE_URL)
  const W = template.naturalWidth || 540
  const H = template.naturalHeight || 960

  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')

  // Draw template image as background
  ctx.drawImage(template, 0, 0, W, H)

  ctx.shadowColor = 'rgba(0,0,0,0.85)'
  ctx.shadowBlur = 6

  const seats = seatNumbers || (seatNumber ? [seatNumber] : [])

  // ── Label row Y position (just above the printed labels on the template) ──
  // The template shows "Name", "Company Name", "No. Seat or Table" labels
  // at approximately 33-34% from the top. We render text ABOVE them.
  const labelY = Math.round(H * 0.323)

  // ── NAME (left column, ~22% X) ──
  ctx.textAlign = 'center'
  ctx.fillStyle = '#ffffff'
  ctx.font = 'bold 24px Arial'
  const nameText = (name || '').toUpperCase()
  const maxNameWidth = W * 0.26
  let displayName = nameText
  while (ctx.measureText(displayName).width > maxNameWidth && displayName.length > 3) {
    displayName = displayName.slice(0, -1)
  }
  if (displayName !== nameText) displayName += '…'
  ctx.fillText(displayName, Math.round(W * 0.22), labelY)

  // ── COMPANY NAME (center column, ~50% X) ──
  ctx.fillStyle = '#ffffff'
  ctx.font = 'bold 24px Arial'
  const companyText = (companyName || '').toUpperCase()
  const maxCompanyWidth = W * 0.26
  let displayCompany = companyText
  while (ctx.measureText(displayCompany).width > maxCompanyWidth && displayCompany.length > 3) {
    displayCompany = displayCompany.slice(0, -1)
  }
  if (displayCompany !== companyText) displayCompany += '…'
  ctx.fillText(displayCompany, Math.round(W * 0.50), labelY)

  // ── SEAT / TABLE NUMBER (right column, ~78% X) ──
  ctx.fillStyle = '#ffffff'
  ctx.font = 'bold 28px Arial'
  const seatLabel = seats.length > 1 ? seats.join(' · ') : (seats[0] || '')
  ctx.fillText(seatLabel, Math.round(W * 0.78), labelY)

  // ── QR CODE aligned left below "Pearl Continental" ──
  if (lanyardQrUrl) {
    try {
      const qrImg = await loadImage(lanyardQrUrl)
      const qrSize = Math.round(W * 0.16)
      const qrX = Math.round(W * 0.10)
      const qrY = Math.round(H * 0.705)
      ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize)
    } catch (_) {
      // QR failed to load — skip
    }
  }

  ctx.shadowBlur = 0

  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      resolve({ blob })
    }, 'image/jpeg', 0.85)
  })
}
