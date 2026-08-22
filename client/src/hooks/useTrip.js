import { useState, useEffect, useContext, useCallback } from 'react';
import { SocketContext } from '../context/SocketContext';
import tripApi from '../api/tripApi';

export const useTrip = () => {
  const { activeTrip, setActiveTrip, signalLossAlert } = useContext(SocketContext);
  const [loading, setLoading] = useState(true);
  const [panicLoading, setPanicLoading] = useState(false);
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

  const triggerPanic = async () => {
    if (!activeTrip) return;
    try {
      setPanicLoading(true);
<<<<<<< Updated upstream
      const res = await tripApi.triggerPanic(activeTrip._id);
=======
      const coords = await getBestEffortCoords();
      const res = await tripApi.triggerPanic(activeTrip._id, isDuress, coords);
>>>>>>> Stashed changes
      setActiveTrip(res.trip);
      return res.trip;
    } catch (err) {
      console.error('Failed to trigger panic alarm:', err);
      throw err;
    } finally {
      setPanicLoading(false);
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
    error,
    startTrip,
    triggerPanic,
    completeTrip,
    refreshActiveTrip: fetchActiveTrip,
  };
};

export default useTrip;
