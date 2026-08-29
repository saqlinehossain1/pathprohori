import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import { getNotifications, markNotificationRead, resolveNotification } from '../controllers/notificationController.js';

const router = express.Router();

router.get('/', protect, getNotifications);
router.patch('/:id/read', protect, markNotificationRead);
router.patch('/:id/resolve', protect, resolveNotification);

export default router;
