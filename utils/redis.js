const redis = require('redis');

const initRedisClient = async () => {
  console.log("Initializing Redis client");
  const client = redis.createClient({
    socket: {
      port: 6379,
      host: '127.0.0.1',
    }
  });
  
  await client.connect();
  console.log("Client connected");

  client.on('error', (err) => {
    console.error('Redis client error:', err);
  });

  client.on('end', () => {
    console.log('Redis client disconnected');
  });

  return client;
};

module.exports = { initRedisClient};