const express = require('express');
const cors = require('cors'); 
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const userRoutes = require('./routes/user.route');
const productRoutes = require('./routes/product.route');
const http = require('http');
const socketIo = require('socket.io');

require('dotenv').config();
const { initRedisClient } = require('./utils/redis');

const app = express();
const PORT = process.env.PORT ;
const server = http.createServer(app);
// Initialize socket.io with CORS support
const io = socketIo(server, {
  cors: {
    origin: "http://localhost:4200",
    methods: ["GET", "POST"],
  },
});

app.use(cors({
  ORIGIN: ['*'],
  methods: ['GET', 'POST', 'DELETE', 'PUT'],
  AllowedOrigin: ['*'],
 /*  origin: process.env.ORIGIN,
  credentials: true */
}));
// Middleware
app.use(bodyParser.json());

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('MongoDB connected'))
.catch(err => console.log(err));

(async () => {
  try {
    // Redis Initialization
    const redisClient = await initRedisClient();
    console.log('Redis client initialized');

    // Routes
    app.use('/api/users', userRoutes);
    app.use('/api/product',productRoutes);


    // Listen for new socket.io connections
    io.on('connection', (socket) => {
      console.log('New user connected:', socket.id);

      // Listen for messages from customers
      socket.on('customerMessage', (data) => {
        console.log('Customer message:', data);
        io.emit('newMessage', data);
      });

      // Listen for messages from admin
      socket.on('adminMessage', (data) => {
        console.log('Admin message:', data);
        io.emit('newMessage', data); 
      });

      // Handle user disconnect
      socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
      });
    });


    // Start the server
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Error initializing Redis:', error);
  }
})();
