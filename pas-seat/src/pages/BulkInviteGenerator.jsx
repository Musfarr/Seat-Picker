import { useState, useRef } from 'react'
import QRCode from 'qrcode'
import { bookSeats, uploadFile, sendReservedEmail } from '../api'
import { generateLanyard } from '../generateLanyard'

const PAS_LOGO_URL = `${window.location.origin}/test.jpeg`
const DELAY_MS = 600

function parseCSVLine(line) {
  const cols = []
  let cur = ''
  let inQ = false
  for (const ch of line) {
    if (ch === '"') inQ = !inQ
    else if (ch === ',' && !inQ) { cols.push(cur.trim()); cur = '' }
    else cur += ch
  }
  cols.push(cur.trim())
  return cols
}

function parseCSV(text) {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean)
  if (lines.length < 2) return []
  const headers = parseCSVLine(lines[0])
  return lines.slice(1).map(line => {
    const cols = parseCSVLine(line)
    const row = {}
    headers.forEach((h, i) => { row[h] = (cols[i] || '').trim() })
    return row
  })
}

function getFirstEmail(field) {
  return (field || '').replace(/>/g, '').split(/[;\s]+/).find(s => s.includes('@')) || ''
}

function buildSeat(row) {
  return `${(row['Table #'] || '').trim()}-${(row['Seat#'] || '').trim()}`
}

function buildName(row) {
  return [(row['Full Name'] || '').trim()].filter(Boolean).join(' ')
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)) }

const TBL = { borderCollapse: 'collapse', width: '100%', fontSize: '0.78rem' }
const TH = { padding: '6px 10px', textAlign: 'left', color: 'rgba(255,255,255,0.4)', borderBottom: '1px solid rgba(255,255,255,0.08)', fontWeight: 600, letterSpacing: '0.04em', whiteSpace: 'nowrap' }
const TD = { padding: '6px 10px', color: 'rgba(255,255,255,0.8)', borderBottom: '1px solid rgba(255,255,255,0.05)', verticalAlign: 'middle' }

export default function BulkInviteGenerator() {
  const [rows, setRows] = useState([])
  const [phase, setPhase] = useState('upload')
  const [curIdx, setCurIdx] = useState(0)
  const [curOp, setCurOp] = useState('')
  const [results, setResults] = useState([])
  const fileRef = useRef()
  const abortRef = useRef(false)

  const handleFile = file => {
    if (!file) return
    const reader = new FileReader()
    reader.onload = e => {
      const parsed = parseCSV(e.target.result)
      setRows(parsed)
      setPhase('preview')
    }
    reader.readAsText(file)
  }

  const processRow = async (row, i, total) => {
    const seat = buildSeat(row)
    const name = buildName(row)
    const email = getFirstEmail(row['Email'])
    const company = (row['Company'] || '').trim()
    const res = { seat, name, email, company, lanyardUrl: '', status: 'error', note: '' }

    try {
      setCurOp(`[${i + 1}/${total}] Booking seat ${seat}...`)
      const { booking } = await bookSeats({
        seatNumber: seat,
        phone: '923322876624',
        companyName: company || undefined,
        type: 'Individual',
        name,
        image: PAS_LOGO_URL,
      })

      setCurOp(`[${i + 1}/${total}] Generating QR for ${seat}...`)
      const profileUrl = `https://effie.convexinteractive.com/Profile/${booking}`
      const qrDataUrl = await QRCode.toDataURL(profileUrl, { width: 512, margin: 2 })
      const qrBlob = await (await fetch(qrDataUrl)).blob()
      const { url: lanyardQrUrl } = await uploadFile(qrBlob, `bqr-${booking}.png`)

      setCurOp(`[${i + 1}/${total}] Generating lanyard for ${name}...`)
      const { blob } = await generateLanyard({
        name,
        seatNumber: seat,
        imageUrl: PAS_LOGO_URL,
        companyName: company || undefined,
        lanyardQrUrl,
      })

      setCurOp(`[${i + 1}/${total}] Uploading lanyard...`)
      const slug = seat.replace(/[^a-z0-9]/gi, '-')
      const { url: lanyardUrl } = await uploadFile(blob, `bulk-${slug}.png`)
      res.lanyardUrl = lanyardUrl

      // setCurOp(`[${i + 1}/${total}] Sending email to ${email}...`)
      // try {
      //   await sendReservedEmail({ toEmail: email, name, seatNumber: seat, lanyardUrl })
      // } catch {
      //   res.note = 'email-failed'
      // }

      res.status = 'success'
    } catch (err) {
      res.status = 'error'
      res.note = err?.response?.data?.message || err.message || 'Unknown error'
    }
    return res
  }

  const handleRun = async () => {
    setPhase('running')
    setResults([])
    setCurIdx(0)
    abortRef.current = false
    const all = []
    for (let i = 0; i < rows.length; i++) {
      if (abortRef.current) break
      setCurIdx(i)
      const r = await processRow(rows[i], i, rows.length)
      all.push(r)
      setResults([...all])
      if (i < rows.length - 1) await sleep(DELAY_MS)
    }
    setPhase('done')
    setCurOp('')
  }

  const downloadCSV = () => {
    const header = ['Seat Number', 'Name', 'Email', 'Company', 'Lanyard URL', 'Status', 'Note']
    const content = [
      header.join(','),
      ...results.map(r =>
        [r.seat, r.name, r.email, r.company, r.lanyardUrl, r.status, r.note]
          .map(v => `"${String(v || '').replace(/"/g, '""')}"`)
          .join(',')
      ),
    ].join('\n')
    const blob = new Blob([content], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'bulk-invites-result.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  const successCount = results.filter(r => r.status === 'success').length
  const errorCount = results.filter(r => r.status === 'error').length
  const progress = rows.length ? Math.round(((curIdx + 1) / rows.length) * 100) : 0

  if (phase === 'upload') {
    return (
      <div className="app-bg" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem 1rem' }}>
        <div style={{ maxWidth: 460, width: '100%' }}>
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <h1 className="venue-title" style={{ marginBottom: 6 }}>Bulk Invite Generator</h1>
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.82rem' }}>
              Upload the RSVP CSV — generates all individual passes sequentially
            </p>
          </div>
          <div
            className="confirm-content"
            style={{ padding: '3rem 2rem', textAlign: 'center', cursor: 'pointer', border: '2px dashed rgba(255,255,255,0.12)', borderRadius: 16 }}
            onDragOver={e => e.preventDefault()}
            onDrop={e => { e.preventDefault(); handleFile(e.dataTransfer.files[0]) }}
            onClick={() => fileRef.current.click()}
          >
            <div style={{ fontSize: '2.8rem', marginBottom: '1rem' }}>📄</div>
            <p style={{ color: 'rgba(255,255,255,0.65)', margin: '0 0 0.5rem', fontWeight: 500 }}>Drop CSV file here</p>
            <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.8rem', margin: 0 }}>or click to browse</p>
            <input ref={fileRef} type="file" accept=".csv" style={{ display: 'none' }} onChange={e => handleFile(e.target.files[0])} />
          </div>
          <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.2)', fontSize: '0.75rem', marginTop: '1rem' }}>
            Expected columns: S. No. · Table # · Seat# · Email · Title · Full Name · Company
          </p>
        </div>
      </div>
    )
  }

  if (phase === 'preview') {
    return (
      <div className="app-bg" style={{ minHeight: '100vh', padding: '2rem 1rem' }}>
        <div style={{ maxWidth: 800, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
            <h1 className="venue-title" style={{ marginBottom: 6 }}>Bulk Invite Generator</h1>
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.82rem' }}>
              {rows.length} rows loaded — verify before running
            </p>
          </div>

          <div className="confirm-content" style={{ padding: '0.5rem', overflowX: 'auto', marginBottom: '1rem', maxHeight: '60vh', overflowY: 'auto' }}>
            <table style={TBL}>
              <thead style={{ position: 'sticky', top: 0, background: '#0b1120' }}>
                <tr>
                  {['#', 'Seat', 'Name (with Title)', 'Email', 'Company'].map(h => (
                    <th key={h} style={TH}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => (
                  <tr key={i}>
                    <td style={{ ...TD, color: 'rgba(255,255,255,0.25)' }}>{i + 1}</td>
                    <td style={{ ...TD, color: 'rgb(254,242,194)', fontWeight: 600 }}>{buildSeat(row)}</td>
                    <td style={TD}>{buildName(row)}</td>
                    <td style={{ ...TD, color: 'rgba(255,255,255,0.45)', fontSize: '0.72rem' }}>{getFirstEmail(row['Email'])}</td>
                    <td style={{ ...TD, color: 'rgba(255,255,255,0.45)' }}>{(row['Company'] || '').trim()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <button className="confirm-ok" style={{ flex: 1 }} onClick={handleRun}>
              ▶ Generate All {rows.length} Passes
            </button>
            <button
              onClick={() => { setRows([]); setPhase('upload') }}
              style={{ background: 'none', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 8, color: 'rgba(255,255,255,0.4)', padding: '10px 18px', cursor: 'pointer', fontSize: '0.85rem' }}
            >
              Change File
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (phase === 'running') {
    return (
      <div className="app-bg" style={{ minHeight: '100vh', padding: '2rem 1rem' }}>
        <div style={{ maxWidth: 700, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
            <h1 className="venue-title" style={{ marginBottom: 6 }}>Generating Passes...</h1>
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.82rem' }}>
              Row {curIdx + 1} of {rows.length}&nbsp;&nbsp;·&nbsp;&nbsp;
              <span style={{ color: '#4ade80' }}>{successCount} ✓</span>
              &nbsp;&nbsp;·&nbsp;&nbsp;
              <span style={{ color: '#fca5a5' }}>{errorCount} ✗</span>
            </p>
          </div>

          <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 99, height: 7, marginBottom: '0.75rem', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${progress}%`, background: 'rgb(254,242,194)', borderRadius: 99, transition: 'width 0.4s ease' }} />
          </div>
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.75rem', textAlign: 'center', marginBottom: '1.5rem', minHeight: 18 }}>{curOp}</p>

          {results.length > 0 && (
            <div className="confirm-content" style={{ padding: '0.5rem', maxHeight: 420, overflowY: 'auto' }}>
              <table style={TBL}>
                <thead>
                  <tr>
                    {['Seat', 'Name', 'Status', 'Note'].map(h => <th key={h} style={TH}>{h}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {[...results].reverse().map((r, i) => (
                    <tr key={i}>
                      <td style={{ ...TD, color: 'rgb(254,242,194)', fontWeight: 600 }}>{r.seat}</td>
                      <td style={TD}>{r.name}</td>
                      <td style={{ ...TD, color: r.status === 'success' ? '#4ade80' : '#fca5a5', fontWeight: 700 }}>
                        {r.status === 'success' ? '✓' : '✗'}
                      </td>
                      <td style={{ ...TD, color: 'rgba(255,255,255,0.35)', fontSize: '0.72rem' }}>{r.note}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="app-bg" style={{ minHeight: '100vh', padding: '2rem 1rem' }}>
      <div style={{ maxWidth: 860, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <div className="done-check" style={{ margin: '0 auto 1rem' }}>✓</div>
          <h1 className="venue-title" style={{ marginBottom: 6 }}>All Done!</h1>
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.85rem' }}>
            <span style={{ color: '#4ade80' }}>{successCount} successful</span>
            &nbsp;·&nbsp;
            <span style={{ color: errorCount > 0 ? '#fca5a5' : 'rgba(255,255,255,0.4)' }}>{errorCount} errors</span>
            &nbsp;·&nbsp; {results.length} total
          </p>
        </div>

        <div style={{ display: 'flex', gap: 10, marginBottom: '1.5rem' }}>
          <button className="confirm-ok" style={{ flex: 1 }} onClick={downloadCSV}>
            ⬇ Download Result CSV
          </button>
          <button
            onClick={() => { setRows([]); setResults([]); setPhase('upload') }}
            style={{ background: 'none', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 8, color: 'rgba(255,255,255,0.4)', padding: '10px 18px', cursor: 'pointer', fontSize: '0.85rem' }}
          >
            Start Over
          </button>
        </div>

        <div className="confirm-content" style={{ padding: '0.5rem', overflowX: 'auto', maxHeight: '60vh', overflowY: 'auto' }}>
          <table style={TBL}>
            <thead style={{ position: 'sticky', top: 0, background: '#0b1120' }}>
              <tr>
                {['Seat', 'Name', 'Email', 'Company', 'Status', 'Lanyard', 'Note'].map(h => (
                  <th key={h} style={TH}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {results.map((r, i) => (
                <tr key={i}>
                  <td style={{ ...TD, color: 'rgb(254,242,194)', fontWeight: 600 }}>{r.seat}</td>
                  <td style={TD}>{r.name}</td>
                  <td style={{ ...TD, color: 'rgba(255,255,255,0.45)', fontSize: '0.72rem' }}>{r.email}</td>
                  <td style={{ ...TD, color: 'rgba(255,255,255,0.45)' }}>{r.company}</td>
                  <td style={{ ...TD, color: r.status === 'success' ? '#4ade80' : '#fca5a5', fontWeight: 700 }}>
                    {r.status === 'success' ? '✓ OK' : '✗ Error'}
                  </td>
                  <td style={TD}>
                    {r.lanyardUrl
                      ? <a href={r.lanyardUrl} target="_blank" rel="noreferrer" style={{ color: 'rgb(254,242,194)', fontSize: '0.72rem', textDecoration: 'none' }}>View ↗</a>
                      : <span style={{ color: 'rgba(255,255,255,0.2)' }}>—</span>}
                  </td>
                  <td style={{ ...TD, color: 'rgba(255,255,255,0.3)', fontSize: '0.72rem' }}>{r.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
