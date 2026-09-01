const TEMPLATE_URL = 'https://mediaupload.convexinteractive.com/api/file/1787225469897-40511096.jpg'

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
 * @param {string} opts.name         - Attendee full name
 * @param {string} opts.companyName  - Attendee company
 * @param {string} opts.session1     - Session 1 topic title
 * @param {string} opts.session1Speaker
 * @param {string} opts.session2     - Session 2 topic title
 * @param {string} opts.session2Speaker
 * @param {string} opts.session3     - Session 3 topic title
 * @param {string} opts.session3Speaker
 * @param {string} [opts.lanyardQrUrl]  - QR code CDN URL
 */
export async function generateBreakoutLanyard({
  name,
  companyName,
  session1,
  session1Speaker,
  session2,
  session2Speaker,
  session3,
  session3Speaker,
  lanyardQrUrl,
}) {
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

  // ── Draw template background ──
  ctx.drawImage(template, 0, 0, W, H)

  try {
    if (document.fonts?.ready) await document.fonts.ready
  } catch (_) { }

  // ── Helper: auto-shrink text to fit width ──
  function drawFittedText(text, x, y, maxW, baseFontSize, fontWeight = 'bold', fillStyle = '#FFFFFF', fontFamily = '"Arial", "Montserrat", sans-serif') {
    let fontSize = baseFontSize
    ctx.font = `${fontWeight} ${fontSize}px ${fontFamily}`
    while (ctx.measureText(text).width > maxW && fontSize > 14) {
      fontSize -= 1
      ctx.font = `${fontWeight} ${fontSize}px ${fontFamily}`
    }
    ctx.fillStyle = fillStyle
    ctx.fillText(text, x, y)
    return fontSize
  }

  // ── "BREAKOUT PASS" badge (top area, where photo circle would be) ──
  const badgeCX = Math.round(W * 0.32)
  const badgeCY = Math.round(H * 0.32)
  const badgeW = Math.round(W * 0.38)
  const badgeH = Math.round(H * 0.07)
  const badgeX = badgeCX - badgeW / 2
  const badgeY = badgeCY - badgeH / 2

  // Rounded rect badge background
  ctx.save()
  ctx.fillStyle = '#FED800'
  const r = Math.round(badgeH * 0.35)
  ctx.beginPath()
  if (ctx.roundRect) {
    ctx.roundRect(badgeX, badgeY, badgeW, badgeH, r)
  } else {
    ctx.rect(badgeX, badgeY, badgeW, badgeH)
  }
  ctx.fill()
  ctx.restore()

  // Badge text
  ctx.save()
  ctx.textAlign = 'center'
  ctx.shadowColor = 'rgba(0,0,0,0.3)'
  ctx.shadowBlur = 2
  ctx.fillStyle = '#000000'
  const badgeFontSize = Math.round(H * 0.028)
  ctx.font = `900 ${badgeFontSize}px "Jersey 25", "Chakra Petch", "Arial Black", sans-serif`
  ctx.fillText('BREAKOUT PASS', badgeCX, badgeCY + badgeFontSize * 0.35)
  ctx.restore()

  // ── Left-aligned text area ──
  ctx.textAlign = 'left'
  ctx.shadowColor = 'rgba(0,0,0,0.85)'
  ctx.shadowBlur = 4
  const textX = Math.round(W * 0.08)
  const maxTextW = Math.round(W * 0.55)

  // Name (gold, large)
  const nameY = Math.round(H * 0.555)
  if (name) {
    drawFittedText(
      name.toUpperCase(),
      textX,
      nameY,
      maxTextW,
      Math.round(W * 0.052),
      'bold',
      '#FED800',
      '"Jersey 25", "Chakra Petch", "Graduate", "Arial Black", sans-serif'
    )
  }

  // Company (white, below name)
  const companyY = nameY + Math.round(H * 0.036)
  if (companyName) {
    drawFittedText(
      companyName,
      textX,
      companyY,
      maxTextW,
      Math.round(W * 0.032),
      '500',
      'rgba(255, 255, 255, 0.90)',
      '"Arial", "Montserrat", sans-serif'
    )
  }

  ctx.shadowBlur = 0

  // ── Session slots ──
  const sessions = [
    { label: 'SESSION 1', topic: session1, speaker: session1Speaker },
    { label: 'SESSION 2', topic: session2, speaker: session2Speaker },
    { label: 'SESSION 3', topic: session3, speaker: session3Speaker },
  ]

  const slotStartY = companyY + Math.round(H * 0.045)
  const slotGap = Math.round(H * 0.062)
  const slotLabelSize = Math.round(W * 0.022)
  const slotTopicSize = Math.round(W * 0.028)
  const slotSpeakerSize = Math.round(W * 0.021)

  // sessions.forEach((s, i) => {
  //   const baseY = slotStartY + i * slotGap

  //   // Session label (e.g. "SESSION 1") — dim gold
  //   ctx.font = `bold ${slotLabelSize}px "Arial", sans-serif`
  //   ctx.fillStyle = 'rgba(254, 216, 0, 0.65)'
  //   ctx.shadowColor = 'rgba(0,0,0,0.7)'
  //   ctx.shadowBlur = 3
  //   ctx.fillText(s.label, textX, baseY)

  //   // Topic title — white bold
  //   if (s.topic) {
  //     drawFittedText(
  //       s.topic,
  //       textX,
  //       baseY + Math.round(H * 0.022),
  //       maxTextW,
  //       slotTopicSize,
  //       'bold',
  //       '#FFFFFF',
  //       '"Arial", "Montserrat", sans-serif'
  //     )
  //   }

  //   // Speaker — white/60
  //   if (s.speaker) {
  //     ctx.font = `${slotSpeakerSize}px "Arial", sans-serif`
  //     ctx.fillStyle = 'rgba(255, 255, 255, 0.65)'
  //     ctx.shadowBlur = 2
  //     ctx.fillText(s.speaker, textX, baseY + Math.round(H * 0.041))
  //   }
  // })

  ctx.shadowBlur = 0

  // ── QR Code (bottom-left, yellow-tinted) ──
  if (lanyardQrUrl) {
    try {
      const qrImg = await loadImage(lanyardQrUrl)
      const qrX = Math.round(W * 0.078)
      const qrY = Math.round(H * 0.842)
      const qrSize = Math.round(W * 0.145)

      // Tint QR to yellow modules on transparent bg
      const qrCanvas = document.createElement('canvas')
      const qW = qrImg.naturalWidth || qrImg.width || 512
      const qH = qrImg.naturalHeight || qrImg.height || 512
      qrCanvas.width = qW
      qrCanvas.height = qH
      const qrCtx = qrCanvas.getContext('2d')
      qrCtx.drawImage(qrImg, 0, 0, qW, qH)
      const imgData = qrCtx.getImageData(0, 0, qW, qH)
      const px = imgData.data
      for (let i = 0; i < px.length; i += 4) {
        const brightness = (px[i] + px[i + 1] + px[i + 2]) / 3
        if (brightness < 128 && px[i + 3] > 50) {
          px[i] = 254; px[i + 1] = 216; px[i + 2] = 0; px[i + 3] = 255
        } else {
          px[i + 3] = 0
        }
      }
      qrCtx.putImageData(imgData, 0, 0)
      ctx.drawImage(qrCanvas, qrX, qrY, qrSize, qrSize)

      // Border
      const pad = Math.round(qrSize * 0.05)
      const br = Math.round(qrSize * 0.08)
      ctx.save()
      ctx.strokeStyle = '#FED800'
      ctx.lineWidth = Math.max(2, Math.round(W * 0.0035))
      ctx.beginPath()
      if (ctx.roundRect) {
        ctx.roundRect(qrX - pad, qrY - pad, qrSize + pad * 2, qrSize + pad * 2, br)
      } else {
        ctx.rect(qrX - pad, qrY - pad, qrSize + pad * 2, qrSize + pad * 2)
      }
      ctx.stroke()
      ctx.restore()
    } catch (_) {
      // QR failed — skip silently
    }
  }

  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve({ blob }), 'image/jpeg', 0.85)
  })
}
