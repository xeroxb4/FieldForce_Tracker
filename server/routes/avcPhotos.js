import express from 'express';
import { protect, restrictTo } from '../middleware/auth.js';
import {
  getMyAvcPhotoTasks,
  uploadAvcPhoto,
  getAdminAvcGallery,
  deleteAvcPhoto,
} from '../controllers/avcPhotoController.js';

const router = express.Router();
router.use(protect);

router.get('/my-tasks', restrictTo('omr', 'admin'), getMyAvcPhotoTasks);
router.post('/submit', restrictTo('omr', 'admin'), uploadAvcPhoto);

// Admin gallery also available under /api/admin/avc-photos
router.get('/library', restrictTo('admin'), getAdminAvcGallery);
router.delete('/:id', restrictTo('admin'), deleteAvcPhoto);

export default router;
