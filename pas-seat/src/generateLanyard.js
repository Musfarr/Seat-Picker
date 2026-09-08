const TEMPLATE_URL = 'https://mediaupload.convexinteractive.com/api/file/1788777860499-362886397.jpg'

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
  const photoCY = Math.round(H * 0.249)
  const photoR = Math.round(W * 0.250)

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

      // Teal / mint border ring matching template theme (#31B786)
      ctx.save()
      ctx.beginPath()
      ctx.arc(photoCX, photoCY, photoR, 0, Math.PI * 2)
      ctx.lineWidth = Math.round(W * 0.008)
      ctx.strokeStyle = '#31B786'
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
  ctx.textBaseline = 'middle'
  ctx.shadowColor = 'rgba(0,0,0,0.5)'
  ctx.shadowBlur = 4
  const textX = Math.round(W * 0.5)
  const maxTextW = Math.round(W * 0.84)

  // Helper for auto-scaling text to fit container
  function drawFittedText(
    text,
    x,
    y,
    maxW,
    baseFontSize,
    fontWeight = 'bold',
    fillStyle = '#FFFFFF',
    fontFamily = '"Montserrat", "Arial", sans-serif'
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
    startY = Math.round(H * 0.435)
  } else if (totalLines === 2) {
    startY = Math.round(H * 0.455)
  } else {
    startY = Math.round(H * 0.475)
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
      '"Montserrat", "Chakra Petch", "Arial", sans-serif'
    )
    currentY += Math.round(H * 0.040)
  }

  if (hasDesig) {
    drawFittedText(
      designation.trim(),
      textX,
      currentY,
      maxTextW,
      Math.round(W * 0.035),
      '500',
      '#FFFFFF',
      '"Montserrat", "Arial", sans-serif'
    )
    currentY += Math.round(H * 0.040)
  }

  if (hasCompany) {
    drawFittedText(
      companyName.trim(),
      textX,
      currentY,
      maxTextW,
      Math.round(W * 0.039),
      'bold',
      '#FFFFFF',
      '"Montserrat", "Arial", sans-serif'
    )
  }

  ctx.shadowBlur = 0

  // ── QR Code (Bottom Right inside white card, next to 'DON\'T FORGET TO REGISTER FOR THE BREAKOUTS') ──
  if (lanyardQrUrl) {
    try {
      const qrImg = await loadImage(lanyardQrUrl)
      const qrSize = Math.round(W * 0.235)
      const qrX = Math.round(W * 0.655)
      const qrY = Math.round(H * 0.794)

      // Crisp white backing pad for high contrast & reliable scanning
      const pad = Math.round(qrSize * 0.03)
      const borderRadius = Math.round(qrSize * 0.04)
      ctx.save()
      ctx.fillStyle = '#FFFFFF'
      ctx.beginPath()
      if (ctx.roundRect) {
        ctx.roundRect(qrX - pad, qrY - pad, qrSize + pad * 2, qrSize + pad * 2, borderRadius)
      } else {
        ctx.rect(qrX - pad, qrY - pad, qrSize + pad * 2, qrSize + pad * 2)
      }
      ctx.fill()
      ctx.restore()

      // Normalize QR modules to crisp black on white
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
        if (brightness < 160 && a > 50) {
          data[i] = 10     // R
          data[i + 1] = 10 // G
          data[i + 2] = 10 // B
          data[i + 3] = 255
        } else {
          data[i] = 255     // White
          data[i + 1] = 255
          data[i + 2] = 255
          data[i + 3] = 255
        }
      }
      qrCtx.putImageData(imgData, 0, 0)

      // Draw crisp QR on main canvas
      ctx.drawImage(qrCanvas, qrX, qrY, qrSize, qrSize)
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

