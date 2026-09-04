import express from 'express';
import { protect, restrictTo } from '../middleware/auth.js';
import {
  getUsers,
  createUser,
  updateUser,
  getVisitsReport,
  getWrapUpsReport,
  getMerchReport,
  adminCreateOutlet,
  adminListOutlets,
  adminAssignOutlet,
  listTargets,
} from '../controllers/adminController.js';
import { setTarget } from '../controllers/targetController.js';
import {
  getPendingOutlets,
  approveOutlet,
  rejectOutlet,
} from '../controllers/outletController.js';

const router = express.Router();

router.use(protect);
router.use(restrictTo('admin'));

// Users / OMRs
router.get('/users', getUsers);
router.post('/users', createUser);
router.put('/users/:id', updateUser);

// Reports
router.get('/reports/visits', getVisitsReport);
router.get('/reports/wrapups', getWrapUpsReport);
router.get('/reports/merch', getMerchReport);

// Outlets
router.get('/outlets', adminListOutlets);
router.post('/outlets', adminCreateOutlet);
router.patch('/outlets/:id/assign', adminAssignOutlet);
router.get('/outlets/pending', getPendingOutlets);
router.patch('/outlets/:id/approve', approveOutlet);
router.patch('/outlets/:id/reject', rejectOutlet);

// Targets
router.get('/targets', listTargets);
router.post('/targets', setTarget);

export default router;
