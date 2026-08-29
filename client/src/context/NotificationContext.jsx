import React, { createContext, useContext, useEffect, useState } from 'react';
import { AuthContext } from './AuthContext';
import { socket } from '../services/socket';
import API from '../api/axiosConfig';

export const NotificationContext = createContext();

export const NotificationProvider = ({ children }) => {
  const { user } = useContext(AuthContext);
  const [notifications, setNotifications] = useState([]);

  // Fetch historical / active emergencies on mount or when user changes
  useEffect(() => {
    if (!user?._id) return;

    const fetchInitialEmergencies = async () => {
      try {
        const response = await API.get('/emergency');
        if (Array.isArray(response.data)) {
          // Filter out emergencies triggered by the logged-in user themselves
          const guardianAlerts = response.data.filter(
            (n) => n.user?.id !== user._id && n.user?._id !== user._id
          );
          setNotifications(guardianAlerts);
        }
        const warningResponse = await API.get('/notifications');
        if (Array.isArray(warningResponse.data)) {
          const warnings = warningResponse.data.map((item) => ({
            id: item._id,
            emergencyId: item._id,
            tripId: item.tripId,
            type: item.type || 'WARNING',
            alertType: item.type === 'WARNING' ? 'MANUAL_UNSAFE' : item.type,
            title: item.title,
            message: `${item.commuterName || 'A traveler'} has a safety warning for ${item.destination || 'their journey'}.`,
            user: { name: item.commuterName, id: item.senderId },
            location: item.location,
            timestamp: item.createdAt,
            status: item.resolvedAt ? 'RESOLVED' : 'ACTIVE',
            read: item.isRead,
          }));
          setNotifications((current) => [...warnings, ...current]);
        }
      } catch (err) {
        console.warn('[NotificationContext] Initial emergency fetch error:', err.message);
      }
    };

    fetchInitialEmergencies();
  }, [user?._id]);

  useEffect(() => {
    if (!user?._id) return;

    const userId = user._id;

    // Join room for real-time alerts
    socket.emit('JOIN_USER_ROOM', userId);
    console.log(`[NotificationContext] Joined user room: user_${userId}`);

    const handleConnect = () => {
      socket.emit('JOIN_USER_ROOM', userId);
      console.log(`[NotificationContext] Re-joined user room on reconnect: user_${userId}`);
    };

    const handleEmergencyAlert = (data) => {
      // Ignore emergency alerts triggered by the user themselves
      if (data.user?.id === userId || data.user?._id === userId) {
        console.log('[NotificationContext] Ignored self-triggered emergency alert.');
        return;
      }

      console.log('[NotificationContext] Real-time EMERGENCY_ALERT received:', data);

      const newNotification = {
        id: data.emergencyId || data.id || `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        emergencyId: data.emergencyId || data.id,
        trackingToken: data.trackingToken,
        trackingUrl: data.trackingUrl,
        type: data.type || 'EMERGENCY',
        title: data.title || '🚨 Emergency Alert',
        message: data.message || `${data.user?.name || 'A commuter'} has triggered an emergency alert!`,
        user: data.user || null,
        location: data.location || null,
        timestamp: data.timestamp || new Date().toISOString(),
        status: data.status || 'ACTIVE',
        read: false,
      };

      setNotifications((prev) => {
        const exists = prev.some((n) => n.id === newNotification.id);
        if (exists) return prev;
        return [newNotification, ...prev];
      });
    };

    const handleEmergencyResolved = (data) => {
      console.log('[NotificationContext] EMERGENCY_RESOLVED received:', data);
      setNotifications((prev) =>
        prev.map((n) => {
          const resolvedIds = data.emergencyIds || [data.emergencyId];
          if (resolvedIds.some((id) => String(id) === String(n.id) || String(id) === String(n.emergencyId))) {
            return { ...n, status: 'RESOLVED', read: true, resolvedAt: data.resolvedAt || new Date().toISOString() };
          }
          return n;
        })
      );
    };

    const handleEmergencyAlertBroadcast = (data) => {
      if (String(data.commuterId) === String(userId)) return;

      const newNotif = {
        id: data.emergencyId || data.tripId || `notif_${Date.now()}`,
        emergencyId: data.emergencyId || data.tripId,
        trackingToken: data.trackingToken,
        trackingUrl: data.trackingUrl,
        type: 'EMERGENCY',
        title: '🚨 CRITICAL PANIC ALERT',
        message: `${data.commuterName} activated CRITICAL PANIC mode in ${data.vehicleType || 'Vehicle'} (${data.numberPlate || ''}). Destination: ${data.destination || 'In Transit'}`,
        user: {
          id: data.commuterId,
          name: data.commuterName,
          phone: data.commuterPhone,
          avatarUrl: data.avatarUrl,
        },
        location: {
          latitude: data.location?.latitude ?? data.location?.lat ?? data.startCoords?.lat ?? 23.7808875,
          longitude: data.location?.longitude ?? data.location?.lng ?? data.startCoords?.lng ?? 90.4068305,
          address: data.location?.address || `${data.vehicleType || 'Vehicle'} (${data.numberPlate || ''}) -> Dest: ${data.destination || 'In Transit'}`,
        },
        timestamp: data.timestamp || new Date().toISOString(),
        status: 'ACTIVE',
        read: false,
      };

      setNotifications((prev) => {
        if (prev.some((n) => n.id === newNotif.id)) return prev;
        return [newNotif, ...prev];
      });
    };

    const handleDuressEscalated = (data) => {
      const escalatedIds = data.emergencyIds || [data.emergencyId];
      setNotifications((prev) =>
        prev.map((notification) =>
          escalatedIds.some(
            (id) =>
              String(id) === String(notification.id) ||
              String(id) === String(notification.emergencyId)
          )
            ? {
                ...notification,
                status: 'ACTIVE',
                severity: 'CRITICAL',
                alertType: 'SILENT_DURESS',
                title: '🚨 SILENT DURESS ALERT',
                message: data.message || 'Silent duress PIN entered. Contact police immediately.',
                location: data.location || notification.location,
                read: false,
              }
            : notification
        )
      );
    };

    const handleSafetyWarning = (data) => {
      if (String(data.senderId || data.userId) === String(userId)) return;
      const warning = {
        id: data.notificationId || data.tripId || `warning_${Date.now()}`,
        emergencyId: data.notificationId,
        tripId: data.tripId,
        type: 'WARNING',
        alertType: 'MANUAL_UNSAFE',
        title: data.title || 'Traveler marked journey unsafe',
        message: `${data.commuterName || 'A traveler'} needs attention on the journey to ${data.destination || 'their destination'}.`,
        user: { id: data.senderId || data.userId, name: data.commuterName },
        location: data.location,
        timestamp: data.timestamp || new Date().toISOString(),
        status: 'ACTIVE',
        read: false,
      };
      setNotifications((prev) => (prev.some((item) => item.id === warning.id) ? prev : [warning, ...prev]));
    };

    socket.on('connect', handleConnect);
    socket.on('EMERGENCY_ALERT', handleEmergencyAlert);
    socket.on('EMERGENCY_ALERT_BROADCAST', handleEmergencyAlertBroadcast);
    socket.on('EMERGENCY_RESOLVED', handleEmergencyResolved);
    socket.on('EMERGENCY_DURESS_ESCALATED', handleDuressEscalated);
    socket.on('SAFETY_WARNING', handleSafetyWarning);

    return () => {
      console.log('[NotificationContext] Cleaning up Socket.IO listeners');
      socket.off('connect', handleConnect);
      socket.off('EMERGENCY_ALERT', handleEmergencyAlert);
      socket.off('EMERGENCY_ALERT_BROADCAST', handleEmergencyAlertBroadcast);
      socket.off('EMERGENCY_RESOLVED', handleEmergencyResolved);
      socket.off('EMERGENCY_DURESS_ESCALATED', handleDuressEscalated);
      socket.off('SAFETY_WARNING', handleSafetyWarning);
    };
  }, [user?._id]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markAsRead = (notificationId) => {
    setNotifications((prev) =>
      prev.map((notification) => {
        if (!notificationId || String(notification.id) === String(notificationId)) {
          return { ...notification, read: true };
        }
        return notification;
      })
    );
  };

  const markAllAsRead = () => markAsRead();

  const markAsResolved = (notificationId) => {
    setNotifications((prev) =>
      prev.map((notification) =>
        String(notification.id) === String(notificationId)
          ? { ...notification, status: 'RESOLVED', read: true, resolvedAt: new Date().toISOString() }
          : notification
      )
    );
  };

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        markAsRead,
        markAllAsRead,
        markAsResolved,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};

export default NotificationProvider;
