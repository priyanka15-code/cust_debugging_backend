// routes/userRoutes.js
const express = require('express');
const router = express.Router();
const User = require('../models/user.model');
const { initRedisClient } = require('../utils/redis'); 
const bcrypt = require('bcrypt');
const { generateToken } = require('../utils/jwt'); 
const verifyToken = require('../middelwares/auth'); 
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
require('dotenv').config();

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;
const IV = process.env.IV; 
const JWT_SECRET = process.env.JWT_SECRET;

const ENCRYPTION_KEY_BUFFER = Buffer.from(ENCRYPTION_KEY, 'hex');
const IV_BUFFER = Buffer.from(IV, 'hex');


// GET all users
router.get('/', async (req, res) => {
  try {
    const customers = await User.find({ sAccess: "Customer" });
    res.json(customers);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});



// POST create a new user
router.post('/', async (req, res) => {
    const { sName, sEmail, sPassword, sAccess } = req.body;
  
    try {
      const existingUser = await User.findOne({ sEmail });
      if (existingUser) {
        return res.status(400).json({ message: 'User already exists' });
      }
      const hashedPassword = await bcrypt.hash(sPassword, 10);
  
      let developerId = null;
      let pin = null;

      // If sAccess is "Admin", generate unique developer ID using Redis
      if (sAccess === "Admin") {
        const redisClient = await initRedisClient();
        const firstLetter = sName.charAt(0).toUpperCase();
        let developerIdNumber = await redisClient.incr('developerId');
        developerIdNumber = developerIdNumber.toString().padStart(4, '0');
        const currentDate = new Date();
        const dayOfMonth = String(currentDate.getDate()).padStart(2, '0');
        developerId = `${firstLetter}${developerIdNumber}${dayOfMonth}`;
      }

      // Generate a unique 3-digit PIN followed by a random character
      const generateUniquePin = async () => {
        let uniquePin;
        let isUnique = false;
  
        if (sAccess === "Admin") {
          while (!isUnique) {
            const randomDigits = Math.floor(100 + Math.random() * 900); 
            const randomChar = String.fromCharCode(65 + Math.floor(Math.random() * 26));
            uniquePin = `${randomDigits}${randomChar}`;
            const existingPin = await User.findOne({ pin: uniquePin });
            if (!existingPin) {
              isUnique = true;
            }
          }
        }

        return uniquePin;
      };

      pin = await generateUniquePin();
      const newUser = new User({
        sName,
        sEmail,
        sPassword: hashedPassword,
        sAccess,
        developerId,
        pin
      });
      await newUser.save();
 
      return res.status(201).json({ message: 'User created successfully', user: newUser });
    } catch (error) {
      console.error('Error creating user:', error);
      return res.status(500).json({ message: 'Internal server error' });
    }
});

// dev-login
router.post('/dev-Login', async (req, res) => {
  const { pin } = req.body;

  if (!pin) {
    return res.status(400).json({ message: 'Invalid request body - pin is required' });
  }

  try {
    const token = req.headers.authorization.split(" ")[1]; 
    const decodedToken = jwt.verify(token, JWT_SECRET); 

    // Access the decrypted developerId directly
    const developerId = decrypt(decodedToken.developerId); 
    const user = await User.findOne({ developerId });
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials - developerId not found' });
    }
    const isPinValid = user.pin === pin;
    if (!isPinValid) {
      return res.status(401).json({ message: 'Invalid credentials - PIN does not match' });
    }
    return res.status(200).json({
      message: 'Login successful',
      token, 
      user: {
        developerId: user.developerId,
        sName: user.sName,
        sAccess: user.sAccess
      }
    });
  } catch (error) {
    console.error('Error logging in:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

function decrypt(data) {
  const algorithm = 'aes-256-cbc';
  const decipher = crypto.createDecipheriv(algorithm, ENCRYPTION_KEY_BUFFER, IV_BUFFER);
  let decrypted = decipher.update(data, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}


// Admin API to login as a customer by their email
router.post('/admin-login-as-customer', verifyToken, async (req, res) => {
  try {
    if (req.user.sAccess !== "Admin") {
      return res.status(403).json({ message: 'Access denied. Only admins can perform this action.' });
    }
    const { customerEmail } = req.body;
    if (!customerEmail) {
      return res.status(400).json({ message: 'Customer email is required.' });
    }

    const customer = await User.findOne({ sEmail: customerEmail, sAccess: 'Customer' });
    
    if (!customer) {
      return res.status(404).json({ message: 'Customer not found.' });
    }
    const customerToken = generateToken(customer); 

    return res.status(200).json({
      message: `Admin logged in as customer ${customer.sName} successfully.`,
      token: customerToken, 
      user: {
        developerId: customer.developerId,
        sName: customer.sName,
        sEmail: customer.sEmail,
        sAccess: customer.sAccess,
        isLog: customer.isLog
      }
    });
  } catch (error) {
    console.error('Error logging in as customer:', error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
});



// POST login
router.post('/login', async (req, res) => {
  const { sEmail, sPassword } = req.body;

  try {
    const user = await User.findOne({ sEmail });
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    const isMatch = await bcrypt.compare(sPassword, user.sPassword);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    const token = generateToken(user);

    return res.status(200).json({ 
      message: 'Login successful',
      token,
      user: {
        developerId: user.developerId,
        sName: user.sName,
        sEmail: user.sEmail,
        sAccess: user.sAccess,
        isLog:user.isLog
      }
    });
  } catch (error) {
    console.error('Error logging in:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
});



// Update user status (isLog)
router.put('/update-status', verifyToken, async (req, res) => {
  const { sEmail, isActive } = req.body;

  try {
    const user = await User.findOne({ sEmail },{ isActive }, { new: true });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.isLog = isActive;
    await user.save();

    return res.status(200).json({ message: 'User status updated successfully' });
  } catch (error) {
    console.error('Error updating user status:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
});



// Protected route
router.get('/protected', verifyToken, (req, res) => {
  res.json({
    message: 'This is protected data',
    user: req.user  
  });
});

module.exports = router;



