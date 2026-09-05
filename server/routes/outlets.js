import express from 'express';
import { protect, restrictTo } from '../middleware/auth.js';
import {
  createOutlet,
  getOutlets,
  getPendingOutlets,
  approveOutlet,
  rejectOutlet,
  updateOutlet,
} from '../controllers/outletController.js';

const router = express.Router();

router.use(protect);

// OMR, Merchandiser, Admin can create/list own outlets
router.post('/', restrictTo('omr', 'merchandiser', 'admin'), createOutlet);
router.get('/', restrictTo('omr', 'merchandiser', 'admin'), getOutlets);
router.put('/:id', restrictTo('omr', 'merchandiser', 'admin'), updateOutlet);

// Admin only
router.get('/pending', restrictTo('admin'), getPendingOutlets);
router.patch('/:id/approve', restrictTo('admin'), approveOutlet);
router.patch('/:id/reject', restrictTo('admin'), rejectOutlet);

export default router;
