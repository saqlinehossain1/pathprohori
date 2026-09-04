// QA-ONLY test harness for Route Deviation & Unexpected Stop Detection. Not part of the app;
// deleted after the QA pass. Talks to the real running server over HTTP + a real Socket.io
// client connection, and reads MongoDB directly via mongoose for state verification.
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { io as ioClient } from '../client/node_modules/socket.io-client/build/esm/index.js';

dotenv.config();

const BASE = 'http://127.0.0.1:5000/api';

export const login = async (email, password) => {
  const res = await fetch(`${BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`Login failed for ${email}: ${JSON.stringify(data)}`);
  return data; // { token, _id, name, ... } (whatever authController returns)
};

export const api = async (token, method, path, body) => {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  let data = null;
  try { data = await res.json(); } catch { /* no body */ }
  return { status: res.status, ok: res.ok, data };
};

export const connectDB = async () => {
  if (mongoose.connection.readyState === 1) return mongoose;
  await mongoose.connect(process.env.MONGO_URI);
  return mongoose;
};

export const openSocket = (userId) => {
  const socket = ioClient('http://127.0.0.1:5000', { transports: ['websocket'] });
  return new Promise((resolve, reject) => {
    socket.on('connect', () => {
      socket.emit('JOIN_USER_ROOM', userId);
      resolve(socket);
    });
    socket.on('connect_error', reject);
  });
};

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export const tsNow = () => new Date().toISOString().slice(11, 19);
export const log = (...args) => console.log(`[${tsNow()}]`, ...args);
