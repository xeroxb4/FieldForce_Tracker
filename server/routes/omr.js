import express from 'express';
import { protect, restrictTo } from '../middleware/auth.js';
import {
  createVisit,
  getTodayVisits,
  getVisits,
  createWrapUp,
  getWrapUps,
} from '../controllers/omrController.js';

const router = express.Router();

router.use(protect);
router.use(restrictTo('omr', 'admin'));

// Visits
router.post('/visits', createVisit);
router.get('/visits/today', getTodayVisits);
router.get('/visits', getVisits);

// Wrap-ups
router.post('/wrapups', createWrapUp);
router.get('/wrapups', getWrapUps);

export default router;
