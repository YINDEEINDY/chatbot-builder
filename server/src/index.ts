import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { env } from './config/env.js';
import routes from './routes/index.js';
import { errorHandler } from './middlewares/errorHandler.js';

const app = express();
const httpServer = createServer(app);

// Initialize Socket.IO
export const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
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
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(morgan('dev'));

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api', routes);

// Error handler
app.use(errorHandler);

// Start server
httpServer.listen(env.PORT, () => {
  console.log(`🚀 Server running on http://localhost:${env.PORT}`);
  console.log(`📚 API available at http://localhost:${env.PORT}/api`);
  console.log(`🔌 Socket.IO enabled`);
});
