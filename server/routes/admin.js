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
  updateOutletFull,
  removeOutlet,
  getDashboardStats,
} from '../controllers/adminController.js';
import { setTarget } from '../controllers/targetController.js';
import {
  getPendingOutlets,
  approveOutlet,
  rejectOutlet,
} from '../controllers/outletController.js';
import { exportOmrXlsx, exportMerchXlsx } from '../controllers/exportController.js';

const router = express.Router();

router.use(protect);
router.use(restrictTo('admin'));

router.get('/dashboard', getDashboardStats);
router.get('/users', getUsers);
router.post('/users', createUser);
router.put('/users/:id', updateUser);

router.get('/reports/visits', getVisitsReport);
router.get('/reports/wrapups', getWrapUpsReport);
router.get('/reports/merch', getMerchReport);

router.get('/outlets', adminListOutlets);
router.post('/outlets', adminCreateOutlet);
router.put('/outlets/:id', updateOutletFull);
router.delete('/outlets/:id', removeOutlet);
router.patch('/outlets/:id/assign', adminAssignOutlet);
router.get('/outlets/pending', getPendingOutlets);
router.patch('/outlets/:id/approve', approveOutlet);
router.patch('/outlets/:id/reject', rejectOutlet);

router.get('/targets', listTargets);
router.post('/targets', setTarget);

router.get('/export/omr', exportOmrXlsx);
router.get('/export/merch', exportMerchXlsx);

export default router;
