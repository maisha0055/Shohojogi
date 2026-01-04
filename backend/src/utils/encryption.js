const crypto = require('crypto');

// Encryption key from environment (should be 32 bytes for AES-256)
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex');
const ALGORITHM = 'aes-256-cbc';

/**
 * Encrypt sensitive data (NID numbers, etc.)
 * @param {string} text - Text to encrypt
 * @returns {string} Encrypted text (hex format)
 */
const encrypt = (text) => {
  if (!text) return null;
  
  try {
    // Ensure key is 32 bytes
    const key = Buffer.from(ENCRYPTION_KEY.slice(0, 32).padEnd(32, '0'), 'utf8');
    const iv = crypto.randomBytes(16);
    
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    // Return IV + encrypted data
    return iv.toString('hex') + ':' + encrypted;
  } catch (error) {
    console.error('Encryption error:', error);
    throw new Error('Failed to encrypt data');
  }
};

/**
 * Decrypt sensitive data
 * @param {string} encryptedText - Encrypted text (hex format)
 * @returns {string} Decrypted text
 */
const decrypt = (encryptedText) => {
  if (!encryptedText) return null;
  
  try {
    const parts = encryptedText.split(':');
    if (parts.length !== 2) {
      throw new Error('Invalid encrypted data format');
    }
    
    const key = Buffer.from(ENCRYPTION_KEY.slice(0, 32).padEnd(32, '0'), 'utf8');
    const iv = Buffer.from(parts[0], 'hex');
    const encrypted = parts[1];
    
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    console.error('Decryption error:', error);
    throw new Error('Failed to decrypt data');
  }
};

/**
 * Hash NID number for uniqueness checking (one-way hash)
 * @param {string} nidNumber - NID number
 * @returns {string} Hashed NID
 */
const hashNID = (nidNumber) => {
  if (!nidNumber) return null;
  return crypto.createHash('sha256').update(nidNumber.toString()).digest('hex');
};

module.exports = {
  encrypt,
  decrypt,
  hashNID
};



