import express from 'express';
import { protect, restrictTo } from '../middleware/auth.js';
import {
  createCredit,
  getCredits,
  collectCredit,
  getSummary,
} from '../controllers/creditController.js';

const router = express.Router();

router.use(protect);
router.use(restrictTo('omr', 'admin'));

router.post('/', createCredit);
router.get('/', getCredits);
router.get('/summary', getSummary);
router.patch('/:id/collect', collectCredit);

export default router;
