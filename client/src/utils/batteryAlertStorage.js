// Cross-tab / cross-reload guard for the Dead-Battery Final Emergency Blast.
// localStorage is shared by every tab on this origin, so namespacing the flag by
// tripId gives us "resets when a new trip starts" for free (a new trip has a key
// that was never set) and lets every open tab agree on whether the one-time beacon
// has already fired for the current trip.
const keyFor = (tripId) => `pathprohori_battery_alert_fired_${tripId}`;

export const hasBatteryAlertFired = (tripId) => localStorage.getItem(keyFor(tripId)) === '1';

export const markBatteryAlertFired = (tripId) => localStorage.setItem(keyFor(tripId), '1');

export const clearBatteryAlertFlag = (tripId) => {
  if (!tripId) return;
  localStorage.removeItem(keyFor(tripId));
};
