import express from 'express';
import { protect, restrictTo } from '../middleware/auth.js';
import {
  getSKUs,
  createSKU,
  createMerchVisit,
  getMerchVisits,
} from '../controllers/merchandiserController.js';

const router = express.Router();

router.use(protect);
router.use(restrictTo('merchandiser', 'admin'));

// SKUs
router.get('/skus', getSKUs);
router.post('/skus', createSKU);

// Visits
router.post('/visits', createMerchVisit);
router.get('/visits', getMerchVisits);

export default router;
