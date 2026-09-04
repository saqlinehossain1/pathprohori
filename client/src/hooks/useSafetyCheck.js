import { useState, useEffect, useCallback, useRef } from 'react';
import { socket } from '../services/socket';
import tripApi from '../api/tripApi';

// Route Deviation & Unexpected Stop Detection: listens for the server's periodic route
// monitor asking the commuter to confirm they're okay before it escalates to guardians.
// Deliberately does no detection of its own - the server (routeMonitorService.js) owns
// that, so timing (grace periods, thresholds) stays accurate even if this tab is backgrounded.
export const useSafetyCheck = (trip) => {
  const [pendingCheck, setPendingCheck] = useState(null);
  const [responding, setResponding] = useState(false);
  const tripIdRef = useRef(trip?._id);
  tripIdRef.current = trip?._id;

  useEffect(() => {
    const handleRequired = (payload) => {
      if (!payload?.tripId || String(payload.tripId) !== String(tripIdRef.current)) return;
      console.warn('[Safety Check] Received safety check request from server:', payload);
      setPendingCheck(payload);
    };
    const handleResolved = (payload) => {
      if (!payload?.tripId || String(payload.tripId) !== String(tripIdRef.current)) return;
      console.log('[Safety Check] Safety check resolved:', payload);
      setPendingCheck(null);
    };

    socket.on('SAFETY_CHECK_REQUIRED', handleRequired);
    socket.on('SAFETY_CHECK_RESOLVED', handleResolved);
    return () => {
      socket.off('SAFETY_CHECK_REQUIRED', handleRequired);
      socket.off('SAFETY_CHECK_RESOLVED', handleResolved);
    };
  }, []);

  // A new trip, or this one leaving ACTIVE status (completed, or escalated to EMERGENCY by
  // this same check timing out), clears any stale pending check from the UI.
  useEffect(() => {
    if (trip?.status !== 'ACTIVE') {
      setPendingCheck(null);
    }
  }, [trip?._id, trip?.status]);

  const respondSafe = useCallback(async () => {
    if (!tripIdRef.current) return;
    try {
      setResponding(true);
      await tripApi.respondToSafetyCheck(tripIdRef.current);
      console.log("[Safety Check] Commuter confirmed \"I'm Safe\".");
      setPendingCheck(null);
    } catch (err) {
      console.error("[Safety Check] Failed to submit \"I'm Safe\" response:", err);
      throw err;
    } finally {
      setResponding(false);
    }
  }, []);

  return { pendingCheck, respondSafe, responding };
};

export default useSafetyCheck;
