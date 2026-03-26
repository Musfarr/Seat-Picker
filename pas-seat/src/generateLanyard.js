const TEMPLATE_URL = 'https://mediaupload.convexinteractive.com/api/file/1774535504135-226612607.png'

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = src
  })
}

export async function generateLanyard({ name, cnic, seatNumber, seatNumbers, imageUrl, designation, companyName, lanyardQrUrl }) {
  const template = await loadImage(TEMPLATE_URL)
  const W = template.naturalWidth || 434
  const H = template.naturalHeight || 900

  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')

  // Draw template image as background
  ctx.drawImage(template, 0, 0, W, H)

  ctx.textAlign = 'center'
  ctx.shadowColor = 'rgba(0,0,0,0.95)'
  ctx.shadowBlur = 8

  const seats = seatNumbers || (seatNumber ? [seatNumber] : [])

  // ── Photo position (middle of card) ──
  const photoCX = W / 2
  const photoCY = Math.round(H * 0.50)
  const photoR = Math.round(W * 0.155)
  
  const QRCX = W / 2
  const QRCY = Math.round(H * 0.88)
  const QRR = Math.round(W * 0.155)

  // ── Name above photo ──
  const nameY = Math.round(H * 0.35)
  ctx.fillStyle = 'rgb(254, 242, 194)'
  ctx.font = `bold ${Math.round(W * 0.062)}px Arial`
  ctx.fillText((name || '').toUpperCase(), W / 2, nameY)

  // ── Designation + Company below name ──
  const desigParts = [designation, companyName].filter(Boolean).join(', ')
  if (desigParts) {
    ctx.fillStyle = 'rgba(255,255,255,0.85)'
    ctx.font = ` bold ${Math.round(W * 0.036)}px Arial`
    ctx.fillText(desigParts, W / 2, nameY + Math.round(H * 0.036))
  }

  // ── Profile photo ──
  if (imageUrl) {
    try {
      const photo = await loadImage(imageUrl)
      ctx.save()
      ctx.beginPath()
      ctx.arc(photoCX, photoCY, photoR, 0, Math.PI * 2)
      ctx.clip()
      ctx.drawImage(photo, photoCX - photoR, photoCY - photoR, photoR * 2, photoR * 2)
      ctx.restore()
      ctx.strokeStyle = 'rgb(254, 242, 194)'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.arc(photoCX, photoCY, photoR + 3, 0, Math.PI * 2)
      ctx.stroke()
    } catch (_) {
      // photo failed to load — skip
    }
  }


  // #QR

  if (lanyardQrUrl) {
    try {
      const qrImg = await loadImage(lanyardQrUrl)
      const qrSize = QRR * 1.5
      ctx.drawImage(qrImg, QRCX - qrSize / 2, QRCY - qrSize / 2, qrSize, qrSize)
    } catch (_) {
      // QR failed to load — skip
    }
  }

  // ── Seat number below template's "EXPO CENTER KARACHI" text ──
  const seatY = Math.round(H * 0.79)
  ctx.fillStyle = 'rgb(254, 242, 194)'
  ctx.font = `bold ${Math.round(W * 0.072)}px Arial`
  const seatLabel = seats.length > 1 ? `SEAT #: ${seats.join(' · ')}` : `SEAT #: ${seats[0] || ''}`
  ctx.fillText(seatLabel, W / 2, seatY)

  ctx.shadowBlur = 0

  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      resolve({ blob })
    }, 'image/png')
  })
}
