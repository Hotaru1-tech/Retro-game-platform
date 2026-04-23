import express from 'express';
import cors from 'cors';
import http from 'http';
import { Server } from 'socket.io';
import { config } from './config';
import { setupSocketHandlers } from './sockets/game.socket';
import authController from './controllers/auth.controller';
import roomController from './controllers/room.controller';
import leaderboardController from './controllers/leaderboard.controller';
import developerController from './controllers/developer.controller';
import submissionController from './controllers/submission.controller';
import paymentController from './controllers/payment.controller';

const app = express();
const server = http.createServer(app);

const corsOrigins = [config.corsOrigin, /^http:\/\/localhost:\d+$/];

const io = new Server(server, {
  cors: {
    origin: corsOrigins,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    credentials: true,
  },
});

// Middleware
app.use(cors({ origin: corsOrigins, credentials: true }));
app.use(express.json());

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Routes
app.use('/api/auth', authController);
app.use('/api/rooms', roomController);
app.use('/api/leaderboard', leaderboardController);
app.use('/api/developer', developerController);
app.use('/api/submissions', submissionController);
app.use('/api/payments', paymentController);

// Socket.IO
setupSocketHandlers(io);

// Start server
server.listen(config.port, () => {
  console.log(`🎮 Retro Games Server running on port ${config.port}`);
  console.log(`📡 WebSocket ready`);
  console.log(`🌍 CORS origin: ${config.corsOrigin}`);
});

export { app, server, io };
