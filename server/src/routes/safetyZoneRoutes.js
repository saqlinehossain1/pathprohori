import express from 'express';
import { authorize, protect } from '../middleware/authMiddleware.js';
import { createSafetyZone, getSafetyZones, updateSafetyZone } from '../controllers/safetyZoneController.js';

const router = express.Router();

router.get('/', protect, getSafetyZones);
router.post('/', protect, authorize('admin', 'operator'), createSafetyZone);
router.patch('/:id', protect, authorize('admin', 'operator'), updateSafetyZone);

export default router;
