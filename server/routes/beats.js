import express from 'express';
import { protect, restrictTo } from '../middleware/auth.js';
import { getTodayBeat, getBeat } from '../controllers/beatController.js';

const router = express.Router();

router.use(protect);
router.use(restrictTo('omr', 'merchandiser', 'admin'));

router.get('/today', getTodayBeat);
router.get('/', getBeat);

export default router;
