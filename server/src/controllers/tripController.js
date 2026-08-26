import { Trip } from '../models/Trip.js';
import { LocationLog } from '../models/LocationLog.js';
import { User } from '../models/User.js';

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

// @desc    Deactivate an active emergency alarm using the normal or secret duress PIN
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

    if (isFakeMatch) {
      // Silent duress: secretly upgrade the alarm to the highest priority instead
      // of disarming it. The trip status intentionally falls out of the
      // getActiveTrip() query so it disappears from the user's view entirely.
      trip.status = 'DURESS';
      trip.duressTriggeredAt = new Date();
      if (locationCoords) trip.duressLastLocation = locationCoords;
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
