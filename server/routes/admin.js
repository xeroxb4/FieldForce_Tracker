import express from 'express';
import { protect, restrictTo } from '../middleware/auth.js';
import {
  getUsers,
  createUser,
  updateUser,
  getVisitsReport,
  getWrapUpsReport,
  getMerchReport,
  adminCreateOutlet,
  adminListOutlets,
  adminAssignOutlet,
  listTargets,
  updateOutletFull,
  removeOutlet,
  getDashboardStats,
  deactivateUser,
  getUnvisitedToday,
  getOutletSalesHistory,
  deleteVisit,
  updateVisit,
  adminCreateSale,
  adminListOmrOutlets,
} from '../controllers/adminController.js';
import { setTarget } from '../controllers/targetController.js';
import {
  getPendingOutlets,
  approveOutlet,
  rejectOutlet,
} from '../controllers/outletController.js';
import { exportOmrXlsx, exportMerchXlsx, exportProductivityXlsx } from '../controllers/exportController.js';
import {
  getAdminAvcGallery,
  deleteAvcPhoto,
} from '../controllers/avcPhotoController.js';
import {
  listProducts,
  createProduct,
  updateProduct,
  removeProduct,
} from '../controllers/productController.js';
import {
  listNotifications,
  markRead,
  markAllRead,
} from '../controllers/notificationController.js';

const router = express.Router();

router.use(protect);
router.use(restrictTo('admin'));

router.get('/dashboard', getDashboardStats);
router.get('/unvisited-today', getUnvisitedToday);
router.get('/outlet-sales-history', getOutletSalesHistory);
router.delete('/visits/:id', deleteVisit);
router.post('/sales', adminCreateSale);
router.get('/omr-outlets', adminListOmrOutlets);
router.put('/visits/:id', updateVisit);
router.get('/export/productivity', exportProductivityXlsx);
router.get('/users', getUsers);
router.post('/users', createUser);
router.put('/users/:id', updateUser);
router.delete('/users/:id', deactivateUser);

router.get('/reports/visits', getVisitsReport);
router.get('/reports/wrapups', getWrapUpsReport);
router.get('/reports/merch', getMerchReport);

router.get('/outlets', adminListOutlets);
router.post('/outlets', adminCreateOutlet);
router.put('/outlets/:id', updateOutletFull);
router.delete('/outlets/:id', removeOutlet);
router.patch('/outlets/:id/assign', adminAssignOutlet);
router.get('/outlets/pending', getPendingOutlets);
router.patch('/outlets/:id/approve', approveOutlet);
router.patch('/outlets/:id/reject', rejectOutlet);

router.get('/targets', listTargets);
router.post('/targets', setTarget);

router.get('/products', listProducts);
router.post('/products', createProduct);
router.put('/products/:id', updateProduct);
router.delete('/products/:id', removeProduct);

router.get('/notifications', listNotifications);
router.put('/notifications/read-all', markAllRead);
router.put('/notifications/:id/read', markRead);

router.get('/export/omr', exportOmrXlsx);
router.get('/avc-photos', getAdminAvcGallery);
router.delete('/avc-photos/:id', deleteAvcPhoto);
router.get('/export/merch', exportMerchXlsx);

export default router;
