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
      if (String(alertData.commuterId) === String(user?._id)) return;
      console.warn('🚨 REAL-TIME GUARDIAN EMERGENCY SIGNAL RECEIVED:', alertData);
      setLatestEmergencyAlert(alertData);
      setShowGuardianModal(true);
    };

    const handleEmergencyResolved = (data) => {
      if (!data.userId) return;
      setLatestEmergencyAlert((current) => (
        current && String(current.commuterId) === String(data.userId) ? null : current
      ));
      setShowGuardianModal(false);
    };

    const handleDuressEscalated = (data) => {
      setLatestEmergencyAlert((current) => {
        if (!current || String(current.commuterId) !== String(data.userId)) return current;
        return {
          ...current,
          status: 'DURESS',
          severity: 'CRITICAL',
          message: data.message,
          startCoords: data.location
            ? { lat: data.location.latitude, lng: data.location.longitude }
            : current.startCoords,
        };
      });
    };

    socket.on('EMERGENCY_ALERT_BROADCAST', handleEmergencyBroadcast);
    socket.on('EMERGENCY_RESOLVED', handleEmergencyResolved);
    socket.on('EMERGENCY_DURESS_ESCALATED', handleDuressEscalated);

    return () => {
      socket.off('EMERGENCY_ALERT_BROADCAST', handleEmergencyBroadcast);
      socket.off('EMERGENCY_RESOLVED', handleEmergencyResolved);
      socket.off('EMERGENCY_DURESS_ESCALATED', handleDuressEscalated);
    };
  }, [socket, user?._id]);

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
