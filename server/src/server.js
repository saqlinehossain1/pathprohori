import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import { connectDB } from './config/db.js';
import { seedDemoUsers, seedInitialIncidents } from './config/seedData.js';
import authRoutes from './routes/authRoutes.js';
import tripRoutes from './routes/tripRoutes.js';
import incidentRoutes from './routes/incidentRoutes.js';
import uploadRoutes from './routes/uploadRoutes.js';
import { startHeartbeatMonitor } from './services/heartbeatService.js';
import { startRouteDeviationMonitor } from './services/routeMonitorService.js';
import { startPrivacyCron } from './services/privacyCron.js';
import { notFoundHandler, errorHandler } from './middleware/errorMiddleware.js';

dotenv.config();

const app = express();
const server = http.createServer(app);

// Socket.io initialization with CORS
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
  },
});

// Make the Socket.io instance reachable from controllers (req.app.get('io')) so the
// shared emergency-escalation pathway can broadcast without a circular import.
app.set('io', io);

// Middlewares with larger payload limit for base64 Cloudinary image uploads
app.use(cors());
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ limit: '15mb', extended: true }));

// Database Connection & Initial Seeding
connectDB().then(async () => {
  const seedEnabled = process.env.SEED_DB === 'true';
  if (seedEnabled) {
    await seedDemoUsers();
    await seedInitialIncidents();
    console.log('[Database Seed] Completed');
  }
});

// API Endpoints
app.use('/api/auth', authRoutes);
app.use('/api/trips', tripRoutes);
app.use('/api/incidents', incidentRoutes);
app.use('/api/upload', uploadRoutes);

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ONLINE',
    system: 'PATHPROHORI Hyperlocal Transit Ecosystem',
    time: new Date(),
  });
});

// Error Handling Middlewares
app.use(notFoundHandler);
app.use(errorHandler);

// Real-Time Socket.io Connection Handlers
io.on('connection', (socket) => {
  console.log(`[Socket.io] Client connected: ${socket.id}`);

  // Join user / trip room
  socket.on('JOIN_TRIP_ROOM', (tripId) => {
    socket.join(`trip_${tripId}`);
    console.log(`[Socket.io] Client ${socket.id} joined trip_${tripId}`);
  });

  // Client heartbeat ping event
  socket.on('CLIENT_HEARTBEAT_PING', (data) => {
    io.to(`trip_${data.tripId}`).emit('HEARTBEAT_RECEIVED', {
      tripId: data.tripId,
      timestamp: new Date(),
    });
  });

  socket.on('disconnect', () => {
    console.log(`[Socket.io] Client disconnected: ${socket.id}`);
  });
});

// Start Background Services
startHeartbeatMonitor(io);
startRouteDeviationMonitor(io);
startPrivacyCron();

const PORT = process.env.PORT || 5000;

server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`[Server Error] Port ${PORT} is already in use by another process.`);
    console.error(`[Fix] Kill existing Node process on port ${PORT} or change PORT in server/.env`);
    process.exit(1);
  } else {
    console.error('[Server Error]', error);
  }
});

server.listen(PORT, () => {
  console.log(`==================================================`);
  console.log(`  PATHPROHORI Server Running on Port ${PORT}      `);
  console.log(`  MERN Stack Infrastructure & Enterprise MVC      `);
  console.log(`==================================================`);
});
