const TEMPLATE_URL = 'https://mediaupload.convexinteractive.com/api/file/1791294977625-518627825.png'

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
  session1,
  session1Speaker,
  session2,
  session2Speaker,
  session3,
  session3Speaker,
  sessions: customSessions,
}) {
  const userPhoto = imageUrl || image
  const template = await loadImage(TEMPLATE_URL)
  const MAX_WIDTH = 1400
  let W = template.naturalWidth || 900
  let H = template.naturalHeight || 1500

  if (W > MAX_WIDTH) {
    const scale = MAX_WIDTH / W
    W = Math.round(W * scale)
    H = Math.round(H * scale)
  }

  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')

  // 1. Draw template background
  ctx.drawImage(template, 0, 0, W, H)

  // 2. Profile photo (top center circle fitting inside template yellow ring)
  const photoCX = Math.round(W * 0.508)
  const photoCY = Math.round(H * 0.266)
  const photoR = Math.round(W * 0.248)

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

      // Subtle yellow accent ring around clipped photo to ensure clean edge
      ctx.save()
      ctx.beginPath()
      ctx.arc(photoCX, photoCY, photoR, 0, Math.PI * 2)
      ctx.lineWidth = Math.max(2, Math.round(W * 0.005))
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

  // 3. Helper for auto-scaling text to fit container
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
    while (ctx.measureText(text).width > maxW && fontSize > 13) {
      fontSize -= 1
      ctx.font = `${fontWeight} ${fontSize}px ${fontFamily}`
    }
    ctx.fillStyle = fillStyle
    ctx.fillText(text, x, y)
    return fontSize
  }

  // 4. Attendee Name, Designation, and Company (centered in blue area below photo)
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.shadowColor = 'rgba(0,0,0,0.55)'
  ctx.shadowBlur = 4
  const textX = Math.round(W * 0.5)
  const maxTextW = Math.round(W * 0.84)

  const hasName = Boolean(name && name.trim())
  const hasDesig = Boolean(designation && designation.trim())
  const hasCompany = Boolean(companyName && companyName.trim())
  const totalLines = (hasName ? 1 : 0) + (hasDesig ? 1 : 0) + (hasCompany ? 1 : 0)

  let startY
  if (totalLines === 3) {
    startY = Math.round(H * 0.472)
  } else if (totalLines === 2) {
    startY = Math.round(H * 0.485)
  } else {
    startY = Math.round(H * 0.500)
  }

  let currentY = startY

  if (hasName) {
    drawFittedText(
      name.trim().toUpperCase(),
      textX,
      currentY,
      maxTextW,
      Math.round(W * 0.051),
      'bold',
      '#FED800',
      '"Montserrat", "Chakra Petch", "Arial", sans-serif'
    )
    currentY += Math.round(H * 0.033)
  }

  if (hasDesig) {
    drawFittedText(
      designation.trim(),
      textX,
      currentY,
      maxTextW,
      Math.round(W * 0.031),
      '500',
      '#FFFFFF',
      '"Montserrat", "Arial", sans-serif'
    )
    currentY += Math.round(H * 0.030)
  }

  if (hasCompany) {
    drawFittedText(
      companyName.trim(),
      textX,
      currentY,
      maxTextW,
      Math.round(W * 0.036),
      'bold',
      '#FFFFFF',
      '"Montserrat", "Arial", sans-serif'
    )
  }

  ctx.shadowBlur = 0

  // 5. White card contents
  const sessionLeftX = Math.round(W * 0.08)
  const sessionMaxW = Math.round(W * 0.58)

  // 5a. QR Code on right side of card
  if (lanyardQrUrl) {
    try {
      const qrImg = await loadImage(lanyardQrUrl)
      const qrSize = Math.round(W * 0.22)
      const qrX = Math.round(W * 0.69)
      // Vertically center QR in card (card is y: 873 to 1312)
      const qrY = Math.round(1092 - qrSize / 2)

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

  // 5b. Breakout Sessions or Default Notice on left side of card
  const rawSessions = (Array.isArray(customSessions) && customSessions.length > 0)
    ? customSessions
    : [
      { title: session1, speaker: session1Speaker },
      { title: session2, speaker: session2Speaker },
      { title: session3, speaker: session3Speaker },
    ]

  const availableSessions = rawSessions
    .map((s, idx) => {
      if (!s) return null
      if (typeof s === 'string') {
        return { title: s.trim(), speaker: '', id: idx + 1 }
      }
      return {
        title: (s.title || s.topic || '').trim(),
        speaker: (s.speaker || '').trim(),
        id: s.id || idx + 1,
      }
    })
    .filter(s => Boolean(s && s.title))

  if (availableSessions.length > 0) {
    ctx.textAlign = 'left'
    ctx.textBaseline = 'top'
    ctx.shadowBlur = 0

    // Header: BREAKOUT REGISTRATIONS
    const headerFontSize = Math.round(W * 0.031) // ~28px
    ctx.font = `bold ${headerFontSize}px "Montserrat", "Arial", sans-serif`
    ctx.fillStyle = '#2B3594'
    const headerY = 905
    ctx.fillText('BREAKOUT REGISTRATIONS', sessionLeftX, headerY)

    // Divider line under header
    ctx.fillStyle = '#CBD5E1'
    ctx.fillRect(sessionLeftX, 938, sessionMaxW, 1.5)

    const titleFontFamily = '"Montserrat", "Arial", sans-serif'
    const titleBaseFontSize = Math.round(W * 0.028) // ~25px
    const speakerFontSize = Math.round(W * 0.021)   // ~19px

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
      while (lines.length > 2 && size > 13) {
        size -= 1
        lines = testLines(size)
      }
      if (lines.length > 2) {
        lines = [lines[0], lines.slice(1).join(' ')]
      }
      return { lines, fontSize: size }
    }

    // Pre-calculate heights to distribute spacing evenly and prevent bottom overflow
    const preparedSessions = availableSessions.slice(0, 3).map(s => {
      const title = s.title || 'Breakout Session'
      const { lines, fontSize } = wrapTitleToLines(title, sessionMaxW, titleBaseFontSize)
      const lineHeight = Math.round(fontSize * 1.2)
      const titleH = lines.length * lineHeight
      const hasSpeaker = Boolean(s.speaker)
      const speakerH = hasSpeaker ? Math.round(speakerFontSize * 1.2) : 0
      const totalH = titleH + (hasSpeaker ? 4 + speakerH : 0)
      return {
        ...s,
        title,
        lines,
        fontSize,
        lineHeight,
        totalH,
      }
    })

    const count = preparedSessions.length
    const startY = count === 1 ? 1075 : (count === 2 ? 985 : 955)
    const availableH = 1285 - startY
    const sumH = preparedSessions.reduce((acc, item) => acc + item.totalH, 0)
    const gap = count > 1 ? Math.min(48, Math.max(16, Math.round((availableH - sumH) / (count - 1)))) : 0

    let curY = startY
    preparedSessions.forEach((s) => {
      let textY = curY

      // Draw title lines
      s.lines.forEach((line) => {
        drawFittedText(
          line,
          sessionLeftX,
          textY,
          sessionMaxW,
          s.fontSize,
          'bold',
          '#2B3594',
          titleFontFamily
        )
        textY += s.lineHeight
      })

      // Draw speaker
      if (s.speaker) {
        const cleanSpeaker = s.speaker.replace(/^Speaker:\s*/i, '').trim()
        const speakerText = `Speaker: ${cleanSpeaker}`
        drawFittedText(
          speakerText,
          sessionLeftX,
          textY + 4,
          sessionMaxW,
          speakerFontSize,
          '600',
          '#4B5563',
          titleFontFamily
        )
      }

      curY += s.totalH + gap
    })
  } else {
    // If no breakout sessions selected, show reminder text
    ctx.textAlign = 'left'
    ctx.textBaseline = 'middle'
    ctx.shadowBlur = 0

    const reminderLines = ["DON'T FORGET TO", 'REGISTER FOR', 'THE BREAKOUTS']
    const reminderFontSize = Math.round(W * 0.034)
    const lineSpacing = Math.round(reminderFontSize * 1.35)
    let remY = 1045

    reminderLines.forEach(line => {
      drawFittedText(
        line,
        sessionLeftX,
        remY,
        sessionMaxW,
        reminderFontSize,
        '900',
        '#2B3594',
        '"Montserrat", "Arial", sans-serif'
      )
      remY += lineSpacing
    })
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
