import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import { createServer } from 'http';
import { env } from './config/env.js';
import { initRealtime } from './realtime.js';
import routes from './routes/index.js';
import { errorHandler } from './middlewares/errorHandler.js';
import { schedulerService } from './services/scheduler.service.js';
import { apiLimiter, authLimiter, webhookLimiter, widgetLimiter } from './middlewares/rateLimit.js';
import { logger, requestLogger } from './utils/logger.js';

const app = express();
const httpServer = createServer(app);

// CORS configuration
const corsOrigins = env.NODE_ENV === 'production'
  ? [env.CLIENT_URL]
  : ['http://localhost:5173', 'http://localhost:3000', env.CLIENT_URL];

initRealtime(httpServer);

// Trust proxy (required for Render/reverse proxy - fixes rate limiter X-Forwarded-For)
if (env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}

// Security Middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", env.CLIENT_URL],
    },
  },
  crossOriginEmbedderPolicy: false,
}));

// CORS Middleware
app.use(cors({
  origin: corsOrigins,
  credentials: true,
}));

// Body parsing — keep the raw bytes: webhook signatures are computed over them, not over re-serialised JSON.
app.use(express.json({ limit: '2mb', verify: (req, _res, buf) => { (req as express.Request & { rawBody?: Buffer }).rawBody = buf; } }));
app.use(express.urlencoded({ limit: '2mb', extended: true }));

// Request logging
app.use(requestLogger);

// Rate limiting - apply before routes
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);
app.use('/api/webhooks', webhookLimiter);
app.use('/api/widget', widgetLimiter);
app.use('/api', apiLimiter);

// Embeddable chat widget script: <script src=".../widget.js" data-bot="BOT_ID"></script>
app.get('/widget.js', (_req, res) => {
  res.set('Cross-Origin-Resource-Policy', 'cross-origin');
  res.sendFile(path.resolve('public/widget.js'));
});

// Serve static files from uploads directory
const uploadsPath = path.resolve(env.UPLOAD_DIR);
app.use('/uploads', express.static(uploadsPath));

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api', routes);

// Error handler
app.use(errorHandler);

// Start server
httpServer.listen(env.PORT, async () => {
  logger.info('Server started', {
    port: env.PORT,
    environment: env.NODE_ENV,
    apiUrl: `http://localhost:${env.PORT}/api`,
  });

  // Initialize scheduler service for broadcast scheduling
  await schedulerService.init();
});
