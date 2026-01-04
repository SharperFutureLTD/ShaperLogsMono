import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const SALT_LENGTH = 16;
const KEY_LENGTH = 32;
const ITERATIONS = 100000;

/**
 * Encrypt data using AES-256-GCM
 * Uses user ID as key material with PBKDF2 derivation
 *
 * @param data - String data to encrypt
 * @param userId - User ID to derive encryption key
 * @returns Base64 encoded encrypted data (salt + iv + authTag + ciphertext)
 */
export async function encrypt(data: string, userId: string): Promise<string> {
  // Generate random salt and IV
  const salt = crypto.randomBytes(SALT_LENGTH);
  const iv = crypto.randomBytes(IV_LENGTH);

  // Derive key from user ID
  const key = crypto.pbkdf2Sync(userId, salt, ITERATIONS, KEY_LENGTH, 'sha256');

  // Encrypt
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  let encrypted = cipher.update(data, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  // Get auth tag
  const authTag = cipher.getAuthTag();

  // Combine: salt + iv + authTag + ciphertext
  const combined = Buffer.concat([
    salt,
    iv,
    authTag,
    Buffer.from(encrypted, 'hex'),
  ]);

  return combined.toString('base64');
}

/**
 * Decrypt data (server-side reference implementation)
 * NOTE: Actual decryption happens client-side in the browser for privacy
 * This is provided for testing and server-side operations if needed
 *
 * @param encryptedData - Base64 encoded encrypted data
 * @param userId - User ID to derive decryption key
 * @returns Decrypted string data
 */
export async function decrypt(encryptedData: string, userId: string): Promise<string> {
  const combined = Buffer.from(encryptedData, 'base64');

  // Extract components
  const salt = combined.slice(0, SALT_LENGTH);
  const iv = combined.slice(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
  const authTag = combined.slice(SALT_LENGTH + IV_LENGTH, SALT_LENGTH + IV_LENGTH + 16);
  const ciphertext = combined.slice(SALT_LENGTH + IV_LENGTH + 16);

  // Derive key
  const key = crypto.pbkdf2Sync(userId, salt, ITERATIONS, KEY_LENGTH, 'sha256');

  // Decrypt
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(ciphertext, undefined, 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}
