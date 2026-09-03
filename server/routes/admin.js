import express from 'express';
import { protect, restrictTo } from '../middleware/auth.js';
import {
  getUsers,
  getVisitsReport,
  getWrapUpsReport,
  getMerchReport,
} from '../controllers/adminController.js';

const router = express.Router();

router.use(protect);
router.use(restrictTo('admin'));

router.get('/users', getUsers);
router.get('/reports/visits', getVisitsReport);
router.get('/reports/wrapups', getWrapUpsReport);
router.get('/reports/merch', getMerchReport);

export default router;
