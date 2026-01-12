import express from 'express';
import cors from 'cors';
import { env } from './config/env.js';
import routes from './routes/index.js';
import { errorHandler } from './middlewares/errorHandler.js';

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api', routes);

// Error handler
app.use(errorHandler);

// Start server
app.listen(env.PORT, () => {
  console.log(`🚀 Server running on http://localhost:${env.PORT}`);
  console.log(`📚 API available at http://localhost:${env.PORT}/api`);
});
