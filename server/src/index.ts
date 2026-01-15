import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import path from 'path';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { env } from './config/env.js';
import routes from './routes/index.js';
import { errorHandler } from './middlewares/errorHandler.js';
import { schedulerService } from './services/scheduler.service.js';

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

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log(`[Socket.IO] Client connected: ${socket.id}`);

  // Join a bot's room to receive messages for that bot
  socket.on('join:bot', (botId: string) => {
    socket.join(`bot:${botId}`);
    console.log(`[Socket.IO] Client ${socket.id} joined room: bot:${botId}`);
  });

  // Leave a bot's room
  socket.on('leave:bot', (botId: string) => {
    socket.leave(`bot:${botId}`);
    console.log(`[Socket.IO] Client ${socket.id} left room: bot:${botId}`);
  });

  // Join a specific conversation room
  socket.on('join:conversation', (conversationId: string) => {
    socket.join(`conversation:${conversationId}`);
    console.log(`[Socket.IO] Client ${socket.id} joined conversation: ${conversationId}`);
  });

  // Leave a conversation room
  socket.on('leave:conversation', (conversationId: string) => {
    socket.leave(`conversation:${conversationId}`);
    console.log(`[Socket.IO] Client ${socket.id} left conversation: ${conversationId}`);
  });

  socket.on('disconnect', () => {
    console.log(`[Socket.IO] Client disconnected: ${socket.id}`);
  });
});

// Middleware
app.use(cors({
  origin: corsOrigins,
  credentials: true,
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(morgan('dev'));

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
  console.log(`🚀 Server running on http://localhost:${env.PORT}`);
  console.log(`📚 API available at http://localhost:${env.PORT}/api`);
  console.log(`🔌 Socket.IO enabled`);

  // Initialize scheduler service for broadcast scheduling
  await schedulerService.init();
});
