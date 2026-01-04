// AES-256-GCM encryption utilities using Web Crypto API

const ALGORITHM = 'AES-GCM';
const KEY_LENGTH = 256;
const IV_LENGTH = 12;
const SALT_LENGTH = 16;

// Generate a key from user ID and stored salt
async function deriveKey(userId: string, salt: Uint8Array): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(userId),
    'PBKDF2',
    false,
    ['deriveKey']
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: 100000,
      hash: 'SHA-256'
    },
    keyMaterial,
    { name: ALGORITHM, length: KEY_LENGTH },
    false,
    ['encrypt', 'decrypt']
  );
}

// Get or create salt for user
function getSalt(userId: string): Uint8Array {
  const storageKey = `encryption_salt_${userId}`;
  const stored = localStorage.getItem(storageKey);
  
  if (stored) {
    return new Uint8Array(JSON.parse(stored));
  }
  
  const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
  localStorage.setItem(storageKey, JSON.stringify(Array.from(salt)));
  return salt;
}

// Encrypt plaintext
export async function encrypt(plaintext: string, userId: string): Promise<string> {
  const salt = getSalt(userId);
  const key = await deriveKey(userId, salt);
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  const encoder = new TextEncoder();
  
  const encrypted = await crypto.subtle.encrypt(
    { name: ALGORITHM, iv },
    key,
    encoder.encode(plaintext)
  );

  // Combine IV + ciphertext and encode as base64
  const combined = new Uint8Array(iv.length + encrypted.byteLength);
  combined.set(iv);
  combined.set(new Uint8Array(encrypted), iv.length);
  
  return btoa(String.fromCharCode(...combined));
}

// Decrypt ciphertext (legacy format: IV + ciphertext)
export async function decrypt(ciphertext: string, userId: string): Promise<string> {
  console.log('[decrypt] Using legacy format');

  // Get salt from localStorage (legacy approach)
  const salt = getSalt(userId);

  // Derive key with localStorage salt
  const key = await deriveKey(userId, salt);

  // Decode base64 - legacy format: IV (12 bytes) + ciphertext
  const combined = new Uint8Array(
    atob(ciphertext).split('').map(c => c.charCodeAt(0))
  );

  console.log('[decrypt] Combined length:', combined.length);
  console.log('[decrypt] IV length:', IV_LENGTH);

  // Extract IV and ciphertext (simple split)
  const iv = combined.slice(0, IV_LENGTH);           // First 12 bytes = IV
  const encrypted = combined.slice(IV_LENGTH);       // Rest = ciphertext (with authTag built-in)

  console.log('[decrypt] IV:', iv.length, 'bytes');
  console.log('[decrypt] Encrypted:', encrypted.length, 'bytes');

  try {
    // Decrypt using Web Crypto API (authTag is part of encrypted data automatically)
    const decrypted = await crypto.subtle.decrypt(
      { name: ALGORITHM, iv },           // No tagLength parameter
      key,
      encrypted                          // Ciphertext with built-in authTag
    );

    const decoder = new TextDecoder();
    const result = decoder.decode(decrypted);
    console.log('[decrypt] Success!', result.length, 'chars');
    return result;
  } catch (error) {
    console.error('[decrypt] Failed:', error);
    throw error;
  }
}
