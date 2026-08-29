import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import {
  registerUser,
  loginUser,
  getProfile,
  updateProfile,
  searchUsers,
  subscribePush,
  updateUserSafetyStatus,
} from '../controllers/authController.js';

const router = express.Router();

router.post('/register', registerUser);
router.post('/login', loginUser);
router.get('/me', protect, getProfile);
router.get('/search-users', protect, searchUsers);
router.put('/profile', protect, updateProfile);
router.post('/subscribe-push', protect, subscribePush);
router.post('/safety-status', protect, updateUserSafetyStatus);

export default router;
