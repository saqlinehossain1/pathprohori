import React, { createContext, useEffect, useState, useContext } from 'react';
import { io } from 'socket.io-client';
import { AuthContext } from './AuthContext';

export const SocketContext = createContext();

export const SocketProvider = ({ children }) => {
  const { user } = useContext(AuthContext);
  const [socket, setSocket] = useState(null);
  const [activeTrip, setActiveTrip] = useState(null);
  const [signalLossAlert, setSignalLossAlert] = useState(null);

  useEffect(() => {
    const newSocket = io('/', {
      transports: ['websocket', 'polling'],
    });

    setSocket(newSocket);

    newSocket.on('connect', () => {
      console.log('[Socket.io Client] Connected with ID:', newSocket.id);
    });

    newSocket.on('SIGNAL_LOSS_ALERT', (alertData) => {
      console.warn('[Socket.io Alert] Signal Loss Alert Received:', alertData);
      setSignalLossAlert(alertData);
    });

    return () => newSocket.close();
  }, []);

  // Heartbeat loop for active trips (sends ping every 15s)
  useEffect(() => {
    if (!socket || !activeTrip || activeTrip.status !== 'ACTIVE') return;

    const interval = setInterval(() => {
      console.log('[Heartbeat] Sending Client Heartbeat Ping for Trip:', activeTrip._id);
      socket.emit('CLIENT_HEARTBEAT_PING', {
        tripId: activeTrip._id,
        userId: user?._id,
      });
    }, 15000);

    return () => clearInterval(interval);
  }, [socket, activeTrip, user]);

  return (
    <SocketContext.Provider
      value={{
        socket,
        activeTrip,
        setActiveTrip,
        signalLossAlert,
        setSignalLossAlert,
      }}
    >
      {children}
    </SocketContext.Provider>
  );
};
