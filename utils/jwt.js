const jwt = require('jsonwebtoken');
const crypto = require('crypto');
require('dotenv').config();

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;
const IV = process.env.IV;
const JWT_SECRET = process.env.JWT_SECRET;

if (!ENCRYPTION_KEY || !IV || !JWT_SECRET) {
  throw new Error('Environment variables ENCRYPTION_KEY, IV, or JWT_SECRET are not defined.');
}

const ENCRYPTION_KEY_BUFFER = Buffer.from(ENCRYPTION_KEY, 'hex');
const IV_BUFFER = Buffer.from(IV, 'hex');

const generateToken = (user) => {
  const payload = {
    userId: user._id,
    sName: encrypt(user.sName || ''),
    sEmail: encrypt(user.sEmail || ''),
    sAccess: encrypt(user.sAccess || ''),
    developerId: encrypt(user.developerId || '')
  };

  const options = {
    expiresIn: '1h' 
  };

  return jwt.sign(payload, JWT_SECRET, options);
};

function encrypt(data) {
  if (!data) {
    console.error('Attempted to encrypt invalid data:', data);
    return ''; // Or handle this case as needed
  }

  const algorithm = 'aes-256-cbc';
  const cipher = crypto.createCipheriv(algorithm, ENCRYPTION_KEY_BUFFER, IV_BUFFER);
  let encrypted = cipher.update(data, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return encrypted;
}

function decrypt(data) {
  const algorithm = 'aes-256-cbc';
  const decipher = crypto.createDecipheriv(algorithm, ENCRYPTION_KEY_BUFFER, IV_BUFFER);
  let decrypted = decipher.update(data, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}
module.exports = {
  generateToken, 
};