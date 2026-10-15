import rateLimit from 'express-rate-limit';

// General API rate limit
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window
  message: { success: false, message: 'Too many requests, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
  // webhooks and the public widget have their own limiters
  skip: (req) => req.originalUrl.startsWith('/api/webhooks') || req.originalUrl.startsWith('/api/widget'),
});

// Strict limit for auth endpoints (login/register)
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 attempts per window
  message: { success: false, message: 'Too many login attempts, please try again later' },
  skipSuccessfulRequests: true, // Don't count successful logins
});

// Webhook limit (higher threshold for Facebook)
export const webhookLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 1000, // Facebook sends many webhook requests
  message: 'Too many webhook requests',
});

// Public chat widget: per visitor IP
export const widgetLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  message: { success: false, message: 'Too many messages, slow down' },
});
