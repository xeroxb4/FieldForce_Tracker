import express from 'express';
import { protect, restrictTo } from '../middleware/auth.js';
import {
  getMonthSummary,
  getDeferredSales,
  completeDeferredSale,
  startVisit,
  updateOutletGps,
  getProducts,
  getNoOrderReasons,
  createVisit,
  getTodayVisits,
  getVisits,
  createWrapUp,
  getWrapUps,
} from '../controllers/omrController.js';
import {
  getMyAvcPhotoTasks,
  uploadAvcPhoto,
} from '../controllers/avcPhotoController.js';

const router = express.Router();

router.use(protect);
router.use(restrictTo('omr', 'admin'));

router.post('/visits/start', startVisit);
router.patch('/outlets/:id/location', updateOutletGps);
router.get('/products', getProducts);
router.get('/no-order-reasons', getNoOrderReasons);
router.post('/visits', createVisit);
router.get('/deferred-sales', getDeferredSales);
router.post('/deferred-sales/complete', completeDeferredSale);
router.get('/visits/today', getTodayVisits);
router.get('/month-summary', getMonthSummary);
router.get('/avc-photos/tasks', getMyAvcPhotoTasks);
router.post('/avc-photos', uploadAvcPhoto);
router.get('/visits', getVisits);
router.post('/wrapups', createWrapUp);
router.get('/wrapups', getWrapUps);

export default router;
