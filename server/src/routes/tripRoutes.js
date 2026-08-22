import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import {
  createTrip,
  getActiveTrip,
  sendHeartbeat,
  completeTrip,
  triggerPanic,
  deactivateAlarm,
  getUserTripHistory,
} from '../controllers/tripController.js';

const router = express.Router();

router.post('/', protect, createTrip);
router.get('/active', protect, getActiveTrip);
router.get('/history', protect, getUserTripHistory);
router.post('/:id/heartbeat', protect, sendHeartbeat);
router.put('/:id/complete', protect, completeTrip);
router.post('/:id/trigger-panic', protect, triggerPanic);
router.post('/:id/deactivate-alarm', protect, deactivateAlarm);

export default router;
