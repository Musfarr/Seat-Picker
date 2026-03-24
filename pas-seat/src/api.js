import axios from 'axios'

const LOGIN_URL = 'https://qaomni.convexinteractive.com/api/auth/client/login'
const BROADCAST_URL = 'https://qaomni.convexinteractive.com/api/broadcast/send'
const TEMPLATE_ID = '4184359858374924'

const SEATS_URL = 'http://localhost:9000/api/seats-data'
const BOOK_URL  = 'http://localhost:9000/api/book-seat'

const UPLOAD_API_URL = 'https://mediaupload.convexinteractive.com/api/upload'
const BASE_URL = 'https://mediaupload.convexinteractive.com'

const LOGIN_EMAIL = 'jazz853@yopmail.com'
const LOGIN_PASSWORD = 'Admin@098'

const TEMPLATE_IMAGE_URL = 'https://mediaupload.convexinteractive.com/api/file/1774355532846-597792243.png'

export async function fetchSeatsData() {
  const res = await axios.get(SEATS_URL)
  const data = res.data
  return Array.isArray(data) ? data : data.seats
}

/* Individual booking payload: { SeatNumber, phone_number, flow_token }
   Corporate booking payload:  { seats, phone_number, flow_token }      */
export async function bookSeats(payload) {
  const res = await axios.post(BOOK_URL, payload, {
    headers: { 'Content-Type': 'application/json' },
  })
  return res.data
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

export async function sendLanyardWhatsapp({ contactNumber, lanyardUrl }) {
  const loginRes = await axios.post(LOGIN_URL, {
    email: LOGIN_EMAIL,
    password: LOGIN_PASSWORD,
  })

  const accessToken = loginRes.data?.data?.accessToken
  if (!accessToken) throw new Error('Login failed: no accessToken in response')

  await axios.post(
    BROADCAST_URL,
    {
      to: contactNumber,
      templateId: TEMPLATE_ID,
      param: [
        {
          parameters: [
            {
              value: lanyardUrl || TEMPLATE_IMAGE_URL,
              type: 'image',
            },
          ],
          componentType: 'header',
          buttonType: null,
          index: null,
        },
      ],
    },
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    }
  )
}
