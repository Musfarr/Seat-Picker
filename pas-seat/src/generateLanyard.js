const TEMPLATE_URL = 'https://mediaupload.convexinteractive.com/api/file/1788528883475-16966852.png'

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = src
  })
}

export async function generateLanyard({
  name,
  imageUrl,
  image,
  designation,
  companyName,
  lanyardQrUrl,
}) {
  const userPhoto = imageUrl || image
  const template = await loadImage(TEMPLATE_URL)
  const MAX_WIDTH = 1400
  let W = template.naturalWidth || 1024
  let H = template.naturalHeight || 1536

  if (W > MAX_WIDTH) {
    const scale = MAX_WIDTH / W
    W = Math.round(W * scale)
    H = Math.round(H * scale)
  }

  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')

  // Draw template image as background
  ctx.drawImage(template, 0, 0, W, H)

  // ── Profile photo (top center circle) ──
  const photoCX = Math.round(W * 0.5)
  const photoCY = Math.round(H * 0.312)
  const photoR = Math.round(W * 0.2435)

  if (userPhoto) {
    try {
      const photo = await loadImage(userPhoto)
      const imgAspect = (photo.naturalWidth || photo.width) / (photo.naturalHeight || photo.height)
      let drawW, drawH, drawX, drawY

      // Object-fit cover inside circle
      if (imgAspect > 1) {
        drawH = photoR * 2
        drawW = drawH * imgAspect
        drawX = photoCX - drawW / 2
        drawY = photoCY - photoR
      } else {
        drawW = photoR * 2
        drawH = drawW / imgAspect
        drawX = photoCX - photoR
        drawY = photoCY - drawH / 2
      }

      ctx.save()
      ctx.beginPath()
      ctx.arc(photoCX, photoCY, photoR, 0, Math.PI * 2)
      ctx.clip()
      ctx.drawImage(photo, drawX, drawY, drawW, drawH)
      ctx.restore()

      // Yellow border ring matching theme
      ctx.save()
      ctx.beginPath()
      ctx.arc(photoCX, photoCY, photoR, 0, Math.PI * 2)
      ctx.lineWidth = Math.round(W * 0.009)
      ctx.strokeStyle = '#FED800'
      ctx.stroke()
      ctx.restore()
    } catch {
      // photo failed to load — skip
    }
  }

  try {
    if (document.fonts?.ready) {
      await document.fonts.ready
    }
  } catch {
    // fonts ready check failed — proceed
  }

  // ── Text Centered Alignment under image ──
  ctx.textAlign = 'center'
  ctx.shadowColor = 'rgba(0,0,0,0.85)'
  ctx.shadowBlur = 4
  const textX = Math.round(W * 0.5)
  const maxTextW = Math.round(W * 0.82)

  // Helper for auto-scaling text to fit container
  function drawFittedText(
    text,
    x,
    y,
    maxW,
    baseFontSize,
    fontWeight = 'bold',
    fillStyle = '#FFFFFF',
    fontFamily = '"Arial", "Montserrat", sans-serif'
  ) {
    let fontSize = baseFontSize
    ctx.font = `${fontWeight} ${fontSize}px ${fontFamily}`
    while (ctx.measureText(text).width > maxW && fontSize > 16) {
      fontSize -= 1
      ctx.font = `${fontWeight} ${fontSize}px ${fontFamily}`
    }
    ctx.fillStyle = fillStyle
    ctx.fillText(text, x, y)
    return fontSize
  }

  // ── Name & Designation below photo ──
  const hasName = Boolean(name && name.trim())
  const hasDesig = Boolean(designation && designation.trim())
  const hasCompany = Boolean(companyName && companyName.trim())
  const totalLines = (hasName ? 1 : 0) + (hasDesig ? 1 : 0) + (hasCompany ? 1 : 0)

  let startY
  if (totalLines === 3) {
    startY = Math.round(H * 0.540)
  } else if (totalLines === 2) {
    startY = Math.round(H * 0.555)
  } else {
    startY = Math.round(H * 0.575)
  }

  let currentY = startY

  if (hasName) {
    drawFittedText(
      name.trim().toUpperCase(),
      textX,
      currentY,
      maxTextW,
      Math.round(W * 0.054),
      'bold',
      '#FED800',
      '"Jersey 25", "Chakra Petch", "Graduate", "Arial Black", sans-serif'
    )
    currentY += Math.round(H * 0.038)
  }

  if (hasDesig) {
    drawFittedText(
      designation.trim(),
      textX,
      currentY,
      maxTextW,
      Math.round(W * 0.035),
      'bold',
      '#FFFFFF',
      '"Montserrat", "Arial", sans-serif'
    )
    currentY += Math.round(H * 0.033)
  }

  if (hasCompany) {
    drawFittedText(
      companyName.trim(),
      textX,
      currentY,
      maxTextW,
      Math.round(W * 0.031),
      '500',
      'rgba(255, 255, 255, 0.92)',
      '"Montserrat", "Arial", sans-serif'
    )
  }

  ctx.shadowBlur = 0

  // ── QR Code (Bottom Left: Yellow + Transparent + Yellow Border, on left of 'THE MADNESS AWAITS') ──
  if (lanyardQrUrl) {
    try {
      const qrImg = await loadImage(lanyardQrUrl)
      const qrSize = Math.round(W * 0.165)
      const qrX = Math.round(W * 0.058)
      const qrY = Math.round(H * 0.828)

      // Transform QR image to yellow modules with transparent background
      const qrCanvas = document.createElement('canvas')
      const qW = qrImg.naturalWidth || qrImg.width || 512
      const qH = qrImg.naturalHeight || qrImg.height || 512
      qrCanvas.width = qW
      qrCanvas.height = qH
      const qrCtx = qrCanvas.getContext('2d')
      qrCtx.drawImage(qrImg, 0, 0, qW, qH)

      const imgData = qrCtx.getImageData(0, 0, qW, qH)
      const data = imgData.data
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i]
        const g = data[i + 1]
        const b = data[i + 2]
        const a = data[i + 3]

        const brightness = (r + g + b) / 3
        // If dark module / QR pattern
        if (brightness < 128 && a > 50) {
          data[i] = 254     // R (#FED800 yellow)
          data[i + 1] = 216 // G
          data[i + 2] = 0   // B
          data[i + 3] = 255 // A
        } else {
          // Transparent background
          data[i + 3] = 0
        }
      }
      qrCtx.putImageData(imgData, 0, 0)

      // Draw tinted QR on main canvas
      ctx.drawImage(qrCanvas, qrX, qrY, qrSize, qrSize)

      // Draw yellow rounded border matching mockup
      const pad = Math.round(qrSize * 0.05)
      const borderRadius = Math.round(qrSize * 0.08)
      ctx.save()
      ctx.strokeStyle = '#FED800'
      ctx.lineWidth = Math.max(2, Math.round(W * 0.0035))
      ctx.beginPath()
      if (ctx.roundRect) {
        ctx.roundRect(qrX - pad, qrY - pad, qrSize + pad * 2, qrSize + pad * 2, borderRadius)
      } else {
        ctx.rect(qrX - pad, qrY - pad, qrSize + pad * 2, qrSize + pad * 2)
      }
      ctx.stroke()
      ctx.restore()
    } catch {
      // QR failed to load — skip
    }
  }

  return new Promise((resolve) => {
    canvas.toBlob(
      (blob) => {
        resolve({ blob })
      },
      'image/jpeg',
      0.85
    )
  })
}

