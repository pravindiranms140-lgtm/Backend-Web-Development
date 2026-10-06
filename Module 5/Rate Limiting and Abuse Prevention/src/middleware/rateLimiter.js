'use strict';

const rateLimit = require('express-rate-limit');

/**
 * Multi-Instance Deployment & Redis-Backed Store:
 *
 * Why MemoryStore fails across multiple instances:
 * By default, express-rate-limit uses an in-memory store (MemoryStore) where counters
 * are kept in the Node.js process's local memory. In production, web applications typically
 * run across multiple instances (processes or containers) behind a load balancer. Because each
 * instance maintains its own independent memory and counter, a client's requests distributed
 * across N instances effectively multiply the permitted limit by N (e.g., with 3 instances,
 * a limit of 5 requests allows up to 15 attempts before complete throttling). Furthermore,
 * restarting or autoscaling instances wipes the in-memory counters, resetting the quotas.
 *
 * How a Redis-backed store (rate-limit-redis) solves this:
 * A Redis-backed store replaces the in-memory store by centralizing rate-limiting counters in
 * an external, shared Redis database. Every application instance connects to the same Redis
 * store. When a request arrives at any instance, atomic Redis commands (like INCR and EXPIRE)
 * increment and inspect the single shared counter. This ensures that the configured threshold
 * (e.g., 5 attempts per 15 minutes) is strictly enforced cluster-wide, regardless of which
 * instance handles the request.
 *
 * Example implementation with rate-limit-redis:
 *   const { RedisStore } = require('rate-limit-redis');
 *   const { createClient } = require('redis');
 *   const redisClient = createClient({ url: process.env.REDIS_URL });
 *   redisClient.connect();
 *
 *   const limiter = rateLimit({
 *     windowMs: 15 * 60 * 1000,
 *     max: 5,
 *     store: new RedisStore({
 *       sendCommand: (...args) => redisClient.sendCommand(args),
 *     }),
 *   });
 */

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15-minute window
  max: 5, // Maximum 5 attempts per window per IP
  standardHeaders: true, // Return standard RateLimit-* headers (RateLimit-Limit, RateLimit-Remaining, RateLimit-Reset) and Retry-After
  legacyHeaders: false, // Disable the deprecated X-RateLimit-* headers
  skipSuccessfulRequests: true, // Only count failed requests (e.g. 401s), so legitimate users are not penalized on successful login
  handler: (req, res, _next, options) => {
    // express-rate-limit automatically sets the Retry-After header when standardHeaders is true.
    // In case it hasn't been set, ensure it is populated with the remaining window duration in seconds.
    if (!res.getHeader('Retry-After')) {
      res.setHeader('Retry-After', Math.ceil(options.windowMs / 1000).toString());
    }
    res.status(options.statusCode || 429).json({
      error: 'Too many requests, please try again later.',
    });
  },
});

module.exports = authLimiter;
