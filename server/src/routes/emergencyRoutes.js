import express from 'express';
import {
    triggerEmergency,
    resolveEmergency,
    getEmergencies,
    resolveMonitoredEmergency,
    uploadEmergencyPhoto,
    uploadEmergencyAudio,
    getEmergencyEvidence,
    updateEvidenceStatus,
} from '../controllers/emergencyController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// Emergency Alert Endpoints
router.get('/', protect, getEmergencies);
router.post('/trigger', protect, triggerEmergency);
router.put('/resolve', protect, resolveEmergency);
router.put('/:id/resolve', protect, resolveMonitoredEmergency);

// Low-Bandwidth Evidence Locker Endpoints
router.post('/:id/evidence/photo', protect, uploadEmergencyPhoto);
router.post('/:id/evidence/audio', protect, uploadEmergencyAudio);
router.get('/:id/evidence', protect, getEmergencyEvidence);
router.put('/:id/evidence/status', protect, updateEvidenceStatus);

export default router; 