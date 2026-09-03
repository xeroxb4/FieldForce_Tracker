import express from 'express';
import { protect, restrictTo } from '../middleware/auth.js';
import { getMyTarget, setTarget } from '../controllers/targetController.js';

const router = express.Router();

router.use(protect);

router.get('/me', getMyTarget);
router.post('/', restrictTo('omr', 'admin'), setTarget);

export default router;
