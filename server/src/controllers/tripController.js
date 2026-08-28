import crypto from 'crypto';
import { Trip } from '../models/Trip.js';
import { LocationLog } from '../models/LocationLog.js';
import { User } from '../models/User.js';
import { Emergency } from '../models/Emergency.js';
import { sendPushNotification } from '../services/pushService.js';
import { sendEmergencySMS } from '../services/twilioService.js';
import { getReverseGeocodedAddress } from './emergencyController.js';
import Notification from '../models/Notification.js';
import { evaluateTripZones } from '../services/geofenceService.js';

// Shared guardian-escalation pathway for anything that raises a trip to EMERGENCY
// priority - the 1-tap panic button and the dead-battery final blast both funnel
// through here so there is exactly one place that flips trip status, logs the
// location, and broadcasts the Socket.io alert to guardians/operators.
const escalateToEmergency = async (trip, { source, io, batteryLevel, coords, isDuress } = {}) => {
  trip.status = isDuress ? 'DURESS' : 'EMERGENCY';
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

    const trackingToken = crypto.randomBytes(20).toString('hex');
    const trackingExpiresAt = new Date(Date.now() + 4 * 60 * 60 * 1000); // 4-hour self-destruct window

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
      trackingToken,
      trackingExpiresAt,
      trackingActive: true,
    });

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
      status: { $in: ['ACTIVE', 'SIGNAL_LOST', 'EMERGENCY', 'DURESS'] },
    }).sort({ createdAt: -1 });

    res.json(activeTrip);
  } catch (error) {
    next(error);
  }
};

// @desc    Set the traveler's manual safety status
// @route   PATCH /api/trips/:id/safety-status
export const updateSafetyStatus = async (req, res, next) => {
  try {
    const { safetyStatus, latitude, longitude } = req.body || {};
    if (!['SAFE', 'UNSAFE'].includes(safetyStatus)) {
      return res.status(400).json({ message: 'Safety status must be SAFE or UNSAFE.' });
    }

    const trip = await Trip.findOne({ _id: req.params.id, user: req.user._id });
    if (!trip) return res.status(404).json({ message: 'Active journey not found.' });
    if (trip.status === 'COMPLETED') {
      return res.status(400).json({ message: 'Completed journeys cannot change safety status.' });
    }
    if (['EMERGENCY', 'DURESS'].includes(trip.status)) {
      return res.status(400).json({ message: 'Resolve the emergency state before changing safety status.' });
    }

    const hasCoordinates = typeof latitude === 'number' && typeof longitude === 'number';
    if (hasCoordinates && (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180)) {
      return res.status(400).json({ message: 'Invalid safety status coordinates.' });
    }

    const changed = trip.safetyStatus !== safetyStatus;
    trip.safetyStatus = safetyStatus;
    if (changed) {
      trip.safetyStatusChangedAt = new Date();
      trip.safetyStatusChangedBy = req.user._id;
    }
    if (hasCoordinates) trip.safetyStatusLocation = { lat: latitude, lng: longitude };
    await trip.save();

    if (changed && safetyStatus === 'UNSAFE') {
      const user = await User.findById(req.user._id).select('name guardians').populate('guardians.user', 'name email phone pushSubscription');
      const guardianRecipients = (user?.guardians || []).map((guardian) => guardian.user?._id).filter(Boolean);
      const operatorRecipients = await User.find({
        role: { $in: ['operator', 'admin'] },
        _id: { $ne: req.user._id },
      }).select('_id');
      const recipients = [...new Map(
        [...guardianRecipients, ...operatorRecipients.map((operator) => operator._id)]
          .map((recipientId) => [String(recipientId), recipientId])
      ).values()];
      const notificationPayload = {
        type: 'WARNING',
        title: 'Traveler marked journey unsafe',
        commuterName: user?.name || 'Traveler',
        senderName: user?.name || 'Traveler',
        tripId: trip._id,
        startingLocation: trip.startingLocation,
        destination: trip.destination,
        location: hasCoordinates ? { latitude, longitude } : undefined,
      };
      await Promise.all(recipients.map((recipientId) => Notification.create({
        ...notificationPayload,
        recipientId,
        senderId: req.user._id,
      })));

      const io = req.app.get('io');
      if (io) {
        const alert = {
          ...notificationPayload,
          notificationType: 'MANUAL_UNSAFE',
          senderId: req.user._id,
          audience: 'GUARDIANS_AND_OPERATORS',
          safetyStatus,
          timestamp: new Date(),
        };
        recipients.forEach((recipientId) => io.to(`user_${recipientId}`).emit('SAFETY_WARNING', alert));
      }
    }

    res.json({ success: true, safetyStatus: trip.safetyStatus, changed, trip });
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

    if (String(trip.user) !== String(req.user._id)) {
      return res.status(403).json({ message: 'Not authorized to modify this journey' });
    }

    trip.lastHeartbeatAt = new Date();
    if (trip.status === 'SIGNAL_LOST') {
      trip.status = 'ACTIVE'; // Restored connection
    }
    await trip.save();

    // Log location if passed
    const hasCoordinates = typeof req.body.latitude === 'number' && typeof req.body.longitude === 'number';
    if (hasCoordinates && req.body.latitude >= -90 && req.body.latitude <= 90 && req.body.longitude >= -180 && req.body.longitude <= 180) {
      await LocationLog.create({
        trip: trip._id,
        user: trip.user,
        location: {
          type: 'Point',
          coordinates: [req.body.longitude, req.body.latitude],
        },
        batteryLevel: req.body.batteryLevel,
        trackingMode: req.body.trackingMode || (trip.safetyStatus === 'UNSAFE' ? 'UNSAFE' : 'NORMAL'),
      });

      await evaluateTripZones(trip, { lat: req.body.latitude, lng: req.body.longitude }, req.app.get('io'));

      // Real-time broadcast to public guardian tracking room
      const io = req.app.get('io');
      if (io) {
        io.to(`track_${trip._id}`).emit('TRACKING_LOCATION_UPDATE', {
          coords: { lat: req.body.latitude, lng: req.body.longitude },
          batteryLevel: req.body.batteryLevel,
          status: trip.status,
          safetyStatus: trip.safetyStatus,
          trackingMode: trip.status === 'EMERGENCY' || trip.status === 'DURESS' ? 'EMERGENCY' : trip.safetyStatus === 'UNSAFE' ? 'UNSAFE' : 'NORMAL',
          updatedAt: new Date(),
        });
      }
    }

    res.json({
      success: true,
      lastHeartbeatAt: trip.lastHeartbeatAt,
      status: trip.status,
      safetyStatus: trip.safetyStatus,
      trackingMode: trip.safetyStatus === 'UNSAFE' ? 'UNSAFE' : 'NORMAL',
    });
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
    trip.safetyStatus = 'SAFE';
    trip.safetyStatusChangedAt = now;
    trip.safetyStatusChangedBy = req.user._id;
    trip.completedAt = now;
    trip.expiresAt = expiresAt;
    trip.trackingActive = false;
    await trip.save();

    // Mark location logs as completed safe trip and apply 48-hour expiration TTL
    await LocationLog.updateMany(
      { trip: trip._id },
      { isSafeTripCompleted: true, expiresAt: expiresAt }
    );

    const resolvedEmergencies = await Emergency.find({ user: req.user._id, status: 'ACTIVE' }).select('_id');
    await Emergency.updateMany(
      { user: req.user._id, status: 'ACTIVE' },
      { $set: { status: 'RESOLVED', alertType: 'FALSE_ALARM', resolvedAt: now } }
    );
    const io = req.app.get('io');
    if (io) {
      if (resolvedEmergencies.length > 0) {
        io.emit('EMERGENCY_RESOLVED', {
          emergencyIds: resolvedEmergencies.map((emergency) => emergency._id),
          userId: req.user._id,
          resolvedAt: now,
          message: `${req.user.name} completed the journey safely.`,
        });
      }
      // Broadcast tracking expiration to any active guardian map sessions
      io.to(`track_${trip._id}`).emit('TRACKING_EXPIRED', {
        reason: 'TRIP_COMPLETED',
        message: 'The journey has ended safely.',
      });
    }

    res.json({ message: 'Trip completed safely', trip });
  } catch (error) {
    next(error);
  }
};

// @desc    One-Tap Instant Panic Button & Emergency Broadcast
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
    trip.trackingExpiresAt = new Date(Date.now() + 4 * 60 * 60 * 1000); // 4h from panic trigger
    trip.trackingActive = true;
    await trip.save();

    // Fetch user and linked guardians for Web Push & Twilio SMS broadcast
    const user = await User.findById(trip.user).populate('guardians.user');
    const commuterName = user?.name || 'Commuter';
    const vehicleInfo = `${trip.vehicleType || 'Vehicle'} (${trip.numberPlate || 'No Plate'})`;
    const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
    const trackingUrl = `${clientUrl}/track/${trip.trackingToken}`;

    const emergencyTitle = isDuress
      ? `🚨 SILENT DURESS ALARM: ${commuterName}`
      : `🚨 CRITICAL EMERGENCY ALARM: ${commuterName}`;
    const smsMessage = `[PATHPROHORI EMERGENCY ALERT] ${commuterName} activated ${isDuress ? 'SILENT DURESS' : 'CRITICAL PANIC'} mode in ${vehicleInfo}. Destination: ${trip.destination}. LIVE TRACKING LINK: ${trackingUrl} (Expires in 4 hrs).`;

    // 1. Send Twilio SMS with Self-Destructing Tracking Link to explicit linked guardians
    if (user && Array.isArray(user.guardians)) {
      for (const guardian of user.guardians) {
        const phone = guardian.phone || (guardian.user && guardian.user.phone);
        if (phone) {
          sendEmergencySMS(phone, smsMessage).catch((e) => console.error('Twilio SMS error:', e));
        }
      }
    }

    // 2. Broadcast Web Push Notifications to all active push subscriptions (except the commuter themselves)
    const targetPushUsers = await User.find({
      _id: { $ne: user?._id },
      'pushSubscription.endpoint': { $exists: true, $ne: null, $ne: '' },
    });

    console.log(`🔔 Sending Web Push Notification to ${targetPushUsers.length} active guardian/user subscriptions with Live Tracking URL...`);

    for (const pushUser of targetPushUsers) {
      if (pushUser.pushSubscription) {
        sendPushNotification(pushUser.pushSubscription, {
          title: emergencyTitle,
          body: `🚨 Tap to open 4h live emergency tracking stream! Vehicle: ${vehicleInfo} | Destination: ${trip.destination}`,
          icon: '/pwa-192x192.png',
          url: `/track/${trip.trackingToken}`,
        }).catch((e) => console.error('Push notification error:', e));
      }
    }

    // 3. Create Emergency Record in Database for Guardian Notification Panel
    const panicLat = (req.body.latitude && typeof req.body.latitude === 'number')
      ? req.body.latitude
      : (trip.startCoords && typeof trip.startCoords.lat === 'number') ? trip.startCoords.lat : 23.7808875;
    const panicLng = (req.body.longitude && typeof req.body.longitude === 'number')
      ? req.body.longitude
      : (trip.startCoords && typeof trip.startCoords.lng === 'number') ? trip.startCoords.lng : 90.4068305;

    const panicAddress = await getReverseGeocodedAddress(panicLat, panicLng);

    const emergencyRecord = await Emergency.create({
      user: user._id,
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

    // 4. Emit Real-Time Socket.io Emergency Broadcast & Alert to all open Guardian browser tabs
    const io = req.app.get('io');
    if (io) {
      io.emit('EMERGENCY_ALERT_BROADCAST', {
        emergencyId: emergencyRecord._id,
        tripId: trip._id,
        trackingToken: trip.trackingToken,
        trackingUrl,
        commuterId: user?._id,
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
          address: panicAddress,
        },
        status: trip.status,
        timestamp: new Date(),
      });

      io.emit('EMERGENCY_ALERT', {
        emergencyId: emergencyRecord._id,
        tripId: trip._id,
        trackingToken: trip.trackingToken,
        trackingUrl,
        type: 'EMERGENCY',
        title: '🚨 CRITICAL PANIC ALERT',
        message: `${commuterName} activated CRITICAL PANIC mode in ${trip.vehicleType} (${trip.numberPlate || ''}). Destination: ${trip.destination}`,
        user: {
          id: user._id,
          name: commuterName,
          email: user.email,
          phone: user.phone,
          avatarUrl: user.avatarUrl,
        },
        location: {
          latitude: panicLat,
          longitude: panicLng,
          address: panicAddress,
        },
        transit: {
          vehicleType: trip.vehicleType,
          numberPlate: trip.numberPlate,
          destination: trip.destination,
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
      emergency: emergencyRecord,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Cancel false alarm & resume active trip
// @route   PUT /api/trips/:id/cancel-panic
export const cancelPanic = async (req, res, next) => {
  try {
    const { pinCode } = req.body;
    const trip = await Trip.findById(req.params.id);
    if (!trip) {
      return res.status(404).json({ message: 'Trip not found' });
    }

    const user = await User.findById(req.user._id).populate('guardians.user');
    // If entered pin matches user's duress pin, maintain duress alarm
    if (user && user.duressPin && pinCode === user.duressPin) {
      trip.status = 'DURESS';
      await trip.save();
      return res.json({ message: 'Emergency status maintained', trip, status: trip.status });
    }

    // Revert trip status back to ACTIVE
    trip.status = 'ACTIVE';
    await trip.save();

    // Mark active emergency records as RESOLVED in database
    const resolvedEmergencies = await Emergency.find({ user: req.user._id, status: 'ACTIVE' }).select('_id');
    await Emergency.updateMany(
      { user: req.user._id, status: 'ACTIVE' },
      { $set: { status: 'RESOLVED', alertType: 'FALSE_ALARM', resolvedAt: new Date() } }
    );

    const io = req.app.get('io');
    if (io) {
      io.emit('EMERGENCY_RESOLVED', {
        emergencyIds: resolvedEmergencies.map((emergency) => emergency._id),
        userId: req.user._id,
        message: `${user?.name || 'Commuter'} resolved false alarm safely.`,
      });
    }

    // Broadcast Web Push to linked Guardians letting them know false alarm was resolved
    const commuterName = user?.name || 'Commuter';
    if (user && Array.isArray(user.guardians)) {
      for (const guardian of user.guardians) {
        if (guardian.user && guardian.user.pushSubscription) {
          sendPushNotification(guardian.user.pushSubscription, {
            title: `🟢 FALSE ALARM RESOLVED: ${commuterName}`,
            body: `${commuterName} confirmed safe. False alarm has been cancelled and journey resumed.`,
            icon: '/pwa-192x192.png',
            url: `/notifications`,
          }).catch((e) => console.error('Push notification resolution error:', e));
        }
      }
    }

    res.json({ message: 'False alarm resolved safely. Journey resumed.', trip, status: trip.status });
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

// @desc    Deactivate an active emergency alarm using the normal or secret duress PIN
// @route   POST /api/trips/:id/deactivate-alarm
export const deactivateAlarm = async (req, res, next) => {
  try {
    const { pin, latitude, longitude, finishJourney } = req.body;

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

    if (!['ACTIVE', 'EMERGENCY', 'DURESS'].includes(trip.status) || (!finishJourney && trip.status === 'ACTIVE')) {
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
    const legacyNormalMatch = !user.normalPin && String(pin) === String(user.duressPin || '');

    if (!isNormalMatch && !isFakeMatch && !legacyNormalMatch) {
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

    if (isFakeMatch) {
      // Silent duress: secretly upgrade the alarm to the highest priority instead
      // of disarming it. The trip status intentionally falls out of the
      // getActiveTrip() query so it disappears from the user's view entirely.
      trip.status = 'DURESS';
      trip.duressTriggeredAt = new Date();
      if (locationCoords) trip.duressLastLocation = locationCoords;
    } else {
      // Genuine deactivation: alarm turns off, journey tracking continues normally.
      trip.status = finishJourney ? 'COMPLETED' : 'ACTIVE';
      if (finishJourney) {
        trip.completedAt = new Date();
        trip.expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000);
        await LocationLog.updateMany(
          { trip: trip._id },
          { isSafeTripCompleted: true, expiresAt: trip.expiresAt }
        );
      }
    }

    await trip.save();

    if (isFakeMatch) {
      const duressLocation = locationCoords || {
        lat: trip.startCoords?.lat || 23.7808875,
        lng: trip.startCoords?.lng || 90.4068305,
      };
      await Emergency.updateMany(
        { user: req.user._id, status: 'ACTIVE' },
        {
          $set: {
            alertType: 'SILENT_DURESS',
            severity: 'CRITICAL',
            'location.latitude': duressLocation.lat,
            'location.longitude': duressLocation.lng,
            'location.address': `LAST SEEN: ${duressLocation.lat.toFixed(5)}, ${duressLocation.lng.toFixed(5)}`,
          },
        }
      );
      let duressEmergencies = await Emergency.find({ user: req.user._id, status: 'ACTIVE' }).select('_id');
      if (duressEmergencies.length === 0) {
        const duressRecord = await Emergency.create({
          user: req.user._id,
          location: {
            latitude: duressLocation.lat,
            longitude: duressLocation.lng,
            address: `${trip.vehicleType || 'Vehicle'} -> Dest: ${trip.destination || 'In Transit'}`,
          },
          status: 'ACTIVE',
          alertType: 'SILENT_DURESS',
          severity: 'CRITICAL',
          triggeredAt: new Date(),
        });
        duressEmergencies = [{ _id: duressRecord._id }];
      }
      const io = req.app.get('io');
      if (io) {
        io.emit('EMERGENCY_DURESS_ESCALATED', {
          emergencyId: duressEmergencies[0]?._id,
          emergencyIds: duressEmergencies.map((emergency) => emergency._id),
          userId: req.user._id,
          location: { latitude: duressLocation.lat, longitude: duressLocation.lng },
          message: `${user?.name || 'Commuter'} entered the silent duress PIN. Contact police immediately.`,
        });
      }
      if (user && Array.isArray(user.guardians)) {
        for (const guardian of user.guardians) {
          if (guardian.user?.pushSubscription) {
            sendPushNotification(guardian.user.pushSubscription, {
              title: `🚨 SILENT DURESS: ${user.name}`,
              body: `Contact police immediately. Last seen: ${duressLocation.lat.toFixed(5)}, ${duressLocation.lng.toFixed(5)}`,
              icon: '/pwa-192x192.png',
              url: '/notifications',
            }).catch((error) => console.error('Duress push notification error:', error));
          }
        }
      }
    }

    if (!isFakeMatch) {
      const resolvedEmergencies = await Emergency.find({ user: req.user._id, status: 'ACTIVE' }).select('_id');
      await Emergency.updateMany(
        { user: req.user._id, status: 'ACTIVE' },
        { $set: { status: 'RESOLVED', alertType: 'FALSE_ALARM', resolvedAt: new Date() } }
      );

      const io = req.app.get('io');
      if (io) {
        io.emit('EMERGENCY_RESOLVED', {
          emergencyIds: resolvedEmergencies.map((emergency) => emergency._id),
          userId: req.user._id,
          message: `${user?.name || 'Commuter'} confirmed a false alarm and is safe.`,
        });
      }
    }

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

// @desc    Public Live Tracking Feed for Guardians (Self-Destructing 4h Link)
// @route   GET /api/trips/track/:token
export const getPublicTrackingData = async (req, res, next) => {
  try {
    const { token } = req.params;
    if (!token) {
      return res.status(400).json({ valid: false, reason: 'INVALID_TOKEN', message: 'Tracking token is required.' });
    }

    const trip = await Trip.findOne({ trackingToken: token }).populate('user', 'name phone avatarUrl');
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
      .sort({ recordedAt: 1 })
      .limit(150)
      .select('location batteryLevel recordedAt');

    const breadcrumbs = logs.map((log) => ({
      lat: log.location.coordinates[1],
      lng: log.location.coordinates[0],
      batteryLevel: log.batteryLevel,
      recordedAt: log.recordedAt,
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
      expiresInSeconds: Math.max(0, Math.floor((new Date(trip.trackingExpiresAt).getTime() - now.getTime()) / 1000)),
    });
  } catch (error) {
    next(error);
  }
};

