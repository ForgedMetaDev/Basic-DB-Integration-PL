const { createClient } = require('redis');

const redisClient = createClient({
  socket: {
    host: process.env.REDIS_HOST || '127.0.0.1',
    port: Number(process.env.REDIS_PORT) || 6379,
    reconnectStrategy: (retries) => Math.min(retries * 100, 3000),
  },
});

const cacheKeys = {
  students: 'students:all',
};

redisClient.on('error', (err) => console.error('Redis Client Error:', err));
redisClient.on('connect', () => console.log('Redis connected successfully'));
redisClient.on('end', () => console.warn('Redis connection closed'));

const connectRedis = async () => {
  if (redisClient.isOpen) {
    return redisClient;
  }

  try {
    await redisClient.connect();
    return redisClient;
  } catch (error) {
    console.warn('Redis unavailable, continuing with MongoDB fallback:', error.message);
    return redisClient;
  }
};

const getCachedData = async (key, client = redisClient) => {
  if (!client || !client.isOpen) {
    return null;
  }

  try {
    const cachedValue = await client.get(key);
    return cachedValue ? JSON.parse(cachedValue) : null;
  } catch (error) {
    console.warn(`Unable to read cache for ${key}:`, error.message);
    return null;
  }
};

const setCachedData = async (key, value, ttlSeconds = 60, client = redisClient) => {
  if (!client || !client.isOpen) {
    return null;
  }

  try {
    await client.set(key, JSON.stringify(value), {
      EX: ttlSeconds,
    });
    return true;
  } catch (error) {
    console.warn(`Unable to write cache for ${key}:`, error.message);
    return null;
  }
};

const invalidateCache = async (key, client = redisClient) => {
  if (!client || !client.isOpen) {
    return null;
  }

  try {
    await client.del(key);
    return true;
  } catch (error) {
    console.warn(`Unable to invalidate cache for ${key}:`, error.message);
    return null;
  }
};

const invalidateStudentsCache = async (client = redisClient) => {
  return invalidateCache(cacheKeys.students, client);
};

module.exports = {
  redisClient,
  cacheKeys,
  connectRedis,
  getCachedData,
  setCachedData,
  invalidateCache,
  invalidateStudentsCache,
};
