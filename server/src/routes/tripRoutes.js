import express from 'express';
import { protect, protectFromHeaderOrBody } from '../middleware/authMiddleware.js';
import {
  createTrip,
  getActiveTrip,
  sendHeartbeat,
  completeTrip,
  triggerPanic,
  deactivateAlarm,
  getUserTripHistory,
  handleBatteryCriticalEmergency,
  addCoordinateBatch,
} from '../controllers/tripController.js';

const router = express.Router();

router.post('/', protect, createTrip);
router.get('/active', protect, getActiveTrip);
router.get('/history', protect, getUserTripHistory);
router.post('/:id/heartbeat', protect, sendHeartbeat);
router.put('/:id/complete', protect, completeTrip);
router.post('/:id/trigger-panic', protect, triggerPanic);
router.post('/:id/deactivate-alarm', protect, deactivateAlarm);
// sendBeacon() cannot set an Authorization header, so this route accepts the JWT
// from the body instead (see protectFromHeaderOrBody).
router.post('/:id/battery-emergency', protectFromHeaderOrBody, handleBatteryCriticalEmergency);
router.post('/:id/coordinates/batch', protect, addCoordinateBatch);

export default router;
