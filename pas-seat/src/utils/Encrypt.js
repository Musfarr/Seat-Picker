// utils/Encrypt.js

const SECRET_KEY = 'PAS2026SEAT!XK9M'; // exactly 16 chars
const INIT_VECTOR = 'CONV3X!PAS!IV!26'; // exactly 16 chars

export async function encryptParams(dataObj) {
  // Convert object to URL query string format: key=value&key2=value2
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(dataObj)) {
    if (value !== undefined && value !== null) {
      params.append(key, String(value));
    }
  }
  const queryString = params.toString();

  // Encode data string to Uint8Array
  const dataBytes = new TextEncoder().encode(queryString);

  // Import AES key
  const keyBytes = new TextEncoder().encode(SECRET_KEY);
  const cryptoKey = await window.crypto.subtle.importKey(
    'raw',
    keyBytes,
    { name: 'AES-CBC' },
    false,
    ['encrypt']
  );

  // Encrypt using AES-CBC
  const iv = new TextEncoder().encode(INIT_VECTOR);
  const encryptedBuffer = await window.crypto.subtle.encrypt(
    { name: 'AES-CBC', iv },
    cryptoKey,
    dataBytes
  );

  // Convert buffer to binary string, then base64
  const encryptedBytes = new Uint8Array(encryptedBuffer);
  let binary = '';
  for (let i = 0; i < encryptedBytes.byteLength; i++) {
    binary += String.fromCharCode(encryptedBytes[i]);
  }
  const base64 = btoa(binary);

  // URL-safe base64: replace '+' with '-', '/' with '_', and strip '=' padding
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
