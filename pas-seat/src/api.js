import axios from 'axios'

const LOGIN_URL = 'https://qaomni.convexinteractive.com/api/auth/client/login'
const BROADCAST_URL = 'https://qaomni.convexinteractive.com/api/broadcast/send'
const TEMPLATE_ID = '4184359858374924'

const LOGIN_EMAIL = 'jazz853@yopmail.com'
const LOGIN_PASSWORD = 'Admin@098'

const PLACEHOLDER_IMAGE_URL = 'https://placehold.co/420x620/0f1120/f97316/png?text=PAS+AWARDS'

export async function sendLanyardWhatsapp(imageUrl, contactNumber) {
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
              value: PLACEHOLDER_IMAGE_URL,
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
