import express from 'express';
import {
    triggerEmergency,
    resolveEmergency,
    getEmergencies,
} from '../controllers/emergencyController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/', protect, getEmergencies);
router.post(
    '/trigger',
    protect,
    triggerEmergency
);
router.put(
    '/resolve',
    protect,
    resolveEmergency
);

export default router;