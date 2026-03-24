const TEMPLATE_URL = 'https://mediaupload.convexinteractive.com/api/file/1774355532846-597792243.png'

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = src
  })
}

export async function generateLanyard({ name, cnic, seatNumber, seatNumbers, imageUrl }) {
  const template = await loadImage(TEMPLATE_URL)
  const W = template.naturalWidth || 434
  const H = template.naturalHeight || 900

  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')

  // Draw template image as background
  ctx.drawImage(template, 0, 0, W, H)

  // Data overlay area: center horizontally, vertically in the blank middle section
  const photoCX = W / 2
  const photoCY = Math.round(H * 0.43)
  const photoR = Math.round(W * 0.155)

  // Draw profile photo if provided
  if (imageUrl) {
    try {
      const photo = await loadImage(imageUrl)
      ctx.save()
      ctx.beginPath()
      ctx.arc(photoCX, photoCY, photoR, 0, Math.PI * 2)
      ctx.clip()
      ctx.drawImage(photo, photoCX - photoR, photoCY - photoR, photoR * 2, photoR * 2)
      ctx.restore()
      // Gold ring around photo
      ctx.strokeStyle = 'rgba(218,165,32,0.9)'
      ctx.lineWidth = 3
      ctx.beginPath()
      ctx.arc(photoCX, photoCY, photoR + 3, 0, Math.PI * 2)
      ctx.stroke()
    } catch (_) {
      // photo failed to load — skip
    }
  }

  // Text shadow for readability over bokeh background
  ctx.textAlign = 'center'
  ctx.shadowColor = 'rgba(0,0,0,0.95)'
  ctx.shadowBlur = 8

  const seats = seatNumbers || (seatNumber ? [seatNumber] : [])
  const baseY = photoCY + photoR + Math.round(H * 0.038)

  // Name
  ctx.fillStyle = '#ffffff'
  ctx.font = `bold ${Math.round(W * 0.058)}px Arial`
  ctx.fillText(name || '', W / 2, baseY)

  // Seat number(s)
  ctx.fillStyle = '#facc15'
  ctx.font = `bold ${Math.round(W * 0.044)}px Arial`
  const seatLabel = seats.length > 1 ? `Seats: ${seats.join(' · ')}` : `Seat: ${seats[0] || ''}`
  ctx.fillText(seatLabel, W / 2, baseY + Math.round(H * 0.04))

  // CNIC (individual only)
  if (cnic) {
    ctx.fillStyle = 'rgba(255,255,255,0.8)'
    ctx.font = `${Math.round(W * 0.036)}px Arial`
    ctx.fillText(`CNIC: ${cnic}`, W / 2, baseY + Math.round(H * 0.076))
  }

  ctx.shadowBlur = 0

  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      resolve({ blob })
    }, 'image/png')
  })
}
