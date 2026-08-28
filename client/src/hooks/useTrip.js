import { useState, useEffect, useContext, useCallback } from 'react';
import { SocketContext } from '../context/SocketContext';
import tripApi from '../api/tripApi';
import { clearBatteryAlertFlag } from '../utils/batteryAlertStorage';
import { captureEvidenceBurst } from '../services/evidenceLockerService';

const getBestEffortCoords = async () => {
  if (!navigator.geolocation) return {};
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        resolve({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        });
      },
      () => resolve({}),
      { timeout: 3000, enableHighAccuracy: true }
    );
  });
};

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

  const triggerPanic = async (isDuress = false, customCoords = null) => {
    if (!activeTrip) return;
    try {
      setPanicLoading(true);
      const coords = customCoords || (await getBestEffortCoords());
      const res = await tripApi.triggerPanic(activeTrip._id, isDuress, coords);
      setActiveTrip(res.trip || res);

      // Low-Bandwidth Evidence Locker: silently capture photo burst and audio
      const emergencyId = res.emergencyId || res.emergency?._id;
      if (emergencyId) {
        captureEvidenceBurst(emergencyId).catch((evErr) =>
          console.warn('[Evidence Locker Trip Panic Error]', evErr)
        );
      }

      return res.trip || res;
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
      setPanicLoading(true);
      const res = await tripApi.cancelPanic(activeTrip._id, pinCode);
      setActiveTrip(res.trip || res);
      return res.trip || res;
    } catch (err) {
      console.error('Failed to cancel panic:', err);
      throw err;
    } finally {
      setPanicLoading(false);
    }
  };

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
    refreshActiveTrip: fetchActiveTrip,
  };
};

export default useTrip;
