import express from 'express';
import { protect, restrictTo } from '../middleware/auth.js';
import {
  getSKUs,
  createSKU,
  createMerchVisit,
  getMerchVisits,
  getSosCategories,
} from '../controllers/merchandiserController.js';

const router = express.Router();

router.use(protect);
router.use(restrictTo('merchandiser', 'admin'));

router.get('/skus', getSKUs);
router.post('/skus', createSKU);
router.get('/sos-categories', getSosCategories);
router.post('/visits', createMerchVisit);
router.get('/visits', getMerchVisits);

export default router;
