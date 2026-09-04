import { Trip } from '../models/Trip.js';
import { LocationLog } from '../models/LocationLog.js';
import { User } from '../models/User.js';
<<<<<<< Updated upstream

// Shared guardian-escalation pathway for anything that raises a trip to EMERGENCY
// priority - the 1-tap panic button and the dead-battery final blast both funnel
// through here so there is exactly one place that flips trip status, logs the
// location, and broadcasts the Socket.io alert to guardians/operators.
const escalateToEmergency = async (trip, { source, io, batteryLevel, coords } = {}) => {
  trip.status = 'EMERGENCY';
  trip.emergencySource = source;

  if (source === 'BATTERY_CRITICAL') {
    trip.batteryCriticalTriggeredAt = new Date();
    if (typeof batteryLevel === 'number') trip.batteryLevelAtTrigger = batteryLevel;
    if (coords) trip.batteryCriticalLastLocation = coords;
  }

  await trip.save();

  if (coords && typeof coords.lat === 'number' && typeof coords.lng === 'number') {
    await LocationLog.create({
      trip: trip._id,
      user: trip.user,
      location: { type: 'Point', coordinates: [coords.lng, coords.lat] },
      batteryLevel: typeof batteryLevel === 'number' ? Math.round(batteryLevel * 100) : undefined,
    });
  }

  if (io) {
    const populatedUser = await User.findById(trip.user)
      .select('name email phone guardians')
      .populate('guardians.user', 'name email phone avatarUrl');

    const guardians = Array.isArray(populatedUser?.guardians)
      ? populatedUser.guardians.map((g) => ({
          name: g.user?.name || g.name,
          phone: g.user?.phone || g.phone,
          email: g.user?.email || g.email,
          relationship: g.relationship || 'Guardian',
        }))
      : [];

    io.emit('EMERGENCY_ALERT', {
      tripId: trip._id,
      userId: trip.user,
      userName: populatedUser?.name,
      userPhone: populatedUser?.phone,
      guardians,
      source,
      priority: 'CRITICAL',
      lastLocation: coords,
      batteryLevel,
      alertTime: new Date(),
    });

    console.log(
      `[Emergency Escalation] Trip ${trip._id} escalated via ${source}. ` +
      'Socket.io EMERGENCY_ALERT broadcast to guardians/operators.'
    );
  }
};
=======
import { Emergency } from '../models/Emergency.js';
import cloudinary from '../config/cloudinary.js';
import { getIO } from '../socket.js';
import { sendPushNotification } from '../services/pushService.js';
import {
  sendEmergencySMS,
  buildEmergencySMSBody,
  makeEmergencyCall,
} from '../services/twilioService.js';
import { sendEmergencyEmail } from '../services/emailService.js';
import { getReverseGeocodedAddress } from './emergencyController.js';
import Notification from '../models/Notification.js';
import { evaluateTripZones } from '../services/geofenceService.js';
import { escalateToEmergency, cancelPendingSafetyCheck } from '../services/emergencyEscalationService.js';
import { fetchPlannedRoute } from '../services/routeMonitorService.js';
>>>>>>> Stashed changes

// @desc    Log a new journey (Commuter)
// @route   POST /api/trips
export const createTrip = async (req, res, next) => {
  try {
    const {
      vehicleType,
      numberPlate,
      vehicleColor,
      estimatedTimeMinutes,
      startingLocation,
      destination,
      startCoords,
      destinationCoords,
      driverDescription,
      journeyNotes,
      photoUrl,
    } = req.body;

    const trip = await Trip.create({
      user: req.user._id,
      vehicleType,
      numberPlate,
      vehicleColor,
      estimatedTimeMinutes: estimatedTimeMinutes || 30,
      startingLocation: startingLocation || 'Current GPS Location',
      destination,
      startCoords: startCoords && startCoords.lat && startCoords.lng ? startCoords : undefined,
      destinationCoords: destinationCoords && destinationCoords.lat && destinationCoords.lng ? destinationCoords : undefined,
      driverDescription,
      journeyNotes,
      photoUrl,
      status: 'ACTIVE',
      lastHeartbeatAt: new Date(),
    });

<<<<<<< Updated upstream
=======
    if (startCoords?.lat && startCoords?.lng) {
      try {
        await evaluateTripZones(trip, { lat: startCoords.lat, lng: startCoords.lng }, req.app.get('io'));
      } catch (zoneErr) {
        console.warn('[createTrip] Initial zone/hazard evaluation failed:', zoneErr.message);
      }
    }

    // Route Deviation & Unexpected Stop Detection: best-effort planned-route snapshot.
    // A failed/empty OSRM lookup just leaves plannedRoute empty - deviation checks skip
    // trips with no planned route rather than blocking trip creation on it.
    if (startCoords?.lat && startCoords?.lng && destinationCoords?.lat && destinationCoords?.lng) {
      try {
        trip.plannedRoute = await fetchPlannedRoute(startCoords, destinationCoords);
        await trip.save();
      } catch (routeErr) {
        console.warn('[createTrip] Planned route snapshot failed:', routeErr.message);
      }
    }

>>>>>>> Stashed changes
    res.status(201).json(trip);
  } catch (error) {
    next(error);
  }
};

// @desc    Get user's current active trip
// @route   GET /api/trips/active
export const getActiveTrip = async (req, res, next) => {
  try {
    const activeTrip = await Trip.findOne({
      user: req.user._id,
      status: { $in: ['ACTIVE', 'SIGNAL_LOST', 'EMERGENCY'] },
    }).sort({ createdAt: -1 });

    res.json(activeTrip);
  } catch (error) {
    next(error);
  }
};

// @desc    Update heartbeat ping for active trip
// @route   POST /api/trips/:id/heartbeat
export const sendHeartbeat = async (req, res, next) => {
  try {
    const trip = await Trip.findById(req.params.id);
    if (!trip) {
      return res.status(404).json({ message: 'Trip not found' });
    }

    trip.lastHeartbeatAt = new Date();
    if (trip.status === 'SIGNAL_LOST') {
      trip.status = 'ACTIVE'; // Restored connection
    }
    await trip.save();

    // Log location if passed
    if (req.body.latitude && req.body.longitude) {
      await LocationLog.create({
        trip: trip._id,
        user: req.user._id,
        location: {
          type: 'Point',
          coordinates: [req.body.longitude, req.body.latitude],
        },
        batteryLevel: req.body.batteryLevel || 100,
        expiresAt: trip.expiresAt || undefined,
      });
    }

    res.json({ success: true, lastHeartbeatAt: trip.lastHeartbeatAt, status: trip.status });
  } catch (error) {
    next(error);
  }
};

// @desc    Mark trip as completed safely
// @route   PUT /api/trips/:id/complete
export const completeTrip = async (req, res, next) => {
  try {
    const trip = await Trip.findById(req.params.id);
    if (!trip) {
      return res.status(404).json({ message: 'Trip not found' });
    }

    const now = new Date();
    // Calculate 48 Hours TTL expiration timestamp from now
    const expiresAt = new Date(now.getTime() + 48 * 60 * 60 * 1000);

    trip.status = 'COMPLETED';
    trip.completedAt = now;
    trip.expiresAt = expiresAt;
    await trip.save();

    // Mark location logs as completed safe trip and apply 48-hour expiration TTL
    await LocationLog.updateMany(
      { trip: trip._id },
      { isSafeTripCompleted: true, expiresAt: expiresAt }
    );

    res.json({ message: 'Trip completed safely', trip });
  } catch (error) {
    next(error);
  }
};

// @desc    One-Tap Instant Panic Button
// @route   POST /api/trips/:id/trigger-panic
export const triggerPanic = async (req, res, next) => {
  try {
    const trip = await Trip.findById(req.params.id);
    if (!trip) {
      return res.status(404).json({ message: 'Trip not found' });
    }

    await escalateToEmergency(trip, { source: 'PANIC', io: req.app.get('io') });

    res.json({ message: 'CRITICAL EMERGENCY ALARM TRIGGERED', trip });
  } catch (error) {
    next(error);
  }
};

// @desc    Dead-Battery Final Emergency Blast - fired once by the client via
//          navigator.sendBeacon() the moment battery.level drops to <= 5%. Reuses the
//          same EMERGENCY escalation pathway as the panic button (see escalateToEmergency).
// @route   POST /api/trips/:id/battery-emergency
export const handleBatteryCriticalEmergency = async (req, res, next) => {
  try {
    const { latitude, longitude, batteryLevel } = req.body;

    const trip = await Trip.findById(req.params.id);
    if (!trip) {
      return res.status(404).json({ message: 'Trip not found' });
    }

    if (String(trip.user) !== String(req.user._id)) {
      return res.status(403).json({ message: 'Not authorized to modify this journey' });
    }

    const coords =
      typeof latitude === 'number' && typeof longitude === 'number'
        ? { lat: latitude, lng: longitude }
        : undefined;

    await escalateToEmergency(trip, {
      source: 'BATTERY_CRITICAL',
      io: req.app.get('io'),
      batteryLevel,
      coords,
    });

    console.log(
      `[Battery Emergency] Trip ${trip._id}: critical battery ` +
      `(${typeof batteryLevel === 'number' ? Math.round(batteryLevel * 100) : '?'}%) beacon received ` +
      `at ${coords ? `${coords.lat}, ${coords.lng}` : 'unknown location'}.`
    );

    res.status(201).json({ success: true, status: 'EMERGENCY' });
  } catch (error) {
    next(error);
  }
};

<<<<<<< Updated upstream
// @desc    Deactivate an active emergency alarm using the normal or secret duress PIN
=======
// @desc    Complete a trip safely (Commuter arrived)
// @route   PUT /api/trips/:id/complete
export const completeTrip = async (req, res, next) => {
  try {
    const trip = await Trip.findById(req.params.id);
    if (!trip) {
      return res.status(404).json({ message: 'Trip not found' });
    }

    const now = new Date();
    const expiresAt = new Date(now.getTime() + 48 * 60 * 60 * 1000);

    // Don't let a pending Route Deviation / Unexpected Stop safety check outlive the trip.
    cancelPendingSafetyCheck(trip, 'TRIP_COMPLETED', 'trip completed');

    trip.status = 'COMPLETED';
    trip.safetyStatus = 'SAFE';
    trip.safetyStatusChangedAt = now;
    trip.safetyStatusChangedBy = req.user?._id;
    trip.completedAt = now;
    trip.expiresAt = expiresAt;
    trip.trackingActive = false;
    await trip.save();

    await LocationLog.updateMany(
      { trip: trip._id },
      { isSafeTripCompleted: true }
    );

    // 1. Mark all active emergencies for this trip as RESOLVED
    const activeEmergencies = await Emergency.find({ trip: trip._id, status: 'ACTIVE' });
    await Emergency.updateMany(
      { trip: trip._id, status: 'ACTIVE' },
      { status: 'RESOLVED', resolvedAt: now }
    );

    // 2. Mark all related notifications as RESOLVED
    await Notification.updateMany(
      {
        $or: [{ tripId: trip._id }, { senderId: trip.user }],
        resolvedAt: { $exists: false },
      },
      { $set: { resolvedAt: now, isRead: true } }
    );

    const io = req.app.get('io');
    if (io) {
      if (activeEmergencies.length > 0) {
        io.emit('EMERGENCY_RESOLVED', {
          emergencyIds: activeEmergencies.map((e) => e._id),
          tripId: trip._id,
          userId: trip.user,
          resolvedAt: now.toISOString(),
          message: 'Journey completed safely. Emergency alert resolved.',
        });
      }
      io.emit('TRIP_STATUS_UPDATED', {
        tripId: trip._id,
        status: 'COMPLETED',
        completedAt: trip.completedAt,
      });
    }

    res.json({ message: 'Trip completed safely', trip });
  } catch (error) {
    next(error);
  }
};

// @desc    One-Tap Instant Panic Button & Multi-Channel Emergency Dispatch
// @route   POST /api/trips/:id/trigger-panic
export const triggerPanic = async (req, res, next) => {
  try {
    const isDuress = req.body && req.body.isDuress;
    const trip = await Trip.findById(req.params.id);
    if (!trip) {
      return res.status(404).json({ message: 'Trip not found' });
    }

    await escalateToEmergency(trip, { source: 'PANIC', io: req.app.get('io'), isDuress });

    // Ensure trip has an active 4-hour tracking token
    if (!trip.trackingToken) {
      trip.trackingToken = crypto.randomBytes(20).toString('hex');
    }
    trip.trackingExpiresAt = new Date(Date.now() + 4 * 60 * 60 * 1000);
    trip.trackingActive = true;
    await trip.save();

    // Fetch user and linked guardians
    const user = trip.user ? await User.findById(trip.user).populate('guardians.user') : null;
    const commuterName = user?.name || 'Commuter';
    const vehicleInfo = `${trip.vehicleType || 'Vehicle'} (${trip.numberPlate || 'No Plate'})`;
    const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
    const trackingUrl = `${clientUrl}/track/${trip.trackingToken}`;

    const panicLat =
      req.body?.latitude && typeof req.body.latitude === 'number'
        ? req.body.latitude
        : req.body?.lat && typeof req.body.lat === 'number'
        ? req.body.lat
        : trip.startCoords && typeof trip.startCoords.lat === 'number'
        ? trip.startCoords.lat
        : 23.7808875;

    const panicLng =
      req.body?.longitude && typeof req.body.longitude === 'number'
        ? req.body.longitude
        : req.body?.lng && typeof req.body.lng === 'number'
        ? req.body.lng
        : trip.startCoords && typeof trip.startCoords.lng === 'number'
        ? trip.startCoords.lng
        : 90.4068305;

    const panicAddress = await getReverseGeocodedAddress(panicLat, panicLng);

    const emergencyTitle = isDuress
      ? `🚨 SILENT DURESS ALARM: ${commuterName}`
      : `🚨 CRITICAL EMERGENCY ALARM: ${commuterName}`;

    // 1. Create and confirm Emergency Record in Database
    const emergencyRecord = await Emergency.create({
      user: user?._id || trip.user,
      trip: trip._id,
      trackingToken: trip.trackingToken,
      location: {
        latitude: panicLat,
        longitude: panicLng,
        address: panicAddress || `${panicLat.toFixed(4)}° N, ${panicLng.toFixed(4)}° E`,
      },
      status: 'ACTIVE',
      alertType: isDuress ? 'SILENT_DURESS' : 'PANIC',
      severity: isDuress ? 'CRITICAL' : 'HIGH',
      triggeredAt: new Date(),
    });

    // 2. Multi-Channel Channel A & B: Twilio SMS & Automated Voice Call (IVR)
    if (user && Array.isArray(user.guardians)) {
      const validGuardianPhones = user.guardians
        .map((guardian) => guardian.phone || (guardian.user && guardian.user.phone))
        .filter((phone) => typeof phone === 'string' && phone.replace(/\D/g, '').length >= 8);

      const uniquePhones = [...new Set(validGuardianPhones)];

      for (const phone of uniquePhones) {
        // Channel A: Emergency SMS
        sendEmergencySMS({
          toPhoneNumber: phone,
          userName: commuterName,
          alertType: isDuress ? 'SILENT_DURESS' : 'PANIC',
          activationTime: emergencyRecord.triggeredAt || new Date(),
          location: {
            latitude: panicLat,
            longitude: panicLng,
            address: panicAddress,
          },
          customMessage: `${vehicleInfo} -> ${trip.destination || 'Unspecified'} | Live: ${trackingUrl}`,
        }).catch((e) => console.error('Twilio SMS error:', e));

        // Channel B: Emergency Voice Call (IVR)
        makeEmergencyCall({
          guardianPhone: phone,
          userName: commuterName,
          location: {
            latitude: panicLat,
            longitude: panicLng,
            address: panicAddress,
          },
          emergencyMessage: isDuress
            ? `Silent duress alarm activated by ${commuterName} in ${vehicleInfo}.`
            : `Critical panic alarm activated by ${commuterName} in ${vehicleInfo}.`,
        }).catch((e) => console.error('Twilio Voice Call error:', e));
      }
    }

    // 3. Channel C: Automated Emergency Email to Linked Guardians, Operators & Admins
    const guardianEmails =
      user && Array.isArray(user.guardians)
        ? user.guardians
            .map((g) => g.email || (g.user && g.user.email))
            .filter((e) => typeof e === 'string' && e.trim().length > 3)
        : [];

    const operatorAndAdminUsers = await User.find({
      role: { $in: ['operator', 'admin'] },
      _id: { $ne: user?._id },
    }).select('email name role');

    const staffEmails = operatorAndAdminUsers
      .map((u) => u.email)
      .filter((e) => typeof e === 'string' && e.trim().length > 3);

    const allRecipientEmails = [...new Set([...guardianEmails, ...staffEmails])];

    if (allRecipientEmails.length > 0) {
      sendEmergencyEmail({
        toEmail: allRecipientEmails,
        commuter: user,
        location: {
          latitude: panicLat,
          longitude: panicLng,
          address: panicAddress,
        },
        trip,
        emergencyId: emergencyRecord._id,
        trackingUrl,
        alertType: isDuress ? 'SILENT_DURESS' : 'PANIC',
        emergencyMessage: isDuress
          ? `🚨 SILENT DURESS ALERT: ${commuterName} activated silent duress mode in ${vehicleInfo}. Destination: ${trip.destination || 'Unspecified'}.`
          : `🚨 CRITICAL PANIC ALARM: ${commuterName} pressed the Emergency Panic button during their journey in ${vehicleInfo}. Destination: ${trip.destination || 'Unspecified'}.`,
        activationTime: emergencyRecord.triggeredAt || new Date(),
      }).catch((e) => console.error('Emergency Email error:', e));
    }

    // 4. Channel D: Web Push Notifications to Active Subscribers
    const targetPushUsers = await User.find({
      _id: { $ne: user?._id },
      'pushSubscription.endpoint': { $exists: true, $ne: null, $ne: '' },
    });

    for (const pushUser of targetPushUsers) {
      if (pushUser.pushSubscription) {
        sendPushNotification(pushUser.pushSubscription, {
          title: emergencyTitle,
          body: `🚨 4h live emergency tracking stream! Vehicle: ${vehicleInfo} | Destination: ${trip.destination || 'Destination'}`,
          icon: '/logo.png',
          url: `/track/${trip.trackingToken}`,
          data: { url: `/track/${trip.trackingToken}` },
          tag: `emergency-alert-${Date.now()}`,
          renotify: true,
        }).catch((e) => console.error('Push notification error:', e));
      }
    }

    // 5. Channel E: Real-Time Socket.io Emergency Broadcast
    const io = req.app.get('io');
    if (io) {
      io.emit('EMERGENCY_ALERT_BROADCAST', {
        emergencyId: emergencyRecord._id,
        tripId: trip._id,
        trackingToken: trip.trackingToken,
        trackingUrl,
        commuterId: user?._id || trip.user,
        commuterName,
        commuterPhone: user?.phone,
        avatarUrl: user?.avatarUrl,
        vehicleType: trip.vehicleType,
        numberPlate: trip.numberPlate,
        vehicleColor: trip.vehicleColor,
        destination: trip.destination,
        startCoords: trip.startCoords,
        destinationCoords: trip.destinationCoords,
        location: {
          latitude: panicLat,
          longitude: panicLng,
          address: panicAddress || `${trip.vehicleType} -> ${trip.destination}`,
        },
        status: trip.status,
        timestamp: new Date(),
      });

      io.emit('EMERGENCY_ALERT', {
        emergencyId: emergencyRecord._id,
        type: 'EMERGENCY',
        title: emergencyTitle,
        message: `${commuterName} activated ${isDuress ? 'SILENT DURESS' : 'CRITICAL PANIC'} mode in ${trip.vehicleType} (${trip.numberPlate || ''}). Destination: ${trip.destination}`,
        user: {
          id: user?._id || trip.user,
          name: commuterName,
          email: user?.email,
          phone: user?.phone,
          avatarUrl: user?.avatarUrl,
        },
        location: {
          latitude: panicLat,
          longitude: panicLng,
          address: panicAddress || `${trip.vehicleType} -> ${trip.destination}`,
        },
        timestamp: new Date().toISOString(),
        status: 'ACTIVE',
        severity: isDuress ? 'CRITICAL' : 'HIGH',
        alertType: isDuress ? 'SILENT_DURESS' : 'PANIC',
      });
    }

    res.json({
      message: 'CRITICAL EMERGENCY ALARM TRIGGERED',
      trip,
      status: trip.status,
      emergencyId: emergencyRecord._id,
      trackingToken: trip.trackingToken,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Cancel false alarm & resume active trip
// @route   PUT /api/trips/:id/cancel-panic
export const cancelPanic = async (req, res, next) => {
  try {
    const { pinCode, pin } = req.body;
    const pinToVerify = String(pinCode || pin || '').trim();

    const trip = await Trip.findById(req.params.id);
    if (!trip) {
      return res.status(404).json({ message: 'Trip not found' });
    }

    const user = await User.findById(trip.user).select('+normalPin +fakePin');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    let isAuthentic = false;
    let isDuress = false;

    // 1. Verify Normal Deactivation PIN
    if (user.normalPin) {
      isAuthentic = await user.matchNormalPin(pinToVerify);
    }
    if (!isAuthentic && user.safetyPin) {
      isAuthentic = pinToVerify === String(user.safetyPin).trim();
    }
    if (!isAuthentic && !user.normalPin && pinToVerify === '1234') {
      isAuthentic = true;
    }

    // 2. Verify Silent Duress PIN
    if (user.fakePin) {
      isDuress = await user.matchFakePin(pinToVerify);
    }
    if (!isDuress && user.duressPin) {
      isDuress = pinToVerify === String(user.duressPin).trim();
    }
    if (!isDuress && !user.fakePin && pinToVerify === '9999') {
      isDuress = true;
    }

    if (!isAuthentic && !isDuress) {
      return res.status(401).json({ message: 'Incorrect PIN. Enter 1234 or your configured deactivation PIN.' });
    }

    const io = req.app.get('io');

    if (isDuress && !isAuthentic) {
      trip.status = 'DURESS';
      await trip.save();

      const activeEmergencies = await Emergency.find({
        trip: trip._id,
        status: 'ACTIVE',
      });

      for (const emg of activeEmergencies) {
        emg.alertType = 'SILENT_DURESS';
        emg.severity = 'CRITICAL';
        await emg.save();
      }

      if (io) {
        io.emit('EMERGENCY_DURESS_ESCALATED', {
          tripId: trip._id,
          emergencyIds: activeEmergencies.map((e) => e._id),
          userId: user._id,
          message: 'Silent duress PIN entered. Contact police immediately.',
        });
      }

      return res.json({
        success: true,
        message: 'Panic alarm deactivated successfully.',
        status: 'ACTIVE',
      });
    }

    // Authentic cancellation
    trip.status = 'ACTIVE';
    trip.emergencySource = undefined;
    await trip.save();

    const resolvedEmergencies = await Emergency.find({
      trip: trip._id,
      status: 'ACTIVE',
    });

    await Emergency.updateMany(
      { trip: trip._id, status: 'ACTIVE' },
      { status: 'RESOLVED', resolvedAt: new Date() }
    );

    // Resolve all related notifications
    await Notification.updateMany(
      {
        $or: [{ tripId: trip._id }, { senderId: trip.user }],
        resolvedAt: { $exists: false },
      },
      { $set: { resolvedAt: new Date(), isRead: true } }
    );

    if (io) {
      io.emit('EMERGENCY_RESOLVED', {
        tripId: trip._id,
        emergencyIds: resolvedEmergencies.map((e) => e._id),
        userId: user._id,
        resolvedAt: new Date().toISOString(),
        message: `${user.name} confirmed safe. False alarm resolved.`,
      });
      io.emit('TRIP_STATUS_UPDATED', {
        tripId: trip._id,
        status: 'ACTIVE',
      });
    }

    // Dispatch resolution push notification to guardians
    try {
      const targetPushUsers = await User.find({
        _id: { $ne: req.user._id },
        'pushSubscription.endpoint': { $exists: true, $ne: null, $ne: '' },
      });
      for (const pushUser of targetPushUsers) {
        if (pushUser.pushSubscription) {
          sendPushNotification(pushUser.pushSubscription, {
            title: '✅ FALSE ALARM RESOLVED',
            body: `${user.name} entered safety PIN and confirmed safe. False alarm resolved.`,
            icon: '/logo.png',
            url: `/notifications`,
            data: { url: `/notifications` },
            tag: `emergency-resolved-${Date.now()}`,
            renotify: true,
          }).catch((e) => console.error('Push notification resolve error:', e));
        }
      }
    } catch (_) {}

    return res.json({
      success: true,
      message: 'Panic alarm cancelled and safe tracking resumed.',
      status: 'ACTIVE',
      trip,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Deactivate alarm (Dual-PIN safety check)
>>>>>>> Stashed changes
// @route   POST /api/trips/:id/deactivate-alarm
export const deactivateAlarm = async (req, res, next) => {
  try {
    const { pin, latitude, longitude } = req.body;

    if (!pin || !/^\d{4}$/.test(String(pin))) {
      return res.status(400).json({ message: 'A valid 4-digit PIN is required.' });
    }

    const trip = await Trip.findById(req.params.id);
    if (!trip) {
      return res.status(404).json({ message: 'Trip not found' });
    }

    if (String(trip.user) !== String(req.user._id)) {
      return res.status(403).json({ message: 'Not authorized to modify this journey' });
    }

    if (trip.status !== 'EMERGENCY') {
      return res.status(400).json({ message: 'No active alarm to deactivate for this journey' });
    }

    // Explicitly select the hashed PINs (excluded by default via `select: false`)
    const user = await User.findById(req.user._id).select('+normalPin +fakePin');

    // Always evaluate both PINs (rather than short-circuiting) so the response
    // timing and shape never hint at which PIN branch was taken.
    const [isNormalMatch, isFakeMatch] = await Promise.all([
      user.matchNormalPin(pin),
      user.matchFakePin(pin),
    ]);

    if (!isNormalMatch && !isFakeMatch) {
      return res.status(400).json({ message: 'Incorrect PIN. Please try again.' });
    }

    // Best-effort location snapshot at the moment of deactivation, logged for both
    // branches so a silent escalation can't be inferred from whether a log was written.
    let locationCoords;
    if (typeof latitude === 'number' && typeof longitude === 'number') {
      locationCoords = { lat: latitude, lng: longitude };
      await LocationLog.create({
        trip: trip._id,
        user: req.user._id,
        location: { type: 'Point', coordinates: [longitude, latitude] },
      });
    }

<<<<<<< Updated upstream
    if (isFakeMatch) {
      // Silent duress: secretly upgrade the alarm to the highest priority instead
      // of disarming it. The trip status intentionally falls out of the
      // getActiveTrip() query so it disappears from the user's view entirely.
      trip.status = 'DURESS';
      trip.duressTriggeredAt = new Date();
      if (locationCoords) trip.duressLastLocation = locationCoords;
=======
    // Check if panic mode or active emergency was actually active before disarming
    const wasInPanicMode = trip.status === 'EMERGENCY' || trip.status === 'DURESS';
    const activeEmergencies = await Emergency.find({
      trip: trip._id,
      status: 'ACTIVE',
    });
    const hadActiveAlarm = wasInPanicMode || activeEmergencies.length > 0;

    // Genuine disarm / finish
    if (finishJourney) {
      cancelPendingSafetyCheck(trip, 'TRIP_COMPLETED', 'journey finished via PIN');
      trip.status = 'COMPLETED';
      trip.completedAt = new Date();
      trip.trackingActive = false;
      trip.safetyStatus = 'SAFE';
      trip.emergencySource = undefined;
>>>>>>> Stashed changes
    } else {
      // Genuine deactivation: alarm turns off, journey tracking continues normally.
      trip.status = 'ACTIVE';
    }

    await trip.save();

    // Identical response for both branches - never reveals which PIN matched.
    return res.json({
      success: true,
      message: 'Alarm deactivated successfully.',
      status: 'ACTIVE',
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Offline Memory Storage Queue - bulk-ingest GPS points captured locally in
//          IndexedDB while the device was offline, flushed as one batch the moment
//          connectivity returns. Original client-side timestamps are preserved rather
//          than using the upload time, so the path history stays chronologically correct.
// @route   POST /api/trips/:id/coordinates/batch
export const addCoordinateBatch = async (req, res, next) => {
  try {
    const { points } = req.body;

    if (!Array.isArray(points) || points.length === 0) {
      return res.status(400).json({ message: 'A non-empty points array is required.' });
    }

    const trip = await Trip.findById(req.params.id);
    if (!trip) {
      return res.status(404).json({ message: 'Trip not found' });
    }

    if (String(trip.user) !== String(req.user._id)) {
      return res.status(403).json({ message: 'Not authorized to modify this journey' });
    }

    const docs = points
      .filter((p) => typeof p?.lat === 'number' && typeof p?.lng === 'number')
      .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
      .map((p) => ({
        trip: trip._id,
        user: req.user._id,
        location: { type: 'Point', coordinates: [p.lng, p.lat] },
        recordedAt: p.timestamp ? new Date(p.timestamp) : new Date(),
        isSafeTripCompleted: trip.status === 'COMPLETED',
        expiresAt: trip.expiresAt || undefined,
      }));

    if (docs.length === 0) {
      return res.status(400).json({ message: 'No valid coordinate points supplied.' });
    }

    await LocationLog.insertMany(docs, { ordered: true });

    console.log(
      `[Offline Queue] Flushed ${docs.length} queued coordinate point(s) into trip ${trip._id} ` +
      '(chronological order preserved via original client timestamps).'
    );

    res.status(201).json({ success: true, inserted: docs.length });
  } catch (error) {
    next(error);
  }
};

// @desc    Get user's safe journey history (available within 48-hour privacy window)
// @route   GET /api/trips/history
export const getUserTripHistory = async (req, res, next) => {
  try {
    const history = await Trip.find({
      user: req.user._id,
      status: 'COMPLETED',
    })
      .sort({ completedAt: -1 })
      .limit(30);

    res.json(history);
  } catch (error) {
    next(error);
  }
};
<<<<<<< Updated upstream
=======

// @desc    Get public tracking stream by self-destructing token
// @route   GET /api/trips/track/:token
export const getTripByTrackingToken = async (req, res, next) => {
  try {
    const { token } = req.params;
    if (!token) {
      return res.status(400).json({ valid: false, reason: 'INVALID_TOKEN', message: 'Tracking token is required.' });
    }

    const trip = await Trip.findOne({ trackingToken: token }).populate(
      'user',
      'name avatarUrl phone'
    );

    if (!trip) {
      return res.status(404).json({ valid: false, reason: 'NOT_FOUND', message: 'This emergency tracking link does not exist.' });
    }

    const now = new Date();
    const isExpired = trip.trackingExpiresAt && new Date(trip.trackingExpiresAt) < now;
    const isCompleted = trip.status === 'COMPLETED';

    if (!trip.trackingActive || isExpired || isCompleted) {
      return res.status(200).json({
        valid: false,
        reason: isCompleted ? 'TRIP_COMPLETED' : (isExpired ? 'EXPIRED' : 'DEACTIVATED'),
        message: isCompleted
          ? 'This journey has completed safely. Live tracking session is closed.'
          : 'This emergency tracking link has expired (4-hour time limit reached).',
        trip: {
          _id: trip._id,
          destination: trip.destination,
          completedAt: trip.completedAt,
        },
      });
    }

    // Fetch recent location logs (up to last 150 points for live breadcrumb trail)
    const logs = await LocationLog.find({ trip: trip._id })
      .sort({ recordedAt: 1, timestamp: 1 })
      .limit(150)
      .select('location latitude longitude batteryLevel recordedAt timestamp');

    const breadcrumbs = logs.map((log) => ({
      lat: log.location?.coordinates ? log.location.coordinates[1] : log.latitude,
      lng: log.location?.coordinates ? log.location.coordinates[0] : log.longitude,
      batteryLevel: log.batteryLevel,
      recordedAt: log.recordedAt || log.timestamp,
    }));

    const lastCoord = breadcrumbs.length > 0
      ? breadcrumbs[breadcrumbs.length - 1]
      : (trip.startCoords || { lat: 23.7808875, lng: 90.4068305 });

    return res.json({
      valid: true,
      trip: {
        _id: trip._id,
        status: trip.status,
        vehicleType: trip.vehicleType,
        numberPlate: trip.numberPlate,
        vehicleColor: trip.vehicleColor,
        startingLocation: trip.startingLocation,
        destination: trip.destination,
        driverDescription: trip.driverDescription,
        journeyNotes: trip.journeyNotes,
        photoUrl: trip.photoUrl,
        startCoords: trip.startCoords,
        destinationCoords: trip.destinationCoords,
        lastHeartbeatAt: trip.lastHeartbeatAt,
        trackingExpiresAt: trip.trackingExpiresAt,
        safetyStatus: trip.safetyStatus,
        trackingMode: trip.status === 'EMERGENCY' || trip.status === 'DURESS' ? 'EMERGENCY' : trip.safetyStatus === 'UNSAFE' ? 'UNSAFE' : 'NORMAL',
        createdAt: trip.createdAt,
      },
      commuter: {
        name: trip.user?.name || 'Commuter',
        phone: trip.user?.phone,
        avatarUrl: trip.user?.avatarUrl,
      },
      currentLocation: lastCoord,
      breadcrumbs,
      latestLocation: lastCoord,
      locationLogs: breadcrumbs,
      expiresAt: trip.trackingExpiresAt,
      isActive: trip.trackingActive,
      expiresInSeconds: Math.max(0, Math.floor((new Date(trip.trackingExpiresAt).getTime() - now.getTime()) / 1000)),
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Dead-Battery Final Emergency Blast
// @route   POST /api/trips/:id/battery-emergency
export const reportDeadBattery = async (req, res, next) => {
  try {
    const { batteryLevel, lastKnownCoords } = req.body;
    const trip = await Trip.findById(req.params.id);
    if (!trip) {
      return res.status(404).json({ message: 'Trip not found.' });
    }

    if (trip.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized for this trip.' });
    }

    await escalateToEmergency(trip, {
      source: 'BATTERY_CRITICAL',
      io: req.app.get('io'),
      batteryLevel: typeof batteryLevel === 'number' ? batteryLevel : 0,
      coords: lastKnownCoords,
    });

    const populatedUser = await User.findById(trip.user).select('name phone guardians');
    const commuterName = populatedUser?.name || 'Your commuter';
    const vehicleInfo = `${trip.vehicleType || 'vehicle'} (${trip.numberPlate || 'no plate'})`;
    const destination = trip.destination || 'their destination';

    const coordsStr = lastKnownCoords?.lat && lastKnownCoords?.lng
      ? ` Last coordinates: ${lastKnownCoords.lat.toFixed(4)}, ${lastKnownCoords.lng.toFixed(4)}.`
      : '';

    const alertMessage =
      `[PATHPROHORI CRITICAL ALERT] ${commuterName}'s phone battery has died during their journey in ${vehicleInfo} to ${destination}.${coordsStr} Emergency mode activated.`;

    if (populatedUser?.guardians && Array.isArray(populatedUser.guardians)) {
      for (const guardian of populatedUser.guardians) {
        if (guardian.phone) {
          sendEmergencySMS(guardian.phone, alertMessage).catch((e) =>
            console.error('[Battery Emergency SMS failed]', e)
          );
        }
      }
    }

    return res.status(200).json({
      success: true,
      message: 'Dead-battery emergency alert broadcast to guardians.',
      tripStatus: trip.status,
    });
  } catch (error) {
    console.error('[Battery Emergency Error]', error);
    next(error);
  }
};

// @desc    Route Deviation / Unexpected Stop safety check: commuter confirms "I'm Safe"
//          before the automatic guardian-escalation timeout fires
// @route   POST /api/trips/:id/safety-check/respond
export const respondToSafetyCheck = async (req, res, next) => {
  try {
    const trip = await Trip.findById(req.params.id);
    if (!trip) {
      return res.status(404).json({ message: 'Trip not found.' });
    }
    if (trip.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized for this trip.' });
    }
    if (!trip.safetyCheck?.active) {
      return res.status(400).json({ message: 'No pending safety check for this trip.' });
    }

    const { reason } = trip.safetyCheck;
    cancelPendingSafetyCheck(trip, 'CONFIRMED_SAFE', "commuter confirmed I'm Safe");
    // Give deviation/stop monitoring a clean slate so it can catch a second, unrelated
    // incident later in the same trip instead of instantly re-flagging the same spot.
    trip.deviationTracking = { outOfBoundsSince: null };
    trip.stopTracking = { anchorLat: undefined, anchorLng: undefined, stationarySince: undefined };
    await trip.save();

    console.log(
      `[Route Monitor] COMMUTER RESPONDED - trip ${trip._id} confirmed "I'm Safe" (reason: ${reason}). ` +
      'Safety check resolved, resuming normal monitoring.'
    );

    const io = req.app.get('io');
    if (io) {
      const payload = { tripId: trip._id, reason, outcome: 'CONFIRMED_SAFE', resolvedAt: new Date() };
      io.to(`user_${trip.user}`).emit('SAFETY_CHECK_RESOLVED', payload);
      io.to(`user:${trip.user}`).emit('SAFETY_CHECK_RESOLVED', payload);
    }

    res.json({ success: true, message: "Thanks for confirming you're safe.", trip });
  } catch (error) {
    console.error('[Respond Safety Check Error]', error);
    next(error);
  }
};

// @desc    Update battery telemetry
// @route   PUT /api/trips/:id/battery
export const updateBatteryTelemetry = async (req, res, next) => {
  try {
    const { batteryLevel, isCharging } = req.body;

    if (typeof batteryLevel !== 'number' || batteryLevel < 0 || batteryLevel > 100) {
      return res.status(400).json({ message: 'batteryLevel must be a number between 0 and 100.' });
    }

    const trip = await Trip.findById(req.params.id);
    if (!trip) {
      return res.status(404).json({ message: 'Trip not found.' });
    }

    if (trip.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized for this trip.' });
    }

    trip.batteryLevel = batteryLevel;
    trip.isCharging = Boolean(isCharging);
    await trip.save();

    const io = req.app.get('io');
    if (io) {
      io.emit('BATTERY_UPDATED', {
        tripId: trip._id,
        batteryLevel,
        isCharging: trip.isCharging,
        timestamp: new Date(),
      });
    }

    return res.status(200).json({
      success: true,
      batteryLevel: trip.batteryLevel,
      isCharging: trip.isCharging,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Upload captured photo to evidence locker
// @route   POST /api/trips/:id/evidence/photo
export const uploadEvidencePhoto = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { image, sequenceIndex, sizeBytes } = req.body;

    if (!image) {
      return res.status(400).json({ message: 'No photo data provided.' });
    }

    const trip = await Trip.findById(id);
    if (!trip) {
      return res.status(404).json({ message: 'Trip session not found.' });
    }

    const uploadResponse = await cloudinary.uploader.upload(image, {
      folder: 'pathprohori_evidence/photos',
      resource_type: 'image',
    });

    const photoObj = {
      url: uploadResponse.secure_url,
      public_id: uploadResponse.public_id,
      capturedAt: new Date(),
      sizeBytes: sizeBytes || uploadResponse.bytes || 0,
      sequenceIndex: Number(sequenceIndex) || 0,
    };

    if (!trip.evidence) {
      trip.evidence = { photos: [], audioClips: [], captureStatus: 'CAPTURING', totalSizeBytes: 0 };
    }

    trip.evidence.photos.push(photoObj);
    trip.evidence.totalSizeBytes = (trip.evidence.totalSizeBytes || 0) + (photoObj.sizeBytes || 0);
    trip.evidence.captureStatus = 'CAPTURING';

    await trip.save();

    const io = req.app.get('io');
    if (io) {
      io.emit('EVIDENCE_CAPTURED', {
        tripId: trip._id,
        type: 'PHOTO',
        photo: photoObj,
        evidence: trip.evidence,
      });
    }

    return res.status(201).json({
      success: true,
      message: 'Evidence photo saved to secure locker.',
      photo: photoObj,
      totalPhotos: trip.evidence.photos.length,
      totalSizeBytes: trip.evidence.totalSizeBytes,
    });
  } catch (error) {
    console.error('[Upload Trip Photo Error]', error);
    next(error);
  }
};

// @desc    Upload captured audio clip to evidence locker
// @route   POST /api/trips/:id/evidence/audio
export const uploadEvidenceAudio = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { audio, durationSec, sizeBytes } = req.body;

    if (!audio) {
      return res.status(400).json({ message: 'No audio data provided.' });
    }

    const trip = await Trip.findById(id);
    if (!trip) {
      return res.status(404).json({ message: 'Trip session not found.' });
    }

    let formattedAudio = audio;
    if (typeof formattedAudio === 'string' && formattedAudio.startsWith('data:')) {
      formattedAudio = formattedAudio.replace(
        /^data:audio\/[a-zA-Z0-9.-]+(;codecs=[^;]+)?;base64,/i,
        'data:video/webm;base64,'
      );
    }

    const uploadResponse = await cloudinary.uploader.upload(formattedAudio, {
      folder: 'pathprohori_evidence/audio',
      resource_type: 'video',
    });

    const audioObj = {
      url: uploadResponse.secure_url,
      public_id: uploadResponse.public_id,
      capturedAt: new Date(),
      durationSec: Number(durationSec) || 5,
      sizeBytes: sizeBytes || uploadResponse.bytes || 0,
    };

    if (!trip.evidence) {
      trip.evidence = { photos: [], audioClips: [], captureStatus: 'CAPTURING', totalSizeBytes: 0 };
    }

    trip.evidence.audioClips.push(audioObj);
    trip.evidence.totalSizeBytes = (trip.evidence.totalSizeBytes || 0) + (audioObj.sizeBytes || 0);
    trip.evidence.captureStatus = 'COMPLETED';

    await trip.save();

    const io = req.app.get('io');
    if (io) {
      io.emit('EVIDENCE_CAPTURED', {
        tripId: trip._id,
        type: 'AUDIO',
        audioClip: audioObj,
        evidence: trip.evidence,
      });
    }

    return res.status(201).json({
      success: true,
      message: 'Evidence audio clip saved to secure locker.',
      audioClip: audioObj,
      totalAudioClips: trip.evidence.audioClips.length,
      totalSizeBytes: trip.evidence.totalSizeBytes,
    });
  } catch (error) {
    console.error('[Upload Trip Audio Error]', error);
    next(error);
  }
};

// @desc    Retrieve Evidence Locker for a trip
// @route   GET /api/trips/:id/evidence
export const getTripEvidence = async (req, res, next) => {
  try {
    const { id } = req.params;
    const trip = await Trip.findById(id).populate('user', 'name email phone avatarUrl');

    if (!trip) {
      return res.status(404).json({ message: 'Trip session not found.' });
    }

    return res.json({
      success: true,
      tripId: trip._id,
      user: trip.user,
      status: trip.status,
      evidence: trip.evidence || {
        photos: [],
        audioClips: [],
        captureStatus: 'PENDING',
        totalSizeBytes: 0,
      },
    });
  } catch (error) {
    console.error('[Get Trip Evidence Error]', error);
    next(error);
  }
};

// @desc    Update evidence capture status
// @route   PUT /api/trips/:id/evidence/status
export const updateEvidenceStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const trip = await Trip.findById(id);
    if (!trip) {
      return res.status(404).json({ message: 'Trip session not found.' });
    }

    if (!trip.evidence) {
      trip.evidence = { photos: [], audioClips: [], captureStatus: status || 'PARTIAL', totalSizeBytes: 0 };
    } else {
      trip.evidence.captureStatus = status || trip.evidence.captureStatus;
    }

    await trip.save();
    return res.json({ success: true, evidence: trip.evidence });
  } catch (error) {
    console.error('[Update Evidence Status Error]', error);
    next(error);
  }
};

export const handleBatteryCriticalEmergency = reportDeadBattery;
export const getPublicTrackingData = getTripByTrackingToken;

export default {
  createTrip,
  getActiveTrip,
  updateSafetyStatus,
  sendHeartbeat,
  completeTrip,
  triggerPanic,
  cancelPanic,
  deactivateAlarm,
  getUserTripHistory,
  getTripByTrackingToken,
  getPublicTrackingData,
  reportDeadBattery,
  handleBatteryCriticalEmergency,
  respondToSafetyCheck,
  updateBatteryTelemetry,
  uploadEvidencePhoto,
  uploadEvidenceAudio,
  getTripEvidence,
  updateEvidenceStatus,
};
>>>>>>> Stashed changes
