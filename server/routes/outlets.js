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

// OMR + Admin
router.post('/', restrictTo('omr', 'admin'), createOutlet);
router.get('/', restrictTo('omr', 'admin'), getOutlets);
router.put('/:id', restrictTo('omr', 'admin'), updateOutlet);

// Admin only
router.get('/pending', restrictTo('admin'), getPendingOutlets);
router.patch('/:id/approve', restrictTo('admin'), approveOutlet);
router.patch('/:id/reject', restrictTo('admin'), rejectOutlet);

export default router;
