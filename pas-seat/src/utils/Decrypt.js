// utils/decryptParams.js

const SECRET_KEY = 'PAS2026SEAT!XK9M'; // exactly 16 chars
const INIT_VECTOR = 'CONV3X!PAS!IV!26'; // exactly 16 chars

export async function decryptParams(encryptedData) {
    // Fix Base64 URL encoding
    const base64 = encryptedData.replace(/-/g, '+').replace(/_/g, '/');
    const encryptedBytes = Uint8Array.from(atob(base64), c => c.charCodeAt(0));

    // Import key
    const keyBytes = new TextEncoder().encode(SECRET_KEY);
    const cryptoKey = await window.crypto.subtle.importKey(
        'raw',
        keyBytes,
        { name: 'AES-CBC' },
        false,
        ['decrypt']
    );

    // Decrypt
    const iv = new TextEncoder().encode(INIT_VECTOR);
    const decryptedBuffer = await window.crypto.subtle.decrypt(
        { name: 'AES-CBC', iv },
        cryptoKey,
        encryptedBytes
    );

    // Parse back to object
    const decryptedString = new TextDecoder().decode(decryptedBuffer);
    const params = new URLSearchParams(decryptedString);
    return Object.fromEntries(params);
}