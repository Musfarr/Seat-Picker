// utils/Decrypt.js

const SECRET_KEY = 'PAS2026SEAT!XK9M'; // exactly 16 chars (AES-128-CBC)
const INIT_VECTOR = 'CONV3X!PAS!IV!26'; // exactly 16 chars

/**
 * Encrypts an object into a URL-safe Base64 string compatible with the backend.
 * @param {Object} dataObj - { allowedSeats: 4, Company_Name: '...', phone_number: '...' }
 * @returns {Promise<string>} - URL-safe Base64 encrypted string
 */
export async function encryptParams(dataObj) {
  const params = new URLSearchParams(dataObj);
  const queryString = params.toString();

  const keyBytes = new TextEncoder().encode(SECRET_KEY);
  const cryptoKey = await window.crypto.subtle.importKey(
    'raw',
    keyBytes,
    { name: 'AES-CBC' },
    false,
    ['encrypt']
  );

  const iv = new TextEncoder().encode(INIT_VECTOR);
  const dataBytes = new TextEncoder().encode(queryString);

  const encryptedBuffer = await window.crypto.subtle.encrypt(
    { name: 'AES-CBC', iv },
    cryptoKey,
    dataBytes
  );

  // Convert buffer to binary string -> base64 -> URL-safe base64
  const bytes = new Uint8Array(encryptedBuffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  const base64 = btoa(binary);
  const urlSafe = base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return urlSafe;
}

/**
 * Generates a full invite URL.
 */
export async function generateEncryptedUrl({
  baseUrl = window.location.origin,
  allowedSeats = 4,
  companyName = 'Convex Interactive',
  phone = '923001234567',
  paramName = 'data',
} = {}) {
  const encrypted = await encryptParams({
    allowedSeats: String(allowedSeats),
    Company_Name: companyName,
    phone_number: phone,
  });
  return `${baseUrl}/?${paramName}=${encrypted}`;
}

/**
 * Decrypts a URL-safe Base64 string back into an object.
 */
export async function decryptParams(encryptedData) {
  if (!encryptedData) return null;
  const base64 = encryptedData.replace(/-/g, '+').replace(/_/g, '/');
  const encryptedBytes = Uint8Array.from(atob(base64), c => c.charCodeAt(0));

  const keyBytes = new TextEncoder().encode(SECRET_KEY);
  const cryptoKey = await window.crypto.subtle.importKey(
    'raw',
    keyBytes,
    { name: 'AES-CBC' },
    false,
    ['decrypt']
  );

  const iv = new TextEncoder().encode(INIT_VECTOR);
  const decryptedBuffer = await window.crypto.subtle.decrypt(
    { name: 'AES-CBC', iv },
    cryptoKey,
    encryptedBytes
  );

  const decryptedString = new TextDecoder().decode(decryptedBuffer);
  const params = new URLSearchParams(decryptedString);
  return Object.fromEntries(params);
}