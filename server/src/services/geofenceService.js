import { SafetyZone } from '../models/SafetyZone.js';
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
  const zones = await SafetyZone.find({
    enabled: true,
    verificationStatus: 'VERIFIED',
    activeFrom: { $lte: now },
    $or: [{ expiresAt: null }, { expiresAt: { $gt: now } }],
  });
  if (!zones.length) return;

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
  await trip.save();
};
