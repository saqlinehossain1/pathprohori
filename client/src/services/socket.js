import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://127.0.0.1:5000';

export const socket = io(SOCKET_URL, {
  transports: ['websocket', 'polling'],
  autoConnect: true,
});

socket.on('connect', () => {
  console.log('[Socket.io Client] Connected with ID:', socket.id);
});

socket.on('disconnect', () => {
  console.log('[Socket.io Client] Disconnected from server');
});

socket.on('connect_error', (err) => {
  console.warn('[Socket.io Client] Connection error:', err.message);
});

export default socket;
