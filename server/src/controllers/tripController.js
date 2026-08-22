import { Trip } from '../models/Trip.js';
import { LocationLog } from '../models/LocationLog.js';
import { User } from '../models/User.js';
import { sendPushNotification } from '../services/pushService.js';
import { sendEmergencySMS } from '../services/twilioService.js';

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

// @desc    One-Tap Instant Panic Button & Emergency Broadcast
// @route   POST /api/trips/:id/trigger-panic
export const triggerPanic = async (req, res, next) => {
  try {
    const isDuress = req.body && req.body.isDuress;
    const trip = await Trip.findById(req.params.id);
    if (!trip) {
      return res.status(404).json({ message: 'Trip not found' });
    }

    trip.status = isDuress ? 'DURESS' : 'EMERGENCY';
    await trip.save();

    // Fetch user and linked guardians for Web Push & Twilio SMS broadcast
    const user = await User.findById(trip.user).populate('guardians.user');
    const commuterName = user?.name || 'Commuter';
    const vehicleInfo = `${trip.vehicleType || 'Vehicle'} (${trip.numberPlate || 'No Plate'})`;
    const emergencyTitle = isDuress
      ? `🚨 SILENT DURESS ALARM: ${commuterName}`
      : `🚨 CRITICAL EMERGENCY ALARM: ${commuterName}`;
    const smsMessage = `[PATHPROHORI EMERGENCY ALERT] ${commuterName} activated ${isDuress ? 'SILENT DURESS' : 'CRITICAL PANIC'} mode in ${vehicleInfo}. Destination: ${trip.destination}. Check app now.`;

    // 1. Send Twilio SMS to explicit linked guardians
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

    console.log(`🔔 Sending Web Push Notification to ${targetPushUsers.length} active guardian/user subscriptions...`);

    for (const pushUser of targetPushUsers) {
      if (pushUser.pushSubscription) {
        sendPushNotification(pushUser.pushSubscription, {
          title: emergencyTitle,
          body: `Vehicle: ${vehicleInfo} | Destination: ${trip.destination}`,
          icon: '/pwa-192x192.png',
          url: `/notifications`,
        }).catch((e) => console.error('Push notification error:', e));
      }
    }

    // 3. Emit Real-Time Socket.io Emergency Broadcast to all open Guardian browser tabs
    const io = req.app.get('io');
    if (io) {
      io.emit('EMERGENCY_ALERT_BROADCAST', {
        tripId: trip._id,
        commuterId: user?._id,
        commuterName,
        commuterPhone: user?.phone,
        vehicleType: trip.vehicleType,
        numberPlate: trip.numberPlate,
        vehicleColor: trip.vehicleColor,
        destination: trip.destination,
        startCoords: trip.startCoords,
        destinationCoords: trip.destinationCoords,
        status: trip.status,
        timestamp: new Date(),
      });
    }

    res.json({ message: 'CRITICAL EMERGENCY ALARM TRIGGERED', trip, status: trip.status });
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
