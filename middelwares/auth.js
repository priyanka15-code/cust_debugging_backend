const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/user.model');
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET;
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY; 
const IV = process.env.IV; 

if (!JWT_SECRET) {
  throw new Error('Environment variable JWT_SECRET is not defined.');
}

if (!ENCRYPTION_KEY || !IV) {
  throw new Error('Encryption key or IV not defined.');
}

const ENCRYPTION_KEY_BUFFER = Buffer.from(ENCRYPTION_KEY, 'hex');
const IV_BUFFER = Buffer.from(IV, 'hex');

function decrypt(data) {
  const algorithm = 'aes-256-cbc';
  const decipher = crypto.createDecipheriv(algorithm, ENCRYPTION_KEY_BUFFER, IV_BUFFER);
  let decrypted = decipher.update(data, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

const verifyToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, async (err, decoded) => {
    if (err) {
      return res.status(403).json({ message: 'Invalid token' });
    }

    try {
      // Decrypt the decoded values
      if (decoded.sName) {
        decoded.sName = decrypt(decoded.sName);
      }
      if (decoded.sEmail) {
        decoded.sEmail = decrypt(decoded.sEmail);
      }
      if (decoded.sAccess) {
        decoded.sAccess = decrypt(decoded.sAccess);
      }
      if (decoded.developerId) {
        decoded.developerId = decrypt(decoded.developerId);
      }

      // Find the user using the decrypted values
      req.user = await User.findOne({ _id: decoded.userId }).exec();
      if (!req.user) {
        return res.status(403).json({ message: 'User not authenticated' });
      }

      if (decoded.developerId) {
        req.devId = await User.findOne({ _id: decoded.userId, developerId: decoded.developerId }).exec();
        if (!req.devId) {
          return res.status(403).json({ message: 'Developer not authenticated' });
        }
      }

      next();
    } catch (error) {
      console.error('Error in verifyToken:', error);
      return res.status(500).json({ message: 'Internal server error' });
    }
  });
};

module.exports = verifyToken;