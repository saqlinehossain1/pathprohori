import { useState, useEffect, useContext, useCallback } from 'react';
import { SocketContext } from '../context/SocketContext';
import tripApi from '../api/tripApi';
import { clearBatteryAlertFlag } from '../utils/batteryAlertStorage';
import { captureEvidenceBurst } from '../services/evidenceLockerService';

export const useTrip = () => {
  const { activeTrip, setActiveTrip, signalLossAlert } = useContext(SocketContext);
  const [loading, setLoading] = useState(true);
  const [panicLoading, setPanicLoading] = useState(false);
  const [deactivating, setDeactivating] = useState(false);
  const [deactivateError, setDeactivateError] = useState('');
  const [error, setError] = useState(null);

  const fetchActiveTrip = useCallback(async () => {
    try {
      setLoading(true);
      const data = await tripApi.getActiveTrip();
      setActiveTrip(data);
    } catch (err) {
      console.error('Failed to fetch active trip:', err);
      setError(err.response?.data?.message || 'Failed to check active journey state.');
    } finally {
      setLoading(false);
    }
  }, [setActiveTrip]);

  useEffect(() => {
    fetchActiveTrip();
  }, [fetchActiveTrip]);

  const startTrip = async (tripForm) => {
    try {
      setLoading(true);
      const newTrip = await tripApi.createTrip(tripForm);
      // Dead-Battery Final Emergency Blast: a new trip starting is one of the two
      // conditions (the other being charging back above 15%) that resets the
      // one-time low-battery alert flag - clear whatever the previous trip left behind.
      if (activeTrip?._id) {
        clearBatteryAlertFlag(activeTrip._id);
        console.log(`[Battery Emergency] New trip started (${newTrip._id}) - low-battery alert flag reset.`);
      }
      setActiveTrip(newTrip);
      return newTrip;
    } catch (err) {
      console.error('Failed to start trip:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const triggerPanic = async (isDuress = false) => {
    if (!activeTrip) return;
    try {
      setPanicLoading(true);
      const res = await tripApi.triggerPanic(activeTrip._id, isDuress);
      setActiveTrip(res.trip);

      // Low-Bandwidth Evidence Locker: silently capture photo burst and audio
      const emergencyId = res.emergencyId || res.emergency?._id;
      if (emergencyId) {
        captureEvidenceBurst(emergencyId).catch((evErr) =>
          console.warn('[Evidence Locker Trip Panic Error]', evErr)
        );
      }

      return res.trip;
    } catch (err) {
      console.error('Failed to trigger panic alarm:', err);
      throw err;
    } finally {
      setPanicLoading(false);
    }
  };

  const cancelPanic = async (pinCode = '') => {
    if (!activeTrip) return;
    try {
      const res = await tripApi.cancelPanic(activeTrip._id, pinCode);
      setActiveTrip(res.trip);
      return res.trip;
    } catch (err) {
      console.error('Failed to cancel panic alarm:', err);
      throw err;
    }
  };

  // Best-effort current position for the deactivation location snapshot -
  // never blocks the PIN flow if location is unavailable or denied.
  const getBestEffortCoords = () =>
    new Promise((resolve) => {
      if (!navigator.geolocation) return resolve({});
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
        () => resolve({}),
        { enableHighAccuracy: true, timeout: 3000, maximumAge: 10000 }
      );
    });

  // Dual-PIN Silent Duress Deactivation: entering either the normal PIN or the
  // secret fake PIN always resolves the same way here - the backend alone knows
  // which branch actually ran, and the local trip state is simply reset to ACTIVE.
  const deactivateAlarm = async (pin, finishJourney = false) => {
    if (!activeTrip) return;
    try {
      setDeactivating(true);
      setDeactivateError('');
      const coords = await getBestEffortCoords();
      const res = await tripApi.deactivateAlarm(activeTrip._id, { pin, finishJourney, ...coords });
      setActiveTrip((prev) => (finishJourney ? null : (prev ? { ...prev, status: res.status || 'ACTIVE' } : prev)));
      return res;
    } catch (err) {
      const message = err.response?.data?.message || 'Failed to deactivate alarm.';
      setDeactivateError(message);
      throw err;
    } finally {
      setDeactivating(false);
    }
  };

  const completeTrip = async () => {
    if (!activeTrip) return;
    try {
      await tripApi.completeTrip(activeTrip._id);
      setActiveTrip(null);
    } catch (err) {
      console.error('Failed to complete trip:', err);
      throw err;
    }
  };

  const updateSafetyStatus = async (safetyStatus, coords = {}) => {
    if (!activeTrip) return;
    const res = await tripApi.updateSafetyStatus(activeTrip._id, {
      safetyStatus,
      latitude: coords.lat,
      longitude: coords.lng,
    });
    setActiveTrip((prev) => (prev ? { ...prev, safetyStatus: res.safetyStatus } : prev));
    return res;
  };

  return {
    activeTrip,
    signalLossAlert,
    loading,
    panicLoading,
    deactivating,
    deactivateError,
    error,
    startTrip,
    triggerPanic,
    cancelPanic,
    deactivateAlarm,
    completeTrip,
    updateSafetyStatus,
    refreshActiveTrip: fetchActiveTrip,
  };
};

export default useTrip;
