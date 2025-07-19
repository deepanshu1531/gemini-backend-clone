const { createClient } = require('redis');

const redisConfig = process.env.REDIS_URL
  ? {
    // Render.com configuration (TLS required)
    url: process.env.REDIS_URL,
    socket: {
      tls: true,
      rejectUnauthorized: false, // Needed for Render's free Redis
      reconnectStrategy: (retries) => {
        if (retries > 3) {
          console.log('Too many retries. Connection terminated');
          return new Error('Could not connect after 3 attempts');
        }
        return Math.min(retries * 100, 5000);
      }
    }
  }
  : {
    // Local development configuration
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379,
    socket: {
      reconnectStrategy: (retries) => {
        if (retries > 3) {
          console.log('Too many retries. Connection terminated');
          return new Error('Could not connect after 3 attempts');
        }
        return Math.min(retries * 100, 5000);
      }
    }
  };

let redisClient;

async function createRedisClient() {
  if (redisClient && redisClient.isOpen) {
    return redisClient;
  }

  redisClient = createClient(redisConfig);

  redisClient.on('error', (err) => {
    console.error('Redis error:', err);
  });

  redisClient.on('connect', () => {
    console.log('Redis connecting...');
  });

  redisClient.on('ready', () => {
    console.log('Redis connected');
  });

  redisClient.on('end', () => {
    console.log('Redis disconnected');
  });

  redisClient.on('reconnecting', () => {
    console.log('Redis reconnecting...');
  });

  await redisClient.connect();
  return redisClient;
}

async function getRedisClient() {
  if (!redisClient || !redisClient.isOpen) {
    return await createRedisClient();
  }
  return redisClient;
}

async function closeRedisClient() {
  if (redisClient && redisClient.isOpen) {
    await redisClient.quit();
    redisClient = null;
  }
}

module.exports = {
  redisConfig,
  getRedisClient,
  closeRedisClient
};