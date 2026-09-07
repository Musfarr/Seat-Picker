// utils/decryptParams.js

const SECRET_KEY = 'PAS2026SEAT!XK9M'; // exactly 16 chars
const INIT_VECTOR = 'CONV3X!PAS!IV!26'; // exactly 16 chars

export async function decryptParams(encryptedData) {
  if (!encryptedData || typeof encryptedData !== 'string') {
    throw new Error('No encrypted data provided');
  }

  // Fix Base64 URL encoding
  const base64 = encryptedData.replace(/-/g, '+').replace(/_/g, '/');
  const binaryString = atob(base64);
  const encryptedBytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    encryptedBytes[i] = binaryString.charCodeAt(i);
  }

  // Import key
  const keyBytes = new TextEncoder().encode(SECRET_KEY);
  const cryptoSubtle = (typeof window !== 'undefined' && window.crypto?.subtle) ? window.crypto.subtle : globalThis.crypto.subtle;
  const cryptoKey = await cryptoSubtle.importKey(
    'raw',
    keyBytes,
    { name: 'AES-CBC' },
    false,
    ['decrypt']
  );

  // Decrypt
  const iv = new TextEncoder().encode(INIT_VECTOR);
  const decryptedBuffer = await cryptoSubtle.decrypt(
    { name: 'AES-CBC', iv },
    cryptoKey,
    encryptedBytes
  );

  // Parse back to object
  const decryptedString = new TextDecoder().decode(decryptedBuffer).trim();

  let parsed = null;

  // Check if string is JSON
  if (decryptedString.startsWith('{')) {
    try {
      parsed = JSON.parse(decryptedString);
    } catch {
      // not valid JSON, fallback to URLSearchParams
    }
  }

  if (!parsed) {
    let clean = decryptedString;
    if (clean.startsWith('data=?')) clean = clean.slice(6);
    else if (clean.startsWith('data=')) clean = clean.slice(5);
    if (clean.startsWith('?')) clean = clean.slice(1);

    const params = new URLSearchParams(clean);
    parsed = Object.fromEntries(params);

    if (parsed.json) {
      try {
        const nested = JSON.parse(parsed.json);
        parsed = { ...parsed, ...nested };
      } catch {
        // ignore nested JSON parse failure
      }
    }
  }

  if (!parsed || typeof parsed !== 'object') {
    parsed = { raw: decryptedString };
  }

  // Normalize key names
  const normalized = {
    ...parsed,
    rawDecrypted: decryptedString,
    Company_Name: (parsed.Company_Name || parsed.company_name || parsed.companyName || parsed.Company || '').trim(),
    Full_Name: (parsed.Full_Name || parsed.full_name || parsed.fullName || parsed.name || '').trim(),
    Designation: (parsed.Designation || parsed.designation || '').trim(),
    CNIC_Number: (parsed.CNIC_Number || parsed.cnic || parsed.CNIC || '').trim(),
    phone_number: (parsed.phone_number || parsed.number || parsed.phone || '').trim(),
    Email_Address: (parsed.Email_Address || parsed.email_address || parsed.email || '').trim(),
  };

  const rawTickets =
    parsed.Number_of_ticket ??
    parsed.Number_of_tickets ??
    parsed.number_of_ticket ??
    parsed.number_of_tickets ??
    parsed.tickets ??
    parsed.Tickets;

  if (rawTickets !== undefined && rawTickets !== null && String(rawTickets).trim() !== '') {
    const count = parseInt(String(rawTickets).trim(), 10);
    normalized.Number_of_ticket = isNaN(count) ? null : count;
  } else {
    normalized.Number_of_ticket = null;
  }

  return normalized;
}