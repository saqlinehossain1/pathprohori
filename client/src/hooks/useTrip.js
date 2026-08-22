import { useState, useEffect, useContext, useCallback } from 'react';
import { SocketContext } from '../context/SocketContext';
import tripApi from '../api/tripApi';

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
  const deactivateAlarm = async (pin) => {
    if (!activeTrip) return;
    try {
      setDeactivating(true);
      setDeactivateError('');
      const coords = await getBestEffortCoords();
      const res = await tripApi.deactivateAlarm(activeTrip._id, { pin, ...coords });
      setActiveTrip((prev) => (prev ? { ...prev, status: res.status || 'ACTIVE' } : prev));
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
