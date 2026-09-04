import React, { createContext, useEffect, useState, useContext } from 'react';
import { io } from 'socket.io-client';
import { AuthContext } from './AuthContext';

export const SocketContext = createContext();

export const SocketProvider = ({ children }) => {
  const { user } = useContext(AuthContext);
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [activeTrip, setActiveTrip] = useState(null);
  const [signalLossAlert, setSignalLossAlert] = useState(null);

  useEffect(() => {
    const socketUrl = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';
    const newSocket = io(socketUrl, {
      transports: ['websocket', 'polling'],
      autoConnect: true,
    });

    setSocket(newSocket);

    newSocket.on('connect', () => {
      console.log('[Socket.io Client] Connected with ID:', newSocket.id);
      setIsConnected(true);
    });

    newSocket.on('disconnect', () => {
      console.log('[Socket.io Client] Disconnected');
      setIsConnected(false);
    });

    newSocket.on('connect_error', (err) => {
      console.warn('[Socket.io Connection Error]', err.message);
      setIsConnected(false);
    });

    newSocket.on('SIGNAL_LOSS_ALERT', (alertData) => {
      console.warn('[Socket.io Alert] Signal Loss Alert Received:', alertData);
      setSignalLossAlert(alertData);
    });

    // The Dead-Battery Final Emergency Blast fires via navigator.sendBeacon(), which is
    // fire-and-forget - the tab that sent it never gets a response back to update its own
    // trip state. This broadcast (same escalation pathway as the panic button) is what
    // actually flips the commuter's own screen to the EMERGENCY view for that case.
    newSocket.on('EMERGENCY_ALERT', (alertData) => {
      console.warn('[Socket.io Alert] EMERGENCY_ALERT received:', alertData);
      setActiveTrip((prev) => {
        if (!prev || String(prev._id) !== String(alertData.tripId)) return prev;
        return { ...prev, status: 'EMERGENCY', emergencySource: alertData.source };
      });
    });

    return () => {
      newSocket.close();
    };
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
        isConnected,
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

export default SocketProvider;
