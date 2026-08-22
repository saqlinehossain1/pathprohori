import React, { createContext, useEffect, useState, useContext } from 'react';
import { socket } from '../services/socket';
import { AuthContext } from './AuthContext';

export const SocketContext = createContext();

export const SocketProvider = ({ children }) => {
  const { user } = useContext(AuthContext);
  const [isConnected, setIsConnected] = useState(socket.connected);
  const [activeTrip, setActiveTrip] = useState(null);
  const [signalLossAlert, setSignalLossAlert] = useState(null);

  useEffect(() => {
    const onConnect = () => setIsConnected(true);
    const onDisconnect = () => setIsConnected(false);
    const onSignalLoss = (alertData) => {
      console.warn('[Socket.io Alert] Signal Loss Alert Received:', alertData);
      setSignalLossAlert(alertData);
    };

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('SIGNAL_LOSS_ALERT', onSignalLoss);

    if (socket.connected) {
      setIsConnected(true);
    }

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('SIGNAL_LOSS_ALERT', onSignalLoss);
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

  const [latestEmergencyAlert, setLatestEmergencyAlert] = useState(null);
  const [showGuardianModal, setShowGuardianModal] = useState(false);

  useEffect(() => {
    if (!socket) return;

    const handleEmergencyBroadcast = (alertData) => {
      console.warn('🚨 REAL-TIME GUARDIAN EMERGENCY SIGNAL RECEIVED:', alertData);
      setLatestEmergencyAlert(alertData);
      setShowGuardianModal(true);
    };

    socket.on('EMERGENCY_ALERT_BROADCAST', handleEmergencyBroadcast);

    return () => {
      socket.off('EMERGENCY_ALERT_BROADCAST', handleEmergencyBroadcast);
    };
  }, [socket]);

  return (
    <SocketContext.Provider
      value={{
        socket,
        isConnected,
        activeTrip,
        setActiveTrip,
        signalLossAlert,
        setSignalLossAlert,
        latestEmergencyAlert,
        setLatestEmergencyAlert,
        showGuardianModal,
        setShowGuardianModal,
        reopenGuardianEmergencyModal: () => setShowGuardianModal(true),
        closeGuardianEmergencyModal: () => setShowGuardianModal(false),
      }}
    >
      {children}
    </SocketContext.Provider>
  );
};

export default SocketProvider;
