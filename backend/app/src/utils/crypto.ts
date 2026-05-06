import crypto from 'crypto';

// The key must be exactly 32 bytes for AES-256-CBC
const rawKey = process.env.ENCRYPTION_KEY || 'default_uniroom_encryption_key_!';
const ENCRYPTION_KEY = crypto.createHash('sha256').update(rawKey).digest('base64').substring(0, 32);
const IV_LENGTH = 16;

export function encrypt(text: string | null | undefined): string | null {
  if (!text) return null;
  
  try {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv);
    let encrypted = cipher.update(text);
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    return iv.toString('hex') + ':' + encrypted.toString('hex');
  } catch (error) {
    console.error("Encryption error:", error);
    return null;
  }
}

export function decrypt(text: string | null | undefined): string | null {
  if (!text) return null;
  
  try {
    const textParts = text.split(':');
    if (textParts.length !== 2) return text; // Maybe it's not encrypted or legacy
    
    const iv = Buffer.from(textParts[0], 'hex');
    const encryptedText = Buffer.from(textParts[1], 'hex');
    const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv);
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString();
  } catch (error) {
    console.error("Decryption error:", error);
    return null;
  }
}
