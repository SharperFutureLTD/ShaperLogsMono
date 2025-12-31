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
      salt: salt.buffer as ArrayBuffer,
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

// Decrypt ciphertext
export async function decrypt(ciphertext: string, userId: string): Promise<string> {
  const salt = getSalt(userId);
  const key = await deriveKey(userId, salt);
  
  // Decode base64 and separate IV from ciphertext
  const combined = new Uint8Array(
    atob(ciphertext).split('').map(c => c.charCodeAt(0))
  );
  
  const iv = combined.slice(0, IV_LENGTH);
  const encrypted = combined.slice(IV_LENGTH);
  
  const decrypted = await crypto.subtle.decrypt(
    { name: ALGORITHM, iv },
    key,
    encrypted
  );

  const decoder = new TextDecoder();
  return decoder.decode(decrypted);
}
