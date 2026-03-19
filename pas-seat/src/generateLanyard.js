const W = 420
const H = 620
const ACCENT = '#f97316'
const BG = '#0f1120'
const CARD_BG = '#111827'
const TEXT_PRIMARY = '#ffffff'
const TEXT_SECONDARY = '#94a3b8'
const BORDER = '#1e293b'

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + w - r, y)
  ctx.quadraticCurveTo(x + w, y, x + w, y + r)
  ctx.lineTo(x + w, y + h - r)
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
  ctx.lineTo(x + r, y + h)
  ctx.quadraticCurveTo(x, y + h, x, y + h - r)
  ctx.lineTo(x, y + r)
  ctx.quadraticCurveTo(x, y, x + r, y)
  ctx.closePath()
}

export async function generateLanyard({ name, email, cnic, phone_number, seats, imageFile: _unused }) {
  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')

  // Background
  ctx.fillStyle = BG
  ctx.fillRect(0, 0, W, H)

  // Lanyard rope
  ctx.strokeStyle = ACCENT
  ctx.lineWidth = 4
  ctx.setLineDash([6, 4])
  ctx.beginPath()
  ctx.moveTo(W / 2, 0)
  ctx.lineTo(W / 2, 68)
  ctx.stroke()
  ctx.setLineDash([])

  // Rope clip
  ctx.fillStyle = ACCENT
  roundRect(ctx, W / 2 - 12, 62, 24, 14, 4)
  ctx.fill()

  // Card
  ctx.fillStyle = CARD_BG
  roundRect(ctx, 24, 82, W - 48, H - 106, 18)
  ctx.fill()

  // Card top accent bar
  ctx.fillStyle = ACCENT
  roundRect(ctx, 24, 82, W - 48, 6, 3)
  ctx.fill()

  // PAS AWARDS title
  ctx.fillStyle = ACCENT
  ctx.font = 'bold 13px Arial'
  ctx.letterSpacing = '4px'
  ctx.textAlign = 'center'
  ctx.fillText('PAS AWARDS', W / 2, 118)
  ctx.letterSpacing = '0px'

  // Divider
  ctx.strokeStyle = BORDER
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(48, 128)
  ctx.lineTo(W - 48, 128)
  ctx.stroke()

  // Name
  ctx.fillStyle = TEXT_PRIMARY
  ctx.font = 'bold 22px Arial'
  ctx.textAlign = 'center'
  ctx.fillText(name, W / 2, 165)

  // Photo circle — static placeholder silhouette
  const cx = W / 2
  const cy = 245
  const r = 58

  // Circle background
  ctx.fillStyle = '#1e293b'
  ctx.beginPath()
  ctx.arc(cx, cy, r, 0, Math.PI * 2)
  ctx.fill()

  // Head
  ctx.fillStyle = '#334155'
  ctx.beginPath()
  ctx.arc(cx, cy - 16, 20, 0, Math.PI * 2)
  ctx.fill()

  // Body / shoulders
  ctx.beginPath()
  ctx.ellipse(cx, cy + 34, 28, 20, 0, Math.PI, 0, true)
  ctx.fill()

  // Clip to circle so body doesn't overflow
  ctx.save()
  ctx.beginPath()
  ctx.arc(cx, cy, r, 0, Math.PI * 2)
  ctx.clip()
  ctx.fillStyle = '#334155'
  ctx.beginPath()
  ctx.ellipse(cx, cy + 34, 28, 20, 0, Math.PI, 0, true)
  ctx.fill()
  ctx.restore()

  // Circle border
  ctx.strokeStyle = ACCENT
  ctx.lineWidth = 3
  ctx.beginPath()
  ctx.arc(cx, cy, r + 3, 0, Math.PI * 2)
  ctx.stroke()

  // Info rows
  const rows = [
    { label: 'Email', value: email },
    { label: 'Phone', value: phone_number },
    { label: 'CNIC', value: cnic },
    { label: seats.length > 1 ? 'Seats' : 'Seat', value: seats.join('  ·  ') },
  ]

  let rowY = 330
  rows.forEach(({ label, value }) => {
    ctx.fillStyle = TEXT_SECONDARY
    ctx.font = '11px Arial'
    ctx.textAlign = 'left'
    ctx.fillText(label.toUpperCase(), 48, rowY)

    ctx.fillStyle = TEXT_PRIMARY
    ctx.font = 'bold 14px Arial'
    ctx.fillText(value || '—', 48, rowY + 18)

    ctx.strokeStyle = BORDER
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(48, rowY + 30)
    ctx.lineTo(W - 48, rowY + 30)
    ctx.stroke()

    rowY += 52
  })

  // Footer
  ctx.fillStyle = ACCENT
  ctx.font = 'bold 11px Arial'
  ctx.textAlign = 'center'
  ctx.fillText('OFFICIAL PASS — NOT TRANSFERABLE', W / 2, H - 30)

  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      resolve({ blob, dataUrl: canvas.toDataURL('image/png') })
    }, 'image/png')
  })
}
