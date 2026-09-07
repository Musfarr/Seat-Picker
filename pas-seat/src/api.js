import axios from 'axios'

// Only attach ngrok header to requests targeting ngrok tunnels.
// DO NOT use axios.defaults — that would poison media upload and other 3rd-party APIs.
axios.interceptors.request.use((config) => {
  if (config.url && config.url.includes('ngrok-free.app')) {
    config.headers = config.headers || {}
    config.headers['ngrok-skip-browser-warning'] = '69420'
  }
  return config
})

const LOGIN_URL = 'https://portal.berrytalks.com/api/auth/client/login'
const BROADCAST_URL = 'https://broadcast.convexinteractive.com/api/broadcast/send'
const TEMPLATE_ID = '1349276167308607'

const NGROK_BASE = 'https://madsemble.convexinteractive.com'

const SEATS_URL = `${NGROK_BASE}/api/seats-data`
const BOOK_URL = `${NGROK_BASE}/api/book-seat`
const BOOK_CORPORATE_URL = `${NGROK_BASE}/api/book-corporate`
const ALLOCATE_URL = `${NGROK_BASE}/api/book-corporate/allocate`
const BOOKING_DATA_URL = `${NGROK_BASE}/api/booking-data`
const ADD_BOOKING_URL = `${NGROK_BASE}/api/booking-add`
const GET_BOOKINGS_URL = `${NGROK_BASE}/api/bookings`
const UPDATE_BOOKING_URL = `${NGROK_BASE}/api/booking-update`
const CHECK_TOKEN_URL = `${NGROK_BASE}/api/check-token`
const SAVE_TOKEN_URL = `${NGROK_BASE}/api/save-token`
const RESERVED_EMAIL_URL = `${NGROK_BASE}/api/send-reserved-email`

const BREAKOUT_CAPACITIES_URL = `${NGROK_BASE}/api/breakout-capacities`
const CHECK_BREAKOUT_TOKEN_URL = `${NGROK_BASE}/api/check-breakout-token`
const SAVE_BREAKOUT_TOKEN_URL = `${NGROK_BASE}/api/save-breakout-token`

const LINK_TEMPLATE_ID = '2439716791418701'  // update to your text/link template ID
const BREAKOUT_LINK_TEMPLATE_ID = '1399548372121724'
// const BREAKOUT_LINK_TEMPLATE_ID = '1015900957923860'

const UPLOAD_API_URL = 'https://mediaupload.convexinteractive.com/api/upload'
const BASE_URL = 'https://mediaupload.convexinteractive.com'

const LOGIN_EMAIL = 'apipasnew@yopmail.com'
const LOGIN_PASSWORD = 'Admin@321'

const TEMPLATE_IMAGE_URL = 'https://mediaupload.convexinteractive.com/api/file/1787225469897-40511096.jpg'

const NGROK_HEADERS = {
  // 'ngrok-skip-browser-warning': '69420',
}

export async function fetchSeatsData() {
  const res = await axios.get(SEATS_URL, {
    headers: { ...NGROK_HEADERS },
    withCredentials: false,
  })
  const data = res.data
  return Array.isArray(data) ? data : data.seats
}

/* Individual booking: { seatNumber, phone, flow_token } */
export async function bookSeats(payload) {
  const res = await axios.post(BOOK_URL, payload, {
    headers: { 'Content-Type': 'application/json', ...NGROK_HEADERS },
  })
  return res.data
}

/* Corporate phase-1: reserve seats block.
   payload: { bookings: [{seatNumber, seatStatus}], phone_number, flow_token, ... }
   Returns: { key: mongoId, bookingsLeft } */
export async function bookCorporate(payload) {
  const res = await axios.post(BOOK_CORPORATE_URL, payload, {
    headers: { 'Content-Type': 'application/json', ...NGROK_HEADERS },
  })
  return res.data
}

/* Corporate phase-2: allocate one seat to a form filler.
   payload: { corporateId }
   Returns: { seatNumber } */
export async function allocateCorporateSeat(payload) {
  const res = await axios.post(ALLOCATE_URL, payload, {
    headers: { 'Content-Type': 'application/json', ...NGROK_HEADERS },
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
export async function sendLanyardWhatsapp({ contactNumber, lanyardUrl, name }) {
  const accessToken = await getAccessToken()
  await axios.post(
    BROADCAST_URL,
    {
      to: contactNumber,
      templateId: '1732526118876194',
      param: [
        {
          parameters: [{ value: lanyardUrl || TEMPLATE_IMAGE_URL, type: 'image', mediaId: null }],
          componentType: 'header',
          buttonType: null,
          index: null,
        },
        {
          parameters: [{ value: name, type: "text", mediaId: null }],
          componentType: "body",
          buttonType: null,
          index: null
        }
      ],
      flowToken: null
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

    console.log(response, " response")

    if (response.status === 200) {
      console.log(response.data, " response.data")
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
  try {
    const res = await axios.post(BOOKING_DATA_URL, { UserId: userId, id: userId }, {
      headers: { 'Content-Type': 'application/json', ...NGROK_HEADERS },
    })
    return res.data?.data || res.data?.booking || res.data
  } catch (err) {
    try {
      const getRes = await axios.get(`${BOOKING_DATA_URL}/${userId}`, {
        headers: { ...NGROK_HEADERS },
      })
      return getRes.data?.data || getRes.data?.booking || getRes.data
    } catch {
      throw err
    }
  }
}

export async function checkToken(token) {
  const res = await axios.post(CHECK_TOKEN_URL, { token }, {
    headers: { 'Content-Type': 'application/json', ...NGROK_HEADERS },
  })
  return res.data
}

export async function saveToken(payloadOrToken, userId) {
  const payload = typeof payloadOrToken === 'string'
    ? { token: payloadOrToken, userId }
    : payloadOrToken
  const res = await axios.post(SAVE_TOKEN_URL, payload, {
    headers: { 'Content-Type': 'application/json', ...NGROK_HEADERS },
  })
  return res.data
}

/* Send reserved-seat lanyard via email (SMTP handled by backend).
   Backend must implement POST /api/send-reserved-email
   using secretariat@pas.org.pk SMTP credentials. */
export async function createBooking(payload) {
  const res = await axios.post(ADD_BOOKING_URL, payload, {
    headers: { 'Content-Type': 'application/json', ...NGROK_HEADERS },
  })
  return res.data
}

/* Send breakout session invite link via WhatsApp (Template 1015900957923860 - 1 text param) */
export async function sendBreakoutLink({ contactNumber, link, name }) {
  const accessToken = await getAccessToken()
  await axios.post(
    BROADCAST_URL,
    {
      to: contactNumber,
      templateId: BREAKOUT_LINK_TEMPLATE_ID,
      param: [
        {
          parameters: [{ value: ' ' + name, type: "text", mediaId: null }, { value: link, type: 'text' }],
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
  const res = await axios.get(GET_BOOKINGS_URL, {
    headers: { ...NGROK_HEADERS },
  })
  return res.data?.data || res.data || []
}

export async function updateBooking(bookingId, payload) {
  const res = await axios.patch(`${UPDATE_BOOKING_URL}/${bookingId}`, payload, {
    headers: { 'Content-Type': 'application/json', ...NGROK_HEADERS },
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

export async function getBreakoutCapacities() {
  const res = await axios.get(BREAKOUT_CAPACITIES_URL, {
    headers: { ...NGROK_HEADERS },
  })
  return res.data?.data || {}
}

export async function checkBreakoutToken(token) {
  const res = await axios.post(CHECK_BREAKOUT_TOKEN_URL, { token }, {
    headers: { 'Content-Type': 'application/json', ...NGROK_HEADERS },
  })
  return res.data
}

export async function saveBreakoutToken(payload) {
  const res = await axios.post(SAVE_BREAKOUT_TOKEN_URL, payload, {
    headers: { 'Content-Type': 'application/json', ...NGROK_HEADERS },
  })
  return res.data
}
