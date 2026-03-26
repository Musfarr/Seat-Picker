import axios from 'axios'

const LOGIN_URL = 'https://qaomni.convexinteractive.com/api/auth/client/login'
const BROADCAST_URL = 'https://qaomni.convexinteractive.com/api/broadcast/send'
const TEMPLATE_ID = '4184359858374924'

// const SEATS_URL           = 'https://a732-103-197-46-226.ngrok-free.app/api/seats-data'
// const BOOK_URL            = 'https://a732-103-197-46-226.ngrok-free.app/api/book-seat'
// const BOOK_CORPORATE_URL  = 'https://a732-103-197-46-226.ngrok-free.app/api/book-corporate'
// const ALLOCATE_URL        = 'https://a732-103-197-46-226.ngrok-free.app/api/book-corporate/allocate'
const SEATS_URL           = 'http://localhost:9000/api/seats-data'
const BOOK_URL            = 'http://localhost:9000/api/book-seat'
const BOOK_CORPORATE_URL  = 'http://localhost:9000/api/book-corporate'
const ALLOCATE_URL        = 'http://localhost:9000/api/book-corporate/allocate'
const BOOKING_DATA_URL    = 'http://localhost:9000/api/booking-data'

const LINK_TEMPLATE_ID = '1253237689718231'  // update to your text/link template ID

const UPLOAD_API_URL = 'https://mediaupload.convexinteractive.com/api/upload'
const BASE_URL = 'https://mediaupload.convexinteractive.com'

const LOGIN_EMAIL = 'jazz853@yopmail.com'
const LOGIN_PASSWORD = 'Admin@098'

const TEMPLATE_IMAGE_URL = 'https://mediaupload.convexinteractive.com/api/file/1774355532846-597792243.png'

export async function fetchSeatsData() {
  const res = await axios.get(SEATS_URL, {
    withCredentials: false,
    headers: {
      'ngrok-skip-browser-warning': 'true',
    },
  })
  const data = res.data
  return Array.isArray(data) ? data : data.seats
}

/* Individual booking: { seatNumber, phone, flow_token } */
export async function bookSeats(payload) {
  const res = await axios.post(BOOK_URL, payload, {
    headers: { 'Content-Type': 'application/json' },
  })
  return res.data
}

/* Corporate phase-1: reserve seats block.
   payload: { bookings: [{seatNumber, seatStatus}], phone_number, flow_token, ... }
   Returns: { key: mongoId, bookingsLeft } */
export async function bookCorporate(payload) {
  const res = await axios.post(BOOK_CORPORATE_URL, payload, {
    headers: { 'Content-Type': 'application/json' },
  })
  return res.data
}

/* Corporate phase-2: allocate one seat to a form filler.
   payload: { corporateId }
   Returns: { seatNumber } */
export async function allocateCorporateSeat(corporateId) {
  const res = await axios.post(ALLOCATE_URL, { corporateId }, {
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

/* Send a form link via WhatsApp (corporate phase-1) */
export async function sendLinkWhatsapp({ contactNumber, link, qrImageUrl }) {
  const accessToken = await getAccessToken()
  await axios.post(
    BROADCAST_URL,
    {
      to: contactNumber,
      templateId: LINK_TEMPLATE_ID,
      param: [
        {
          parameters: [{ value: link, type: 'text' }],
          componentType: 'body',
          buttonType: null,
          index: null,
        },
        {
          parameters: [{ value: qrImageUrl || 'https://mediaupload.convexinteractive.com/api/file/1774434706246-157684823.jpg', type: 'image' }],
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

    console.log(response , " response")

    if (response.status === 200) {
      console.log(response.data , " response.data")
      console.log(BASE_URL + response.data.url, " BASE_URL + response.data.url")
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

export async function getBookingData(userId) {
  const res = await axios.post(BOOKING_DATA_URL, { UserId: userId }, {
    headers: { 'Content-Type': 'application/json' },
  })
  return res.data
}

