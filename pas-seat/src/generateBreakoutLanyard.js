const TEMPLATE_URL = 'https://mediaupload.convexinteractive.com/api/file/1788871792382-793157197.jpg'

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
 * Generate a breakout session pass on canvas.
 * @param {Object} opts
 * @param {string} [opts.name]            - Attendee full name
 * @param {string} [opts.designation]     - Attendee designation
 * @param {string} [opts.companyName]     - Attendee company
 * @param {string} [opts.imageUrl]        - Attendee profile photo URL
 * @param {string} [opts.image]           - Alternative photo prop
 * @param {string} [opts.session1]        - Session 1 topic title
 * @param {string} [opts.session1Speaker]
 * @param {string} [opts.session1Description]
 * @param {string} [opts.session2]        - Session 2 topic title
 * @param {string} [opts.session2Speaker]
 * @param {string} [opts.session2Description]
 * @param {string} [opts.session3]        - Session 3 topic title
 * @param {string} [opts.session3Speaker]
 * @param {string} [opts.session3Description]
 * @param {Array}  [opts.sessions]        - Array of session objects { title, speaker, description }
 * @param {string} [opts.lanyardQrUrl]    - QR code CDN URL
 */
export async function generateBreakoutLanyard({
  name,
  designation,
  companyName,
  imageUrl,
  image,
  session1,
  session1Speaker,
  session1Description,
  session1Venue,
  session2,
  session2Speaker,
  session2Description,
  session2Venue,
  session3,
  session3Speaker,
  session3Description,
  session3Venue,
  sessions: customSessions,
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

  // ── 1. Draw template background ──
  ctx.drawImage(template, 0, 0, W, H)

  // ── 2. Profile photo (top center circle) ──
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

  // ── Helper: auto-shrink text to fit width ──
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
    let fontSize = typeof baseFontSize === 'number' ? baseFontSize : parseInt(baseFontSize, 10) || 18
    ctx.font = `${fontWeight} ${fontSize}px ${fontFamily}`
    while (ctx.measureText(text).width > maxW && fontSize > 12) {
      fontSize -= 1
      ctx.font = `${fontWeight} ${fontSize}px ${fontFamily}`
    }
    ctx.fillStyle = fillStyle
    ctx.fillText(text, x, y)
    return fontSize
  }

  // ── 3. Attendee Text Centered Alignment under image ──
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.shadowColor = 'rgba(0,0,0,0.5)'
  ctx.shadowBlur = 4
  const textX = Math.round(W * 0.5)
  const maxTextW = Math.round(W * 0.84)

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

  // ── 4. QR Code (Bottom Right inside white card) ──
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
          data[i] = 10
          data[i + 1] = 10
          data[i + 2] = 10
          data[i + 3] = 255
        } else {
          data[i] = 255
          data[i + 1] = 255
          data[i + 2] = 255
          data[i + 3] = 255
        }
      }
      qrCtx.putImageData(imgData, 0, 0)
      ctx.drawImage(qrCanvas, qrX, qrY, qrSize, qrSize)
    } catch {
      // QR failed to load — skip
    }
  }

  // ── 5. Breakout Sessions (Left side of white card under BREAKOUT REGISTRATIONS) ──
  const rawSessions = (Array.isArray(customSessions) && customSessions.length > 0)
    ? customSessions
    : [
      { title: session1, venue: session1Venue || session1Speaker, speaker: session1Speaker, description: session1Description },
      { title: session2, venue: session2Venue || session2Speaker, speaker: session2Speaker, description: session2Description },
      { title: session3, venue: session3Venue || session3Speaker, speaker: session3Speaker, description: session3Description },
    ]

  const availableSessions = rawSessions
    .map((s, idx) => {
      if (!s) return null
      if (typeof s === 'string') {
        return { title: s.trim(), venue: 'Imperial Ballroom A', id: idx + 1 }
      }
      return {
        title: (s.title || s.topic || '').trim(),
        venue: (s.venue || s.speaker || s.description || '').trim(),
        speaker: (s.speaker || '').trim(),
        description: (s.description || '').trim(),
        id: s.id || idx + 1,
      }
    })
    .filter(s => Boolean(s && (s.title || s.venue || s.speaker || s.description)))

  if (availableSessions.length > 0) {
    ctx.textAlign = 'left'
    ctx.textBaseline = 'top'
    ctx.shadowBlur = 0

    const sessionLeftX = Math.round(W * 0.072) // ~65px
    const sessionMaxW = Math.round(W * 0.55)   // ~495px, leaves comfortable margin before QR at 590px
    const titleFontFamily = '"Montserrat", "Arial", sans-serif'
    const titleBaseFontSize = Math.round(W * 0.028) // ~18px

    // Function to wrap title into at most 2 lines
    function wrapTitleToLines(text, maxW, baseSize) {
      let size = baseSize

      function testLines(sz) {
        ctx.font = `bold ${sz}px ${titleFontFamily}`
        const words = text.trim().split(/\s+/)
        const lines = []
        let current = ''

        for (const w of words) {
          const test = current ? `${current} ${w}` : w
          if (ctx.measureText(test).width <= maxW) {
            current = test
          } else {
            if (current) lines.push(current)
            current = w
          }
        }
        if (current) lines.push(current)
        return lines
      }

      let lines = testLines(size)

      // If more than 2 lines, scale font down to fit into at most 2 lines
      while (lines.length > 2 && size > 13) {
        size -= 1
        lines = testLines(size)
      }

      if (lines.length > 2) {
        lines = [lines[0], lines.slice(1).join(' ')]
      }

      return { lines, fontSize: size }
    }

    // Dynamic vertical positions depending on available number of sessions
    let sessionYPositions = []
    if (availableSessions.length >= 3) {
      sessionYPositions = [1355, 1455, 1555]
    } else if (availableSessions.length === 2) {
      sessionYPositions = [1390, 1510]
    } else {
      sessionYPositions = [1450]
    }

    availableSessions.slice(0, 3).forEach((s, idx) => {
      const startY = sessionYPositions[idx]
      let currentY = startY

      const title = s.title || 'Breakout session'
      const { lines, fontSize } = wrapTitleToLines(title, sessionMaxW, titleBaseFontSize)
      const lineHeight = Math.round(fontSize * 1.25) // ~23px

      // Draw title lines in #2B3594
      lines.forEach((line) => {
        drawFittedText(
          line,
          sessionLeftX,
          currentY,
          sessionMaxW,
          fontSize,
          'bold',
          '#2B3594',
          titleFontFamily
        )
        currentY += lineHeight
      })

      // Draw Room line immediately below title
      const rawVenue = (s.venue || s.speaker || s.description || 'Imperial Ballroom A').trim()
      const cleanVenue = rawVenue.replace(/^Room:\s*/i, '').replace(/^Venue:\s*/i, '').trim() || 'Imperial Ballroom A'

      const roomFontSize = Math.round(W * 0.028) // ~16px
      const roomLabel = 'Room: '

      ctx.font = `bold ${roomFontSize}px ${titleFontFamily}`
      ctx.fillStyle = '#111111'
      ctx.fillText(roomLabel, sessionLeftX, currentY)

      const labelW = ctx.measureText(roomLabel).width
      const maxVenueW = sessionMaxW - labelW

      drawFittedText(
        cleanVenue,
        sessionLeftX + labelW,
        currentY,
        maxVenueW,
        roomFontSize,
        '500',
        '#333333',
        titleFontFamily
      )
    })
  }

  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve({ blob }), 'image/jpeg', 0.85)
  })
}
