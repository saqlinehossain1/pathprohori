import express from 'express';
import { Trip } from '../models/Trip.js';
import { LocationLog } from '../models/LocationLog.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// @route   POST /api/trips
// @desc    Log a new journey (Commuter)
router.post('/', protect, async (req, res) => {
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
    } = req.body;

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
      status: 'ACTIVE',
      lastHeartbeatAt: new Date(),
    });

    res.status(201).json(trip);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   GET /api/trips/active
// @desc    Get user's current active trip
router.get('/active', protect, async (req, res) => {
  try {
    const activeTrip = await Trip.findOne({
      user: req.user._id,
      status: { $in: ['ACTIVE', 'SIGNAL_LOST', 'EMERGENCY'] },
    }).sort({ createdAt: -1 });

    res.json(activeTrip);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   POST /api/trips/:id/heartbeat
// @desc    Update heartbeat ping for active trip
router.post('/:id/heartbeat', protect, async (req, res) => {
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
      });
    }

    res.json({ success: true, lastHeartbeatAt: trip.lastHeartbeatAt, status: trip.status });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   PUT /api/trips/:id/complete
// @desc    Mark trip as completed safely
router.put('/:id/complete', protect, async (req, res) => {
  try {
    const trip = await Trip.findById(req.params.id);
    if (!trip) {
      return res.status(404).json({ message: 'Trip not found' });
    }

    trip.status = 'COMPLETED';
    trip.completedAt = new Date();
    await trip.save();

    // Mark location logs as completed safe trip
    await LocationLog.updateMany(
      { trip: trip._id },
      { isSafeTripCompleted: true }
    );

    res.json({ message: 'Trip completed safely', trip });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   POST /api/trips/:id/trigger-panic
// @desc    One-Tap Instant Panic Button
router.post('/:id/trigger-panic', protect, async (req, res) => {
  try {
    const trip = await Trip.findById(req.params.id);
    if (!trip) {
      return res.status(404).json({ message: 'Trip not found' });
    }

    trip.status = 'EMERGENCY';
    await trip.save();

    res.json({ message: 'CRITICAL EMERGENCY ALARM TRIGGERED', trip });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
