import { LocationLog } from '../models/LocationLog.js';

// Cancels a pending Route Deviation / Unexpected Stop safety check on a trip, logging the
// resolution to safetyCheckHistory. Callers are responsible for calling trip.save() - this
// only mutates the in-memory Mongoose document so it can be folded into whichever save()
// the caller already does right after.
export const cancelPendingSafetyCheck = (trip, outcome, reasonForCancel) => {
  if (!trip.safetyCheck?.active) return;
  console.log(`[Safety Check] Cancelling pending check for trip ${trip._id} (${reasonForCancel}).`);
  trip.safetyCheckHistory = trip.safetyCheckHistory || [];
  trip.safetyCheckHistory.push({
    reason: trip.safetyCheck.reason,
    triggeredAt: trip.safetyCheck.triggeredAt,
    resolvedAt: new Date(),
    outcome,
  });
  trip.safetyCheck = { active: false };
};

// Shared guardian-escalation pathway for anything that raises a trip to EMERGENCY priority -
// the 1-tap panic button, silent duress, the dead-battery final blast, and the automatic
// Route Deviation / Unexpected Stop safety-check timeout all funnel through here.
export const escalateToEmergency = async (trip, { source, io, batteryLevel, coords, isDuress } = {}) => {
  // A bigger emergency supersedes any pending safety check for this trip.
  cancelPendingSafetyCheck(trip, 'ESCALATED', `superseded by ${source || 'an emergency'} escalation`);

  trip.status = isDuress ? 'DURESS' : 'EMERGENCY';
  if (batteryLevel !== undefined) trip.batteryLevel = batteryLevel;
  await trip.save();

  if (coords && typeof coords.lat === 'number' && typeof coords.lng === 'number') {
    await LocationLog.create({
      trip: trip._id,
      user: trip.user,
      location: {
        type: 'Point',
        coordinates: [coords.lng, coords.lat],
      },
      latitude: coords.lat,
      longitude: coords.lng,
      batteryLevel: batteryLevel ?? trip.batteryLevel,
      networkStrength: coords.networkStrength ?? trip.networkStrength ?? 100,
      trackingMode: 'EMERGENCY',
      timestamp: new Date(),
    });
  }

  if (io) {
    io.emit('TRIP_STATUS_UPDATED', {
      tripId: trip._id,
      status: trip.status,
      source: source || 'MANUAL_PANIC',
      isDuress: Boolean(isDuress),
      batteryLevel: trip.batteryLevel,
    });
  }
};
