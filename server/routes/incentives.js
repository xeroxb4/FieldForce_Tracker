import express from 'express';
import { protect, restrictTo } from '../middleware/auth.js';
import { getIncentiveBreakdown } from '../controllers/incentiveController.js';

const router = express.Router();

router.use(protect);
router.use(restrictTo('omr', 'admin'));

router.get('/breakdown', getIncentiveBreakdown);

export default router;
