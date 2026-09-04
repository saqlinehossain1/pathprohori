import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import { setIO } from './socket.js';
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

import emergencyRoutes from './routes/emergencyRoutes.js';
import safetyZoneRoutes from './routes/safetyZoneRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import geocodeRoutes from './routes/geocodeRoutes.js';

// Load environment variables
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
setIO(io);
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
app.use('/api/emergency', emergencyRoutes);
app.use('/api/safety-zones', safetyZoneRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/geocode', geocodeRoutes);

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
// Real-Time Socket.io Connection Handlers
io.on('connection', (socket) => {
  console.log(`[Socket.io] Client connected: ${socket.id}`);

  // Join personal user room
  socket.on('JOIN_USER_ROOM', (userId) => {
    if (!userId) {
      console.log('[Socket.io] No userId provided');
      return;
    }

    socket.join(`user_${userId}`);

    console.log(
      `[Socket.io] Client ${socket.id} joined user_${userId}`
    );
  });

  // Join trip room
  socket.on('JOIN_TRIP_ROOM', (tripId) => {
    if (!tripId) {
      console.log('[Socket.io] No tripId provided');
      return;
    }

    socket.join(`trip_${tripId}`);

    console.log(
      `[Socket.io] Client ${socket.id} joined trip_${tripId}`
    );
  });

  // Join public guardian live tracking room
  socket.on('JOIN_PUBLIC_TRACKING', (tripId) => {
    if (!tripId) return;
    socket.join(`track_${tripId}`);
    console.log(`[Socket.io] Guardian client ${socket.id} joined live tracking for trip: track_${tripId}`);
  });

  // Client heartbeat ping event
  socket.on('CLIENT_HEARTBEAT_PING', (data) => {
    if (!data?.tripId) return;

    io.to(`trip_${data.tripId}`).emit('HEARTBEAT_RECEIVED', {
      tripId: data.tripId,
      timestamp: new Date(),
    });

    if (data.coords) {
      io.to(`track_${data.tripId}`).emit('TRACKING_LOCATION_UPDATE', {
        coords: data.coords,
        batteryLevel: data.batteryLevel,
        status: data.status || 'ACTIVE',
        updatedAt: new Date(),
      });
    }
  });

  socket.on('disconnect', () => {
    console.log(
      `[Socket.io] Client disconnected: ${socket.id}`
    );
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

// Process-level unhandled rejection/exception guards to prevent abrupt connection resets
process.on('unhandledRejection', (reason, promise) => {
  console.error('[Process Warning: Unhandled Rejection]', reason);
});

process.on('uncaughtException', (err) => {
  console.error('[Process Warning: Uncaught Exception]', err);
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`==================================================`);
  console.log(`  PATHPROHORI Server Running on Port ${PORT}      `);
  console.log(`  MERN Stack Infrastructure & Enterprise MVC      `);
  console.log(`==================================================`);
});
