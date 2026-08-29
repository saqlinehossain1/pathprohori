import { SafetyZone } from '../models/SafetyZone.js';
import { Incident } from '../models/Incident.js';
import { Trip } from '../models/Trip.js';
import { User } from '../models/User.js';
import Notification from '../models/Notification.js';

const toRadians = (value) => (value * Math.PI) / 180;
const distanceMeters = (first, second) => {
  const earthRadius = 6371000;
  const dLat = toRadians(second.lat - first.lat);
  const dLng = toRadians(second.lng - first.lng);
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(toRadians(first.lat)) * Math.cos(toRadians(second.lat)) * Math.sin(dLng / 2) ** 2;
  return earthRadius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

export const evaluateTripZones = async (trip, coords, io) => {
  if (!coords || !Number.isFinite(coords.lat) || !Number.isFinite(coords.lng)) return;
  const now = new Date();

  const user = await User.findById(trip.user).select('name guardians').populate('guardians.user', 'name email phone');
  const guardianRecipients = (user?.guardians || []).map((guardian) => guardian.user?._id).filter(Boolean);
  const operatorRecipients = await User.find({
    role: { $in: ['operator', 'admin'] },
    _id: { $ne: trip.user },
  }).select('_id');
  const recipients = [...new Map(
    [...guardianRecipients, ...operatorRecipients.map((operator) => operator._id)]
      .map((recipientId) => [String(recipientId), recipientId])
  ).values()];

  // 1. SafetyZone Geofencing Evaluation
  const zones = await SafetyZone.find({
    enabled: true,
    verificationStatus: 'VERIFIED',
    activeFrom: { $lte: now },
    $or: [{ expiresAt: null }, { expiresAt: { $gt: now } }],
  });

  if (zones.length) {
    const zoneStates = trip.zoneStates || [];

    for (const zone of zones) {
      const [longitude, latitude] = zone.center.coordinates;
      const inside = distanceMeters(coords, { lat: latitude, lng: longitude }) <= zone.radiusMeters;
      const state = zoneStates.find((item) => String(item.zone) === String(zone._id));
      const wasInside = Boolean(state?.inside);
      if (state) state.inside = inside;
      else zoneStates.push({ zone: zone._id, inside });

      const entered = inside && !wasInside;
      const exited = !inside && wasInside;
      const cooldownElapsed = !state?.lastAlertAt || now.getTime() - new Date(state.lastAlertAt).getTime() > 15 * 60 * 1000;
      if ((!entered && !exited) || !cooldownElapsed) continue;

      if (entered) {
        trip.safetyStatus = 'UNSAFE';
        trip.safetyStatusChangedAt = now;
        trip.safetyStatusChangedBy = trip.user;
        trip.safetyStatusLocation = coords;
      }
      const alertType = entered ? 'ZONE_ENTRY' : 'ZONE_EXIT';
      const payload = {
        notificationId: `zone-${trip._id}-${zone._id}-${alertType}-${now.getTime()}`,
        type: 'WARNING',
        notificationType: alertType,
        title: entered ? `Safety zone entered: ${zone.name}` : `Safety zone exited: ${zone.name}`,
        commuterName: user?.name || 'Traveler',
        senderName: user?.name || 'Traveler',
        senderId: trip.user,
        tripId: trip._id,
        destination: trip.destination,
        location: { latitude: coords.lat, longitude: coords.lng },
        zone: { id: zone._id, name: zone.name, severity: zone.severity, zoneType: zone.zoneType },
        safetyStatus: trip.safetyStatus,
        audience: 'GUARDIANS_AND_OPERATORS',
        timestamp: now,
      };
      await Promise.all(recipients.map((recipientId) => Notification.create({
        recipientId,
        senderId: trip.user,
        tripId: trip._id,
        type: 'WARNING',
        notificationType: alertType,
        title: payload.title,
        commuterName: payload.commuterName,
        senderName: payload.senderName,
        destination: trip.destination,
        location: payload.location,
      })));
      if (state) state.lastAlertAt = now;
      if (io) recipients.forEach((recipientId) => io.to(`user_${recipientId}`).emit('SAFETY_WARNING', payload));
    }
    trip.zoneStates = zoneStates;
  }

  // 2. 100-meter Community-Verified High Alert Hazard Proximity Detection
  try {
    const verifiedHazards = await Incident.find({
      $or: [
        { isVerified: true },
        { 'upvotes.9': { $exists: true } },
      ],
      severity: { $in: ['High Alert', 'High Severity', 'Critical', 'Emergency'] },
      $or: [{ expiresAt: null }, { expiresAt: { $gt: now } }],
    });

    const hazardStates = trip.hazardStates || [];

    for (const hazard of verifiedHazards) {
      if (!hazard.location?.coordinates || hazard.location.coordinates.length < 2) continue;
      const [longitude, latitude] = hazard.location.coordinates;
      const distance = distanceMeters(coords, { lat: latitude, lng: longitude });
      const isInside100m = distance <= 100; // 100 meters threshold as requested

      const state = hazardStates.find((item) => String(item.hazard) === String(hazard._id));
      const wasInside = Boolean(state?.inside);
      if (state) state.inside = isInside100m;
      else hazardStates.push({ hazard: hazard._id, inside: isInside100m });

      // If commuter manually toggled to SAFE in the last 60 seconds, respect manual override
      const userDoc = await User.findById(trip.user).select('safetyStatus safetyStatusChangedAt name guardians');
      const recentManualSafe = userDoc?.safetyStatus === 'SAFE' &&
        userDoc?.safetyStatusChangedAt &&
        (now.getTime() - new Date(userDoc.safetyStatusChangedAt).getTime() < 60 * 1000);

      // Trigger if inside 100m and either entered or current status is not UNSAFE (unless recently manually overridden)
      const shouldTriggerUnsafe = isInside100m && !recentManualSafe && (trip.safetyStatus !== 'UNSAFE' || userDoc?.safetyStatus !== 'UNSAFE');

      if (shouldTriggerUnsafe) {
        trip.safetyStatus = 'UNSAFE';
        trip.safetyStatusChangedAt = now;
        trip.safetyStatusChangedBy = trip.user;
        trip.safetyStatusLocation = coords;

        // Also update commuter user profile safety status
        await User.findByIdAndUpdate(trip.user, {
          safetyStatus: 'UNSAFE',
          safetyStatusChangedAt: now,
          safetyStatusLocation: {
            latitude: coords.lat,
            longitude: coords.lng,
            address: `Within ${Math.round(distance)}m of verified hazard: ${hazard.title}`,
          },
        });

        const title = `⚠️ Proximity Warning: Near Hazard (${hazard.title})`;
        const message = `${user?.name || 'Commuter'} is within ${Math.round(distance)}m of verified high alert hazard "${hazard.title}" at ${hazard.locationName}. Status automatically set to UNSAFE.`;

        await Promise.all(
          recipients.map((recipientId) =>
            Notification.create({
              recipientId,
              senderId: trip.user,
              tripId: trip._id,
              type: 'WARNING',
              notificationType: 'HAZARD_PROXIMITY',
              title,
              message,
              commuterName: user?.name || 'Commuter',
              senderName: user?.name || 'Commuter',
              destination: trip.destination,
              location: {
                latitude: coords.lat,
                longitude: coords.lng,
                address: hazard.locationName || 'Hazard Proximity Area',
              },
            })
          )
        );

        if (state) state.lastAlertAt = now;

        if (io) {
          const alertPayload = {
            type: 'WARNING',
            notificationType: 'HAZARD_PROXIMITY',
            title,
            message,
            commuterName: user?.name || 'Commuter',
            senderId: trip.user,
            userId: trip.user,
            tripId: trip._id,
            location: { latitude: coords.lat, longitude: coords.lng, address: hazard.locationName },
            hazard: { id: hazard._id, title: hazard.title, severity: hazard.severity, distance: Math.round(distance) },
            safetyStatus: 'UNSAFE',
            timestamp: now,
          };

          recipients.forEach((recipientId) => {
            io.to(`user_${recipientId}`).emit('SAFETY_WARNING', alertPayload);
            io.to(`user:${recipientId}`).emit('SAFETY_WARNING', alertPayload);
          });

          // Real-time alert directly to commuter in both room variants + global event
          io.to(`user_${trip.user}`).emit('HAZARD_PROXIMITY_DETECTED', alertPayload);
          io.to(`user:${trip.user}`).emit('HAZARD_PROXIMITY_DETECTED', alertPayload);
          io.emit('HAZARD_PROXIMITY_DETECTED', alertPayload);
          io.emit('USER_SAFETY_STATUS_CHANGED', {
            userId: trip.user,
            safetyStatus: 'UNSAFE',
            tripId: trip._id,
            message: alertPayload.message,
          });

          // Also update the public tracking room
          io.to(`track_${trip._id}`).emit('TRACKING_LOCATION_UPDATE', {
            coords,
            safetyStatus: 'UNSAFE',
            trackingMode: 'UNSAFE',
            updatedAt: now,
          });
        }
      }
    }
    trip.hazardStates = hazardStates;
  } catch (hazardErr) {
    console.error('[geofenceService] Hazard proximity evaluation error:', hazardErr.message);
  }

  await trip.save();
};
