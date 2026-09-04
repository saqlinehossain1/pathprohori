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
<<<<<<< Updated upstream
  addCoordinateBatch,
=======
  respondToSafetyCheck,
  getPublicTrackingData,
  updateSafetyStatus,
  uploadEvidencePhoto,
  uploadEvidenceAudio,
  getTripEvidence,
  updateEvidenceStatus,
>>>>>>> Stashed changes
} from '../controllers/tripController.js';

const router = express.Router();

router.post('/', protect, createTrip);
router.get('/active', protect, getActiveTrip);
router.get('/history', protect, getUserTripHistory);
router.post('/:id/heartbeat', protect, sendHeartbeat);
router.put('/:id/complete', protect, completeTrip);
router.post('/:id/trigger-panic', protect, triggerPanic);
router.post('/:id/deactivate-alarm', protect, deactivateAlarm);
<<<<<<< Updated upstream
=======

// Route Deviation & Unexpected Stop Detection: commuter confirms "I'm Safe" in response
// to an automatic safety check before it escalates to guardians.
router.post('/:id/safety-check/respond', protect, respondToSafetyCheck);

>>>>>>> Stashed changes
// sendBeacon() cannot set an Authorization header, so this route accepts the JWT
// from the body instead (see protectFromHeaderOrBody).
router.post('/:id/battery-emergency', protectFromHeaderOrBody, handleBatteryCriticalEmergency);

export default router;
