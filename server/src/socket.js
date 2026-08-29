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

        // User/Guardian joins their personal notification room
        const handleJoinRoom = (userId) => {
            if (!userId) return;
            socket.join(`user:${userId}`);
            socket.join(`user_${userId}`);
            socket.join(String(userId));
            console.log(`[Socket.io] User ${userId} joined room user_${userId} & user:${userId}`);
        };

        socket.on('join-user-room', handleJoinRoom);
        socket.on('JOIN_USER_ROOM', handleJoinRoom);
        socket.on('join_user_room', handleJoinRoom);

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