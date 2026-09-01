import axios from 'axios'

const LOGIN_URL = 'https://qaomni.convexinteractive.com/api/auth/client/login'
const BROADCAST_URL = 'https://qaomni.convexinteractive.com/api/broadcast/send'
const TEMPLATE_ID = '1349276167308607'

// const SEATS_URL           = 'https://effie.convexinteractive.com/api/seats-data'
// const BOOK_URL            = 'https://a732-103-197-46-226.ngrok-free.app/api/book-seat'
// const BOOK_CORPORATE_URL  = 'https://a732-103-197-46-226.ngrok-free.app/api/book-corporate'
// const ALLOCATE_URL        = 'https://a732-103-197-46-226.ngrok-free.app/api/book-corporate/allocate'
const SEATS_URL = 'http://localhost:8000/api/seats-data'
const BOOK_URL = 'http://localhost:8000/api/book-seat'
const BOOK_CORPORATE_URL = 'http://localhost:8000/api/book-corporate'
const ALLOCATE_URL = 'http://localhost:8000/api/book-corporate/allocate'
const BOOKING_DATA_URL = 'http://localhost:8000/api/booking-data'
const ADD_BOOKING_URL = 'http://localhost:8000/api/booking-add'
const GET_BOOKINGS_URL = 'http://localhost:8000/api/bookings'
const UPDATE_BOOKING_URL = 'http://localhost:8000/api/booking-update'
const CHECK_TOKEN_URL = 'https://local/api/check-token'
const SAVE_TOKEN_URL = 'https://local/api/save-token'
const RESERVED_EMAIL_URL = 'https://local/api/send-reserved-email'

const LINK_TEMPLATE_ID = '2439716791418701'  // update to your text/link template ID
const BREAKOUT_LINK_TEMPLATE_ID = '1015900957923860'

const UPLOAD_API_URL = 'https://mediaupload.convexinteractive.com/api/upload'
const BASE_URL = 'https://mediaupload.convexinteractive.com'

const LOGIN_EMAIL = 'newtestuser@google.com'
const LOGIN_PASSWORD = 'Agent@12'

const TEMPLATE_IMAGE_URL = 'https://mediaupload.convexinteractive.com/api/file/1787225469897-40511096.jpg'

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
// export async function getBookingData(userId) {
//   const res = await axios.post(BOOKING_DATA_URL, { UserId: userId }, {
//     headers: { 'Content-Type': 'application/json' },
//   })
//   return res.data
// }

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
      templateId: TEMPLATE_LINK_ID,
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

export async function sendPDFWhatsapp({ contactNumber, pdfUrl }) {
  const accessToken = await getAccessToken()

  await axios.post(
    BROADCAST_URL,
    {
      to: contactNumber,
      templateId: '2215703832410519',
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
export async function sendLanyardWhatsapp2({ contactNumber, lanyardUrl }) {
  const accessToken = await getAccessToken()
  await axios.post(
    BROADCAST_URL,
    {
      to: contactNumber,
      templateId: '1383598440372006',
      param: [
        {
          parameters: [
            {
              value: pdfUrl,
              type: "document",
              mediaId: null,
            }
          ],
          componentType: "header",
          buttonType: null,
          index: null,
        }
      ],
      flowToken: null,
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
      templateId: TEMPLATE_LANYARD_ID,
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

    console.log(response, " response")

    if (response.status === 200) {
      console.log(response.data, " response.data")
      console.log(BASE_URL + response.data.url, " BASE_URL + response.data.url")
      return {
        url: MEDIA_BASE_URL + response.data.url,
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

export async function checkToken(token) {
  const res = await axios.post(CHECK_TOKEN_URL, { token }, {
    headers: { 'Content-Type': 'application/json' },
  })
  return res.data
}

export async function saveToken(token, userId) {
  const res = await axios.post(SAVE_TOKEN_URL, { token, userId }, {
    headers: { 'Content-Type': 'application/json' },
  })
  return res.data
}

/* Send reserved-seat lanyard via email (SMTP handled by backend).
   Backend must implement POST /api/send-reserved-email
   using secretariat@pas.org.pk SMTP credentials. */
export async function createBooking(payload) {
  const res = await axios.post(ADD_BOOKING_URL, payload, {
    headers: { 'Content-Type': 'application/json' },
  })
  return res.data
}

/* Send breakout session invite link via WhatsApp (Template 1015900957923860 - 1 text param) */
export async function sendBreakoutLink({ contactNumber, link }) {
  const accessToken = await getAccessToken()
  await axios.post(
    BROADCAST_URL,
    {
      to: contactNumber,
      templateId: BREAKOUT_LINK_TEMPLATE_ID,
      param: [
        {
          parameters: [{ value: link, type: 'text' }],
          componentType: 'body',
          buttonType: null,
          index: null,
        },
      ],
    },
    { headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' } }
  )
}

export async function getAllBookings() {
  const res = await axios.get(GET_BOOKINGS_URL)
  return res.data?.data || res.data || []
}

export async function updateBooking(bookingId, payload) {
  const res = await axios.patch(`${UPDATE_BOOKING_URL}/${bookingId}`, payload, {
    headers: { 'Content-Type': 'application/json' },
  })
  return res.data
}

export async function sendReservedEmail({ toEmail, name, seatNumber, lanyardUrl }) {
  const res = await axios.post(RESERVED_EMAIL_URL, {
    toEmail,
    name,
    seatNumber,
    lanyardUrl,
  }, {
    headers: { 'Content-Type': 'application/json' },
  })
  return res.data
}


