import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import { uploadImage, deleteImage } from '../controllers/uploadController.js';

const router = express.Router();

router.post('/', protect, uploadImage);
router.post('/delete', protect, deleteImage);

export default router;
