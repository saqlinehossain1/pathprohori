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

    // The Dead-Battery Final Emergency Blast fires via navigator.sendBeacon(), which is
    // fire-and-forget - the tab that sent it never gets a response back to update its own
    // trip state. This broadcast (same escalation pathway as the panic button) is what
    // actually flips the commuter's own screen to the EMERGENCY view for that case.
    const onEmergencyAlert = (alertData) => {
      console.warn('[Socket.io Alert] EMERGENCY_ALERT received:', alertData);
      setActiveTrip((prev) => {
        if (!prev || String(prev._id) !== String(alertData.tripId)) return prev;
        return { ...prev, status: 'EMERGENCY', emergencySource: alertData.source };
      });
    };

    socket.on('EMERGENCY_ALERT', onEmergencyAlert);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('SIGNAL_LOSS_ALERT', onSignalLoss);
      socket.off('EMERGENCY_ALERT', onEmergencyAlert);
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
      setLatestEmergencyAlert((current) => {
        if (!current) return null;
        const resolvedIds = (data?.emergencyIds || [data?.emergencyId]).map(String).filter(Boolean);
        const isMatch =
          resolvedIds.includes(String(current.emergencyId)) ||
          resolvedIds.includes(String(current._id)) ||
          resolvedIds.includes(String(current.id)) ||
          (data?.tripId && String(data.tripId) === String(current.tripId)) ||
          (data?.userId && String(data.userId) === String(current.commuterId));
        return isMatch ? null : current;
      });
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

    const handleEvidenceCaptured = (data) => {
      console.log('📸 REAL-TIME EVIDENCE CAPTURED VIA SOCKET:', data);
      setLatestEmergencyAlert((current) => {
        if (!current) return current;
        const alertEmergencyId = current.emergencyId || current._id || current.id;
        if (data.emergencyId && String(alertEmergencyId) === String(data.emergencyId)) {
          return {
            ...current,
            evidence: data.evidence || current.evidence,
          };
        }
        return current;
      });
    };

    socket.on('EMERGENCY_ALERT_BROADCAST', handleEmergencyBroadcast);
    socket.on('EMERGENCY_RESOLVED', handleEmergencyResolved);
    socket.on('EMERGENCY_DURESS_ESCALATED', handleDuressEscalated);
    socket.on('EVIDENCE_CAPTURED', handleEvidenceCaptured);

    return () => {
      socket.off('EMERGENCY_ALERT_BROADCAST', handleEmergencyBroadcast);
      socket.off('EMERGENCY_RESOLVED', handleEmergencyResolved);
      socket.off('EMERGENCY_DURESS_ESCALATED', handleDuressEscalated);
      socket.off('EVIDENCE_CAPTURED', handleEvidenceCaptured);
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
