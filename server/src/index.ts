import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import { createServer } from 'http';
import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import { env } from './config/env.js';
import { prisma } from './config/db.js';
import routes from './routes/index.js';
import { errorHandler } from './middlewares/errorHandler.js';
import { schedulerService } from './services/scheduler.service.js';
import { apiLimiter, authLimiter, webhookLimiter } from './middlewares/rateLimit.js';
import { logger, requestLogger } from './utils/logger.js';

const app = express();
const httpServer = createServer(app);

// CORS configuration
const corsOrigins = env.NODE_ENV === 'production'
  ? [env.CLIENT_URL]
  : ['http://localhost:5173', 'http://localhost:3000', env.CLIENT_URL];

// Initialize Socket.IO
export const io = new Server(httpServer, {
  cors: {
    origin: corsOrigins,
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// Socket.IO authentication middleware
io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth.token;
    if (!token) {
      return next(new Error('Authentication required'));
    }

    const decoded = jwt.verify(token, env.JWT_SECRET) as { userId: string };
    socket.data.userId = decoded.userId;
    next();
  } catch (error) {
    logger.warn('Socket.IO auth failed', { error: error instanceof Error ? error.message : 'Unknown error' });
    next(new Error('Invalid token'));
  }
});

// Socket.IO connection handling
io.on('connection', (socket) => {
  const userId = socket.data.userId;
  logger.debug('Socket.IO client connected', { socketId: socket.id, userId });

  // Join a bot's room to receive messages for that bot (with ownership verification)
  socket.on('join:bot', async (botId: string) => {
    try {
      const bot = await prisma.bot.findFirst({
        where: { id: botId, userId },
      });

      if (bot) {
        socket.join(`bot:${botId}`);
        logger.debug('Client joined bot room', { socketId: socket.id, botId });
      } else {
        socket.emit('error', 'Not authorized to access this bot');
        logger.warn('Unauthorized bot room join attempt', { socketId: socket.id, botId, userId });
      }
    } catch (error) {
      logger.error('Error joining bot room', { error, botId });
    }
  });

  // Leave a bot's room
  socket.on('leave:bot', (botId: string) => {
    socket.leave(`bot:${botId}`);
    logger.debug('Client left bot room', { socketId: socket.id, botId });
  });

  // Join a specific conversation room (with ownership verification)
  socket.on('join:conversation', async (conversationId: string) => {
    try {
      const conversation = await prisma.conversation.findFirst({
        where: { id: conversationId },
        include: { bot: true },
      });

      if (conversation && conversation.bot.userId === userId) {
        socket.join(`conversation:${conversationId}`);
        logger.debug('Client joined conversation room', { socketId: socket.id, conversationId });
      } else {
        socket.emit('error', 'Not authorized to access this conversation');
        logger.warn('Unauthorized conversation room join attempt', { socketId: socket.id, conversationId, userId });
      }
    } catch (error) {
      logger.error('Error joining conversation room', { error, conversationId });
    }
  });

  // Leave a conversation room
  socket.on('leave:conversation', (conversationId: string) => {
    socket.leave(`conversation:${conversationId}`);
    logger.debug('Client left conversation room', { socketId: socket.id, conversationId });
  });

  socket.on('disconnect', () => {
    logger.debug('Socket.IO client disconnected', { socketId: socket.id });
  });
});

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

// Body parsing
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Request logging
app.use(requestLogger);

// Rate limiting - apply before routes
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);
app.use('/api/webhooks', webhookLimiter);
app.use('/api', apiLimiter);

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
