import crypto from 'crypto';
import { env } from '../config/env.js';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;

// Derive a 256-bit encryption key from JWT_SECRET using scrypt
// Uses a proper derived salt instead of a hardcoded string
const getKey = (): Buffer => {
  const secret = env.JWT_SECRET;
  const salt = crypto.createHash('sha256').update(`${secret}-encryption-salt`).digest();
  return crypto.scryptSync(secret, salt, 32);
};

// Legacy key for backward compatibility with data encrypted using old salt
const getLegacyKey = (): Buffer => {
  return crypto.scryptSync(env.JWT_SECRET, 'salt', 32);
};

export const encrypt = (text: string): string => {
  const iv = crypto.randomBytes(IV_LENGTH);
  const key = getKey();
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const authTag = cipher.getAuthTag();

  // Format: iv:authTag:encryptedData
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
};

export const decrypt = (encryptedText: string): string => {
  const parts = encryptedText.split(':');
  if (parts.length !== 3) {
    throw new Error('Invalid encrypted text format');
  }

  const [ivHex, authTagHex, encrypted] = parts;
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');

  // Try new key first, fall back to legacy key for backward compatibility
  for (const key of [getKey(), getLegacyKey()]) {
    try {
      const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
      decipher.setAuthTag(authTag);
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      return decrypted;
    } catch {
      continue;
    }
  }

  throw new Error('Failed to decrypt: invalid key or corrupted data');
};

// Check if a string is encrypted (has the expected format)
export const isEncrypted = (text: string): boolean => {
  const parts = text.split(':');
  return parts.length === 3 && parts[0].length === 32 && parts[1].length === 32;
};
