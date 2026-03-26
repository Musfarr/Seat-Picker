import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { allocateCorporateSeat, uploadFile, sendLanyardWhatsapp } from '../api'
import { generateLanyard } from '../generateLanyard'

const FIELDS = [
  { name: 'Full_Name',    label: 'Full Name',       type: 'text',  required: true,  placeholder: 'John Doe' },
  { name: 'CNIC_Number',  label: 'CNIC Number',     type: 'text',  required: true,  placeholder: '41323-1393332-4' },
  { name: 'phone_number', label: 'Phone Number',    type: 'tel',   required: true,  placeholder: '923344342234' },
  { name: 'Company_Name', label: 'Company Name',    type: 'text',  required: true,  placeholder: 'Acme Corp' },
  { name: 'Designation',  label: 'Designation',     type: 'text',  required: false, placeholder: 'Engineer' },
]

function validateForm(form) {
  const errors = {}

  if (!form.Full_Name || form.Full_Name.trim() === '') {
    errors.Full_Name = 'Full Name is required'
  }

  if (!form.CNIC_Number || form.CNIC_Number.trim() === '') {
    errors.CNIC_Number = 'CNIC Number is required'
  } else if (!/^\d{5}-\d{7}-\d{1}$/.test(form.CNIC_Number.trim())) {
    errors.CNIC_Number = 'CNIC format: 41323-1393332-4'
  }

  if (!form.phone_number || form.phone_number.trim() === '') {
    errors.phone_number = 'Phone Number is required'
  } else if (!/^92\d{10}$/.test(form.phone_number.trim())) {
    errors.phone_number = 'Phone must start with 92 and have 12 digits total'
  }

  if (!form.Company_Name || form.Company_Name.trim() === '') {
    errors.Company_Name = 'Company Name is required'
  }

  return errors
}

export default function CorporateForm() {
  const { id: corporateId } = useParams()

  const [form, setForm] = useState({
    Full_Name: '', CNIC_Number: '', phone_number: '', Company_Name: '', Designation: '',
  })
  const [imageFile, setImageFile] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [step, setStep] = useState('')
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})

  function handleChange(e) {
    const { name } = e.target
    setForm(prev => ({ ...prev, [name]: e.target.value }))
    if (fieldErrors[name]) {
      setFieldErrors(prev => ({ ...prev, [name]: '' }))
    }
  }

  function handleImage(e) {
    const file = e.target.files[0]
    if (!file) return
    setImageFile(file)
    setImagePreview(URL.createObjectURL(file))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setFieldErrors({})

    const errors = validateForm(form)
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors)
      return
    }

    setUploading(true)
    try {
      let imageUrl = null

      // if (imageFile) {
      //   setStep('Uploading your photo...')
      //   const { url } = await uploadFile(imageFile, imageFile.name)
      //   imageUrl = url
      // }

      setStep('Allocating your seat...')
      
      const { seatNumber } = await allocateCorporateSeat({
        corporateId,
        phone: form.phone_number,
        image: imageUrl,
        name: form.Full_Name,
        cnic: form.CNIC_Number,
        designation: form.Designation,
        companyName: form.Company_Name,
        type: "Corporate"
      })

      setStep('Generating your pass...')
      const { blob } = await generateLanyard({
        name: form.Full_Name,
        cnic: form.CNIC_Number,
        seatNumber,
        imageUrl,
        designation: form.Designation,
        companyName: form.Company_Name,
      })

      setStep('Uploading your pass...')
      const { url: lanyardUrl } = await uploadFile(blob, `lanyard-${form.phone_number}.png`)

      setStep('Sending your pass via WhatsApp...')
      await sendLanyardWhatsapp({ contactNumber: form.phone_number, lanyardUrl })

      setDone(true)
    } catch (err) {
      console.error('Form error:', err)
      setError(err?.response?.data?.message || err.message || 'Something went wrong')
    } finally {
      setUploading(false)
      setStep('')
    }
  }

  if (done) {
    return (
      <div className="app-bg">
        <div className="done-card" style={{ margin: 'auto', marginTop: '10vh' }}>
          <div className="done-check">✓</div>
          <h2 className="done-title">You're all set!</h2>
          <p className="done-sub">
            Your pass has been sent via WhatsApp to<br />
            <strong>{form.phone_number}</strong>
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="app-bg" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem 1rem' }}>
      <div className="confirm-content" style={{ width: '100%', maxWidth: 440 }}>
        <h2 className="confirm-title" style={{ marginBottom: '0.25rem' }}>Complete Your Booking</h2>
        <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.8rem', margin: '0 0 1.5rem' }}>
          Fill in your details to receive your seat pass
        </p>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

          {/* Photo upload */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <label style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.75rem', letterSpacing: '0.04em' }}>
              PHOTO (optional)
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              {imagePreview
                ? <img src={imagePreview} alt="preview" style={{ width: 56, height: 56, borderRadius: '50%', objectFit: 'cover', border: '2px solid rgba(218,165,32,0.7)' }} />
                : <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#1e293b', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.3)', fontSize: '1.4rem' }}>👤</div>
              }
              <label style={{ cursor: 'pointer', color: '#facc15', fontSize: '0.82rem', border: '1px solid rgba(250,204,21,0.4)', borderRadius: 6, padding: '6px 14px' }}>
                Choose Photo
                <input type="file" accept="image/*" onChange={handleImage} style={{ display: 'none' }} />
              </label>
            </div>
          </div>

          {/* Text fields */}
          {FIELDS.map(({ name, label, type, required, placeholder }) => (
            <div key={name} style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
              <label htmlFor={name} style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.75rem', letterSpacing: '0.04em' }}>
                {label.toUpperCase()}{required && ' *'}
              </label>
              <input
                id={name}
                name={name}
                type={type}
                required={required}
                placeholder={placeholder}
                value={form[name]}
                onChange={handleChange}
                style={{
                  background: '#0f1829',
                  border: fieldErrors[name] ? '1px solid #fca5a5' : '1px solid #1e293b',
                  borderRadius: 8,
                  color: '#fff',
                  padding: '10px 14px',
                  fontSize: '0.9rem',
                  outline: 'none',
                  width: '100%',
                  boxSizing: 'border-box',
                }}
              />
              {fieldErrors[name] && (
                <span style={{ color: '#fca5a5', fontSize: '0.75rem', marginTop: '-0.25rem' }}>
                  {fieldErrors[name]}
                </span>
              )}
            </div>
          ))}

          {error && (
            <p style={{ color: '#fca5a5', fontSize: '0.82rem', margin: 0 }}>{error}</p>
          )}

          {uploading ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '0.5rem' }}>
              <div className="spinner" style={{ width: 22, height: 22, borderWidth: 3 }} />
              <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.85rem' }}>{step}</span>
            </div>
          ) : (
            <button type="submit" className="confirm-ok" style={{ marginTop: '0.5rem', width: '100%' }}>
              Submit &amp; Get My Pass
            </button>
          )}
        </form>
      </div>
    </div>
  )
}
