import crypto from 'crypto';
import { Trip } from '../models/Trip.js';
import { LocationLog } from '../models/LocationLog.js';
import { User } from '../models/User.js';
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

// Shared guardian-escalation pathway for anything that raises a trip to EMERGENCY
// priority - the 1-tap panic button, silent duress, and the dead-battery final blast
// all funnel through here.
const escalateToEmergency = async (trip, { source, io, batteryLevel, coords, isDuress } = {}) => {
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
      driverDescription,
      journeyNotes,
      photoUrl,
      startCoords,
      destinationCoords,
    } = req.body;

    const trackingToken = crypto.randomBytes(20).toString('hex');
    const trackingExpiresAt = new Date(Date.now() + 4 * 60 * 60 * 1000); // 4 hours valid

    const trip = await Trip.create({
      user: req.user._id,
      vehicleType,
      numberPlate,
      vehicleColor,
      estimatedTimeMinutes: estimatedTimeMinutes || 30,
      startingLocation: startingLocation || 'Current GPS Location',
      destination,
      driverDescription,
      journeyNotes,
      photoUrl,
      startCoords,
      destinationCoords,
      trackingToken,
      trackingExpiresAt,
      trackingActive: true,
      status: 'ACTIVE',
      lastHeartbeatAt: new Date(),
    });

    if (startCoords?.lat && startCoords?.lng) {
      try {
        await evaluateTripZones(trip, { lat: startCoords.lat, lng: startCoords.lng }, req.app.get('io'));
      } catch (zoneErr) {
        console.warn('[createTrip] Initial zone/hazard evaluation failed:', zoneErr.message);
      }
    }

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

    if (activeTrip) {
      const now = new Date();
      // Auto-complete stale trips older than 24 hours so users never get permanently stuck
      const isStale = (now.getTime() - new Date(activeTrip.createdAt).getTime()) > 24 * 60 * 60 * 1000;
      if (isStale) {
        activeTrip.status = 'COMPLETED';
        activeTrip.completedAt = now;
        activeTrip.trackingActive = false;
        await activeTrip.save();
        return res.json(null);
      }
    }

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

// @desc    Receive telemetry heartbeat from commuter device
// @route   POST /api/trips/:id/heartbeat
export const sendHeartbeat = async (req, res, next) => {
  try {
    const { latitude, longitude, batteryLevel, networkStrength, isBackground } = req.body;

    const trip = await Trip.findById(req.params.id);
    if (!trip) {
      return res.status(404).json({ message: 'Trip not found' });
    }

    if (String(trip.user) !== String(req.user._id)) {
      return res.status(403).json({ message: 'Not authorized to modify this journey' });
    }

    if (trip.status === 'COMPLETED') {
      return res.status(400).json({ message: 'Cannot update a completed trip' });
    }

    trip.lastHeartbeatAt = new Date();
    if (trip.status === 'SIGNAL_LOST') {
      trip.status = 'ACTIVE'; // Restored connection
    }

    if (batteryLevel !== undefined) trip.batteryLevel = batteryLevel;
    if (networkStrength !== undefined) trip.networkStrength = networkStrength;
    await trip.save();

    // Log location if passed
    const hasCoordinates = typeof latitude === 'number' && typeof longitude === 'number';
    if (hasCoordinates && latitude >= -90 && latitude <= 90 && longitude >= -180 && longitude <= 180) {
      await LocationLog.create({
        trip: trip._id,
        user: trip.user,
        location: {
          type: 'Point',
          coordinates: [longitude, latitude],
        },
        latitude,
        longitude,
        batteryLevel: batteryLevel ?? trip.batteryLevel,
        networkStrength: networkStrength ?? trip.networkStrength ?? 100,
        isBackground: Boolean(isBackground),
        trackingMode: req.body.trackingMode || (trip.safetyStatus === 'UNSAFE' ? 'UNSAFE' : 'NORMAL'),
        timestamp: new Date(),
      });

      await evaluateTripZones(trip, { lat: latitude, lng: longitude }, req.app.get('io'));

      // Real-time broadcast to public guardian tracking room & global listeners
      const io = req.app.get('io');
      if (io) {
        io.to(`track_${trip._id}`).emit('TRACKING_LOCATION_UPDATE', {
          coords: { lat: latitude, lng: longitude },
          batteryLevel: batteryLevel ?? trip.batteryLevel,
          status: trip.status,
          safetyStatus: trip.safetyStatus,
          trackingMode: trip.status === 'EMERGENCY' || trip.status === 'DURESS' ? 'EMERGENCY' : trip.safetyStatus === 'UNSAFE' ? 'UNSAFE' : 'NORMAL',
          updatedAt: new Date(),
        });

        io.emit('LOCATION_UPDATED', {
          tripId: trip._id,
          trackingToken: trip.trackingToken,
          latitude,
          longitude,
          batteryLevel: batteryLevel ?? trip.batteryLevel,
          networkStrength: networkStrength ?? trip.networkStrength,
          timestamp: new Date(),
        });
      }
    }

    res.json({
      success: true,
      message: 'Heartbeat acknowledged',
      lastHeartbeatAt: trip.lastHeartbeatAt,
      status: trip.status,
      safetyStatus: trip.safetyStatus,
      trackingMode: trip.safetyStatus === 'UNSAFE' ? 'UNSAFE' : 'NORMAL',
    });
  } catch (error) {
    next(error);
  }
};

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
// @route   POST /api/trips/:id/deactivate-alarm
export const deactivateAlarm = async (req, res, next) => {
  try {
    const { enteredPin, pin, pinCode, finishJourney, latitude, longitude } = req.body;
    const pinToVerify = String(enteredPin || pin || pinCode || '').trim();

    const trip = await Trip.findById(req.params.id);
    if (!trip) {
      return res.status(404).json({ message: 'Trip not found' });
    }

    const user = await User.findById(req.user._id).select('+normalPin +fakePin');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    let isNormalMatch = false;
    let isDuressMatch = false;

    // 1. Verify Normal Deactivation PIN
    if (user.normalPin) {
      isNormalMatch = await user.matchNormalPin(pinToVerify);
    }
    if (!isNormalMatch && user.safetyPin) {
      isNormalMatch = pinToVerify === String(user.safetyPin).trim();
    }
    if (!isNormalMatch && !user.normalPin && pinToVerify === '1234') {
      isNormalMatch = true;
    }

    // 2. Verify Silent Duress PIN
    if (user.fakePin) {
      isDuressMatch = await user.matchFakePin(pinToVerify);
    }
    if (!isDuressMatch && user.duressPin) {
      isDuressMatch = pinToVerify === String(user.duressPin).trim();
    }
    if (!isDuressMatch && !user.fakePin && pinToVerify === '9999') {
      isDuressMatch = true;
    }

    if (!isNormalMatch && !isDuressMatch) {
      return res.status(400).json({ message: 'Invalid safety PIN. Enter 1234 or your configured deactivation PIN.' });
    }

    const io = req.app.get('io');

    if (isDuressMatch && !isNormalMatch) {
      await escalateToEmergency(trip, {
        source: 'SILENT_DURESS_PIN',
        io,
        isDuress: true,
        coords: latitude && longitude ? { lat: latitude, lng: longitude } : undefined,
      });

      const duressAlerts = await Emergency.find({ trip: trip._id, status: 'ACTIVE' });
      for (const emg of duressAlerts) {
        emg.alertType = 'SILENT_DURESS';
        emg.severity = 'CRITICAL';
        await emg.save();
      }

      return res.json({
        success: true,
        message: 'Alarm deactivated successfully.',
        status: 'DURESS',
      });
    }

    // Genuine disarm / finish
    if (finishJourney) {
      trip.status = 'COMPLETED';
      trip.completedAt = new Date();
      trip.trackingActive = false;
      trip.safetyStatus = 'SAFE';
      trip.emergencySource = undefined;
    } else {
      trip.status = 'ACTIVE';
      trip.emergencySource = undefined;
    }
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
        userId: req.user._id,
        resolvedAt: new Date().toISOString(),
        message: `${user?.name || 'Commuter'} confirmed safe and disarmed alarm.`,
      });
      io.emit('TRIP_STATUS_UPDATED', {
        tripId: trip._id,
        status: trip.status,
        completedAt: trip.completedAt,
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
            body: `${user?.name || 'Commuter'} entered safety PIN and confirmed safe. Alarm is resolved.`,
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
      message: finishJourney ? 'Journey completed safely.' : 'Alarm deactivated and safe journey resumed.',
      status: trip.status,
      trip,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get user's safe journey history
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

// @desc    Receive a batch of offline-queued GPS coordinate points
// @route   POST /api/trips/:id/coordinates/batch
export const handleCoordinateBatch = async (req, res, next) => {
  try {
    const { points } = req.body;

    if (!Array.isArray(points) || points.length === 0) {
      return res.status(400).json({ message: 'No coordinate points provided.' });
    }

    const trip = await Trip.findById(req.params.id);
    if (!trip) {
      return res.status(404).json({ message: 'Trip not found.' });
    }

    if (trip.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to submit coordinates for this trip.' });
    }

    const docsToInsert = points
      .filter((p) => typeof p.lat === 'number' && typeof p.lng === 'number')
      .map((p) => ({
        trip: trip._id,
        latitude: p.lat,
        longitude: p.lng,
        batteryLevel: typeof p.batteryLevel === 'number' ? p.batteryLevel : trip.batteryLevel,
        networkStrength: typeof p.networkStrength === 'number' ? p.networkStrength : 0,
        isBackground: Boolean(p.isBackground),
        timestamp: p.timestamp ? new Date(p.timestamp) : new Date(),
      }));

    if (docsToInsert.length === 0) {
      return res.status(400).json({ message: 'All points in batch had invalid coordinates.' });
    }

    await LocationLog.insertMany(docsToInsert, { ordered: false });

    const sortedByTime = [...docsToInsert].sort((a, b) => b.timestamp - a.timestamp);
    const freshest = sortedByTime[0];

    if (freshest && freshest.timestamp > trip.lastHeartbeatAt) {
      trip.lastHeartbeatAt = freshest.timestamp;
      trip.batteryLevel = freshest.batteryLevel;
      if (trip.status === 'SIGNAL_LOST') {
        trip.status = 'ACTIVE';
      }
      await trip.save();
    }

    const io = req.app.get('io');
    if (io) {
      io.emit('LOCATION_BATCH_RECEIVED', {
        tripId: trip._id,
        count: docsToInsert.length,
        freshestPoint: {
          latitude: freshest.latitude,
          longitude: freshest.longitude,
          timestamp: freshest.timestamp,
        },
      });
    }

    return res.status(200).json({
      success: true,
      message: `Successfully flushed ${docsToInsert.length} queued location points to server.`,
      count: docsToInsert.length,
      tripStatus: trip.status,
    });
  } catch (error) {
    console.error('[Coordinate Batch Error]', error);
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

export const addCoordinateBatch = handleCoordinateBatch;
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
  handleCoordinateBatch,
  addCoordinateBatch,
  reportDeadBattery,
  handleBatteryCriticalEmergency,
  updateBatteryTelemetry,
  uploadEvidencePhoto,
  uploadEvidenceAudio,
  getTripEvidence,
  updateEvidenceStatus,
};
