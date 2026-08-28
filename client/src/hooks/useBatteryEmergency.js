import { useEffect, useRef } from 'react';
import tripApi from '../api/tripApi';
import { hasBatteryAlertFired, markBatteryAlertFired, clearBatteryAlertFlag } from '../utils/batteryAlertStorage';

const CRITICAL_BATTERY_THRESHOLD = 0.05; // 5%
const SAFE_RESET_THRESHOLD = 0.15; // 15%

// Dead-Battery Final Emergency Blast. Deliberately does NOT run its own
// navigator.geolocation.watchPosition() - it reads the same live GPS fix that
// OngoingJourneyMap's existing watcher already maintains (via currentPosRef), so there
// is only ever one geolocation watcher active during a trip.
export const useBatteryEmergency = (trip, currentPosRef, user) => {
  const hasFiredLowBatteryAlertRef = useRef(false);

  useEffect(() => {
    if (!trip?._id) return undefined;

    if (!('getBattery' in navigator)) {
      console.warn(
        '[Battery Emergency] navigator.getBattery() is unsupported in this browser ' +
        '(e.g. Safari/iOS, or a Chromium build that removed it). The dead-battery ' +
        'emergency blast is disabled for this session - trip tracking is unaffected.'
      );
      return undefined;
    }

    hasFiredLowBatteryAlertRef.current = hasBatteryAlertFired(trip._id);

    let battery;
    let cancelled = false;

    const fireEmergencyBeacon = (level) => {
      // Cross-tab guard: re-check localStorage right before firing in case another
      // tab already claimed this alert since our last check.
      if (hasFiredLowBatteryAlertRef.current || hasBatteryAlertFired(trip._id)) {
        hasFiredLowBatteryAlertRef.current = true;
        return;
      }

      hasFiredLowBatteryAlertRef.current = true;
      markBatteryAlertFired(trip._id);

      const coords = currentPosRef.current;
      console.warn(
        `[Battery Emergency] CRITICAL battery detected: ${Math.round(level * 100)}% for trip ${trip._id}. ` +
        'Firing one-time final emergency beacon now.'
      );

      const payload = {
        tripId: trip._id,
        userId: user?._id,
        latitude: coords?.lat,
        longitude: coords?.lng,
        timestamp: new Date().toISOString(),
        batteryLevel: level,
        battery_critical: true,
      };

      const accepted = tripApi.sendBatteryEmergencyBeacon(trip._id, payload);
      console.log(
        accepted
          ? `[Battery Emergency] beacon sent (navigator.sendBeacon accepted) for trip ${trip._id}.`
          : `[Battery Emergency] navigator.sendBeacon REJECTED the request for trip ${trip._id} - payload may not have been delivered.`,
        payload
      );
    };

    const handleLevelChange = () => {
      if (!battery) return;
      const level = battery.level;

      if (level <= CRITICAL_BATTERY_THRESHOLD) {
        fireEmergencyBeacon(level);
      } else if (level > SAFE_RESET_THRESHOLD && hasFiredLowBatteryAlertRef.current) {
        console.log(
          `[Battery Emergency] Battery recharged to ${Math.round(level * 100)}% ` +
          `(above the ${SAFE_RESET_THRESHOLD * 100}% reset threshold) - re-arming alert for trip ${trip._id}.`
        );
        hasFiredLowBatteryAlertRef.current = false;
        clearBatteryAlertFlag(trip._id);
      }
    };

    navigator.getBattery()
      .then((b) => {
        if (cancelled) return;
        battery = b;
        handleLevelChange(); // covers a trip that starts with an already-critical battery
        battery.addEventListener('levelchange', handleLevelChange);
      })
      .catch((err) => {
        console.warn('[Battery Emergency] navigator.getBattery() rejected - feature disabled for this session.', err);
      });

    return () => {
      cancelled = true;
      if (battery) battery.removeEventListener('levelchange', handleLevelChange);
    };
  }, [trip?._id, user?._id, currentPosRef]);
};

export default useBatteryEmergency;
