import express from 'express';
import { protect, restrictTo } from '../middleware/auth.js';
import {
  startVisit,
  getProducts,
  getNoOrderReasons,
  createVisit,
  getTodayVisits,
  getVisits,
  createWrapUp,
  getWrapUps,
} from '../controllers/omrController.js';

const router = express.Router();

router.use(protect);
router.use(restrictTo('omr', 'admin'));

router.post('/visits/start', startVisit);
router.get('/products', getProducts);
router.get('/no-order-reasons', getNoOrderReasons);
router.post('/visits', createVisit);
router.get('/visits/today', getTodayVisits);
router.get('/visits', getVisits);
router.post('/wrapups', createWrapUp);
router.get('/wrapups', getWrapUps);

export default router;
