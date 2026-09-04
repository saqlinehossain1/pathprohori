import { Trip } from '../models/Trip.js';
import { LocationLog } from '../models/LocationLog.js';
import { User } from '../models/User.js';
import { Emergency } from '../models/Emergency.js';
import { escalateToEmergency } from './emergencyEscalationService.js';
import { dispatchMultiChannelEmergencyAlert } from './emergencyBroadcaster.js';
import { getReverseGeocodedAddress } from '../controllers/emergencyController.js';

// --- Configurable thresholds -------------------------------------------------------------
const MONITOR_INTERVAL_MS = 15 * 1000;
const DEVIATION_THRESHOLD_METERS = 150;
const DEVIATION_GRACE_PERIOD_MS = 30 * 1000;
const STOP_RADIUS_METERS = 20;
const STOP_THRESHOLD_MS = 5 * 60 * 1000;
const SAFETY_CHECK_WINDOW_MS = 2 * 60 * 1000;
// Shorter than the Signal Loss Heartbeat Tracker's SIGNAL_LOST cutoff, so a real
// GPS/connectivity gap is left to that feature instead of being misread here as a stop.
const STALE_GPS_THRESHOLD_MS = 90 * 1000;

const EARTH_RADIUS_METERS = 6371000;
const toRad = (deg) => (deg * Math.PI) / 180;

const haversineMeters = (a, b) => {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return EARTH_RADIUS_METERS * 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s));
};

// Projects a point to local planar meters relative to `origin` using an equirectangular
// approximation - accurate enough at city scale and far simpler than great-circle segment math.
const toLocalXY = (point, origin) => ({
  x: toRad(point.lng - origin.lng) * Math.cos(toRad(origin.lat)) * EARTH_RADIUS_METERS,
  y: toRad(point.lat - origin.lat) * EARTH_RADIUS_METERS,
});

// Shortest distance in meters from `position` to the polyline `route` ([{lat,lng}, ...]),
// checked segment-by-segment (not just to the nearest vertex) since OSRM route vertices can
// be sparse on long straight stretches.
const distanceToRouteMeters = (position, route) => {
  if (!Array.isArray(route) || route.length === 0) return null;
  if (route.length === 1) return haversineMeters(position, route[0]);

  let minDistance = Infinity;
  for (let i = 0; i < route.length - 1; i++) {
    const a = toLocalXY(route[i], position);
    const b = toLocalXY(route[i + 1], position);
    const abx = b.x - a.x;
    const aby = b.y - a.y;
    const lengthSq = abx * abx + aby * aby;
    // position is the projection origin, so it sits at local (0,0) here
    const t = lengthSq === 0 ? 0 : Math.max(0, Math.min(1, (-a.x * abx - a.y * aby) / lengthSq));
    const closestX = a.x + t * abx;
    const closestY = a.y + t * aby;
    const dist = Math.sqrt(closestX * closestX + closestY * closestY);
    if (dist < minDistance) minDistance = dist;
  }
  return minDistance;
};

// Fetches a driving route polyline from OSRM - the same public routing API the client
// already uses to draw the road-following route on the live map - and stores it as the
// trip's planned route at creation time. This feature has no separate route-planning system
// of its own; it just persists that same lookup, once, server-side.
export const fetchPlannedRoute = async (startCoords, destCoords) => {
  if (
    typeof startCoords?.lat !== 'number' || typeof startCoords?.lng !== 'number' ||
    typeof destCoords?.lat !== 'number' || typeof destCoords?.lng !== 'number'
  ) {
    return [];
  }
  try {
    const url = `https://router.project-osrm.org/route/v1/driving/${startCoords.lng},${startCoords.lat};${destCoords.lng},${destCoords.lat}?overview=full&geometries=geojson`;
    const res = await fetch(url);
    const data = await res.json();
    const coords = data?.routes?.[0]?.geometry?.coordinates;
    if (!Array.isArray(coords) || coords.length === 0) return [];
    return coords.map(([lng, lat]) => ({ lat, lng }));
  } catch (err) {
    console.warn('[Route Monitor] Failed to fetch planned route from OSRM:', err.message);
    return [];
  }
};

// Sends the commuter an in-app "are you okay?" check instead of alerting guardians right
// away - guardians only get pulled in if this times out unanswered (see below).
const triggerSafetyCheck = async (trip, { reason, position, io }) => {
  const now = new Date();
  trip.safetyCheck = {
    active: true,
    reason,
    triggeredAt: now,
    expiresAt: new Date(now.getTime() + SAFETY_CHECK_WINDOW_MS),
    location: position,
  };
  // Reset the triggering timers so that once this check resolves, monitoring restarts clean
  // and can catch a second, unrelated incident later in the same trip.
  trip.deviationTracking = { outOfBoundsSince: null };
  trip.stopTracking = { anchorLat: position.lat, anchorLng: position.lng, stationarySince: now };
  await trip.save();

  console.warn(
    `[Route Monitor] SAFETY CHECK SENT - trip ${trip._id}, reason: ${reason}. ` +
    `Commuter has ${SAFETY_CHECK_WINDOW_MS / 1000}s to confirm they're okay before guardians are alerted.`
  );

  const message = reason === 'ROUTE_DEVIATION'
    ? "We noticed you've moved off your planned route. Please confirm you're okay."
    : "We noticed you haven't moved in a while. Please confirm you're okay.";

  const payload = {
    tripId: trip._id,
    reason,
    message,
    triggeredAt: trip.safetyCheck.triggeredAt,
    expiresAt: trip.safetyCheck.expiresAt,
    location: position,
  };

  if (io) {
    io.to(`user_${trip.user}`).emit('SAFETY_CHECK_REQUIRED', payload);
    io.to(`user:${trip.user}`).emit('SAFETY_CHECK_REQUIRED', payload);
  }
};

// The commuter didn't respond in time - escalate through the same multi-channel pathway the
// panic button and dead-battery blast already use (Emergency record, Twilio SMS/voice,
// email, web push, Socket.io), tagged with the reason so guardians/operators see why.
const escalateSafetyCheckTimeout = async (trip, io) => {
  const { reason, triggeredAt } = trip.safetyCheck;
  // Copy out plain lat/lng values (not a reference to the Mongoose subdocument) - reassigning
  // trip.safetyCheck below invalidates that subdocument's live getters, which would otherwise
  // silently turn position.lat/.lng into undefined by the time they're used further down.
  const position = trip.safetyCheck.location
    ? { lat: trip.safetyCheck.location.lat, lng: trip.safetyCheck.location.lng }
    : null;

  console.warn(
    `[Route Monitor] SAFETY CHECK TIMED OUT - trip ${trip._id}, reason: ${reason}. ` +
    'Commuter did not respond in time - escalating to guardians & safety operator dashboard.'
  );

  trip.safetyCheckHistory = trip.safetyCheckHistory || [];
  trip.safetyCheckHistory.push({ reason, triggeredAt, resolvedAt: new Date(), outcome: 'ESCALATED' });
  trip.safetyCheck = { active: false };
  trip.emergencySource = reason;

  await escalateToEmergency(trip, { source: reason, io, coords: position });

  const populatedUser = await User.findById(trip.user)
    .select('name email phone avatarUrl guardians')
    .populate('guardians.user', 'name email phone pushSubscription');
  const commuterName = populatedUser?.name || 'Commuter';

  const guardianRecipients = (populatedUser?.guardians || [])
    .map((g) => ({
      _id: g.user?._id || g._id,
      name: g.user?.name || g.name || 'Guardian',
      phone: g.user?.phone || g.phone,
      email: g.user?.email || g.email,
      pushSubscription: g.user?.pushSubscription,
    }))
    .filter((r) => r.phone || r.email);

  const operatorAndAdminUsers = await User.find({
    role: { $in: ['operator', 'admin'] },
    _id: { $ne: trip.user },
  }).select('name email phone pushSubscription');

  const recipients = [...guardianRecipients, ...operatorAndAdminUsers];

  const address = position ? await getReverseGeocodedAddress(position.lat, position.lng).catch(() => '') : '';
  const location = {
    latitude: position?.lat,
    longitude: position?.lng,
    address: address || `${trip.vehicleType || 'Vehicle'} -> ${trip.destination || 'destination'}`,
  };

  const emergencyRecord = await Emergency.create({
    user: trip.user,
    trip: trip._id,
    trackingToken: trip.trackingToken,
    location,
    status: 'ACTIVE',
    alertType: reason,
    severity: 'HIGH',
    triggeredAt: new Date(),
  });

  await dispatchMultiChannelEmergencyAlert({
    user: populatedUser || {},
    emergency: emergencyRecord,
    recipients,
    location,
  }).catch((err) => console.error('[Route Monitor] Multi-channel dispatch error:', err.message));

  if (io) {
    io.emit('EMERGENCY_ALERT_BROADCAST', {
      emergencyId: emergencyRecord._id,
      tripId: trip._id,
      trackingToken: trip.trackingToken,
      trackingUrl: `${process.env.CLIENT_URL || 'http://localhost:5173'}/track/${trip.trackingToken}`,
      commuterId: trip.user,
      commuterName,
      commuterPhone: populatedUser?.phone,
      avatarUrl: populatedUser?.avatarUrl,
      vehicleType: trip.vehicleType,
      numberPlate: trip.numberPlate,
      vehicleColor: trip.vehicleColor,
      destination: trip.destination,
      startCoords: trip.startCoords,
      destinationCoords: trip.destinationCoords,
      reason,
      alertType: reason,
      location,
      status: trip.status,
      timestamp: new Date(),
    });
  }

  console.warn(
    `[Route Monitor] GUARDIAN ALERT ESCALATED - trip ${trip._id}, reason: ${reason}. ` +
    `Emergency record ${emergencyRecord._id} created; SMS/voice/email/push/socket dispatch complete.`
  );
};

const evaluateTrip = async (trip, io, now) => {
  if (trip.safetyCheck?.active) {
    if (now >= new Date(trip.safetyCheck.expiresAt)) {
      await escalateSafetyCheckTimeout(trip, io);
    }
    return; // a pending check suspends deviation/stop evaluation until it resolves
  }

  const latestLog = await LocationLog.findOne({ trip: trip._id }).sort({ createdAt: -1 });
  const coords = latestLog?.location?.coordinates;
  if (!Array.isArray(coords) || coords.length < 2) return;

  const ageMs = now - latestLog.createdAt;
  if (ageMs > STALE_GPS_THRESHOLD_MS) {
    // No fresh position - either the trip just started or there's a GPS/connectivity gap.
    // The Signal Loss Heartbeat Tracker owns that case; skip this tick rather than guess.
    return;
  }

  const position = { lat: coords[1], lng: coords[0] };
  if (process.env.QA_TRACE) {
    const d = Array.isArray(trip.plannedRoute) && trip.plannedRoute.length > 1 ? distanceToRouteMeters(position, trip.plannedRoute) : null;
    console.log(`[QA_TRACE] tick trip=${trip._id} pos=${position.lat.toFixed(5)},${position.lng.toFixed(5)} distToRoute=${d === null ? 'n/a' : Math.round(d) + 'm'} ageMs=${ageMs}`);
  }

  // --- Route deviation ---
  if (Array.isArray(trip.plannedRoute) && trip.plannedRoute.length > 1) {
    const distance = distanceToRouteMeters(position, trip.plannedRoute);
    if (distance !== null && distance > DEVIATION_THRESHOLD_METERS) {
      if (!trip.deviationTracking?.outOfBoundsSince) {
        trip.deviationTracking = { outOfBoundsSince: now };
        await trip.save();
        console.log(
          `[Route Monitor] DEVIATION DETECTED - trip ${trip._id} is ${Math.round(distance)}m off its planned route. ` +
          `Starting ${DEVIATION_GRACE_PERIOD_MS / 1000}s grace period before flagging.`
        );
      } else {
        const elapsed = now - new Date(trip.deviationTracking.outOfBoundsSince);
        if (elapsed >= DEVIATION_GRACE_PERIOD_MS) {
          console.warn(
            `[Route Monitor] ROUTE DEVIATION CONFIRMED - trip ${trip._id}, ${Math.round(distance)}m off-route for ${Math.round(elapsed / 1000)}s.`
          );
          await triggerSafetyCheck(trip, { reason: 'ROUTE_DEVIATION', position, io });
          return;
        }
      }
    } else if (trip.deviationTracking?.outOfBoundsSince) {
      console.log(`[Route Monitor] Trip ${trip._id} is back within ${DEVIATION_THRESHOLD_METERS}m of its route - deviation timer cleared.`);
      trip.deviationTracking = { outOfBoundsSince: null };
      await trip.save();
    }
  }

  // --- Unexpected stop ---
  const hasAnchor = typeof trip.stopTracking?.anchorLat === 'number' && typeof trip.stopTracking?.anchorLng === 'number';
  const anchor = hasAnchor ? { lat: trip.stopTracking.anchorLat, lng: trip.stopTracking.anchorLng } : null;
  const distanceFromAnchor = anchor ? haversineMeters(position, anchor) : null;

  if (!anchor || distanceFromAnchor > STOP_RADIUS_METERS) {
    trip.stopTracking = { anchorLat: position.lat, anchorLng: position.lng, stationarySince: now };
    await trip.save();
    return;
  }

  const stationaryMs = now - new Date(trip.stopTracking.stationarySince);
  if (stationaryMs >= STOP_THRESHOLD_MS) {
    console.warn(
      `[Route Monitor] UNEXPECTED STOP CONFIRMED - trip ${trip._id}, stationary within ${STOP_RADIUS_METERS}m for ${Math.round(stationaryMs / 1000)}s.`
    );
    await triggerSafetyCheck(trip, { reason: 'UNEXPECTED_STOP', position, io });
  }
};

// Route Deviation & Unexpected Stop Detection - periodic monitor mirroring the Signal Loss
// Heartbeat Tracker's pattern: polls every active trip on an interval instead of hooking into
// the heartbeat request path, so timing (the 30s deviation grace period, the 5-minute stop
// threshold, the 2-minute safety-check countdown) stays accurate even if heartbeats slow down.
//
// Known limitation (by design, out of scope for this iteration): there is no way for a
// commuter to mark a stop as an intentional pickup/errand in advance, so a genuinely planned
// stop over 5 minutes will still trigger a safety check - they just confirm "I'm Safe" and
// monitoring resumes normally.
export const startRouteDeviationMonitor = (io) => {
  setInterval(async () => {
    const now = new Date();
    try {
      const activeTrips = await Trip.find({ status: 'ACTIVE' });
      for (const trip of activeTrips) {
        try {
          await evaluateTrip(trip, io, now);
        } catch (err) {
          console.error(`[Route Monitor] Evaluation error for trip ${trip._id}:`, err.message);
        }
      }
    } catch (err) {
      console.error('[Route Monitor] Tick error:', err.message);
    }
  }, MONITOR_INTERVAL_MS);
};
