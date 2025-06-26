const { Redis } = require('@upstash/redis');

// Load configuration from the standard Upstash environment variables.
// This expects UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN to be set.
const redis = Redis.fromEnv();

module.exports = redis;
