import axios from 'axios'

const LOGIN_URL = 'https://portal.berrytalks.com/api/auth/client/login'
const BROADCAST_URL = 'https://broadcast.convexinteractive.com/api/broadcast/send'
const TEMPLATE_ID = '1614007330125849'

const SEATS_URL = 'http://localhost:8000/api/seats-data'
const BOOK_URL = 'http://localhost:8000/api/book-seat'
const BOOKING_DATA_URL = 'http://localhost:8000/api/booking-data'
const VALIDATE_TOKEN_URL = 'http://localhost:8000/api/validate-token'

const UPLOAD_API_URL = 'https://mediaupload.convexinteractive.com/api/upload'
const BASE_URL = 'https://mediaupload.convexinteractive.com'

const LOGIN_EMAIL = 'apiadstreet@gmail.com'
const LOGIN_PASSWORD = '2inK4QQiAU@'

const TEMPLATE_IMAGE_URL = 'https://mediaupload.convexinteractive.com/api/file/1786977606323-362082422.jpeg'

/* Fetch seat availability from backend DB */
export async function fetchSeatsData() {
  const res = await axios.get(SEATS_URL, { withCredentials: false })
  const data = res.data
  return Array.isArray(data) ? data : (data.seats || [])
}

/* Validate encrypted invitation token and get seat quota / tracking */
export async function validateToken(token) {
  const res = await axios.post(VALIDATE_TOKEN_URL, { token }, {
    headers: { 'Content-Type': 'application/json' },
  })
  return res.data
}

/* Book individual seat: { token, seatNumber, phone, name, companyName, ... } */
export async function bookSeats(payload) {
  const res = await axios.post(BOOK_URL, payload, {
    headers: { 'Content-Type': 'application/json' },
  })
  return res.data
}

/* Legacy stubs for unused routes if visited */
export async function allocateCorporateSeat(payload) { return bookSeats(payload) }
export async function bookCorporate(payload) { return bookSeats(payload) }
export async function sendReservedEmail(payload) { return true }
export async function checkToken(token) { return validateToken(token) }
export async function saveToken(token, userId) { return true }

/* Get booking data for profile display */
export async function getBookingData(userId) {
  const res = await axios.post(BOOKING_DATA_URL, { UserId: userId }, {
    headers: { 'Content-Type': 'application/json' },
  })
  return res.data
}

async function getAccessToken() {
  const res = await axios.post(LOGIN_URL, { email: LOGIN_EMAIL, password: LOGIN_PASSWORD })
  const token = res.data?.data?.accessToken
  if (!token) throw new Error('Login failed: no accessToken in response')
  return token
}



export async function sendLinkWhatsapp({ contactNumber, numberofseats, FinalURL }) {

  const accessToken = await getAccessToken()

  await axios.post(
    BROADCAST_URL,
    {
      to: contactNumber,
      templateId: "1072390301848926",
      param: [
        {
          componentType: "body",
          parameters: [
            {
              type: "text",
              value: numberofseats
            },
            {
              type: "text",
              value: FinalURL
            }
          ]
        }
      ]
    },
    { headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' } }
  )

  return true


}

/* Send lanyard image via WhatsApp */
export async function sendLanyardWhatsapp({ contactNumber, lanyardUrl }) {
  const accessToken = await getAccessToken()
  await axios.post(
    BROADCAST_URL,
    {
      to: contactNumber,
      templateId: TEMPLATE_ID,
      param: [
        {
          parameters: [{ value: lanyardUrl || TEMPLATE_IMAGE_URL, type: 'image' }],
          componentType: 'header',
          buttonType: null,
          index: null,
        },
      ],
    },
    { headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' } }
  )
}

export async function uploadFile(blob, fileName = 'lanyard.png') {
  try {
    const formData = new FormData()
    formData.append('file', blob, fileName)

    const response = await axios.post(UPLOAD_API_URL, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })

    if (response.status === 200) {
      return {
        url: BASE_URL + response.data.url,
        fileName: response.data.name,
      }
    } else {
      throw new Error('File upload failed')
    }
  } catch (error) {
    console.error('Upload error:', error)
    throw error
  }
}
