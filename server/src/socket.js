import { Server } from 'socket.io';

let io;

export const setIO = (ioInstance) => {
  io = ioInstance;
};

export const initializeSocket = (server) => {
    io = new Server(server, {
        cors: {
            origin: 'http://localhost:5173',
            credentials: true,
        },
    });

    io.on('connection', (socket) => {
        console.log('[Socket.io] Client connected:', socket.id);

        // Guardian joins their personal room
        socket.on('join-user-room', (userId) => {
            if (!userId) return;

            socket.join(`user:${userId}`);

            console.log(
                `[Socket.io] User ${userId} joined room user:${userId}`
            );
        });

        socket.on('disconnect', () => {
            console.log(
                '[Socket.io] Client disconnected:',
                socket.id
            );
        });
    });

    return io;
};

export const getIO = () => {
    if (!io) {
        throw new Error('Socket.io has not been initialized');
    }

    return io;
};