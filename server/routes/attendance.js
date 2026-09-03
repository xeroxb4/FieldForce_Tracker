import express from 'express';
import { protect } from '../middleware/auth.js';
import {
  checkIn,
  getTodayAttendance,
  getAttendanceHistory,
} from '../controllers/attendanceController.js';

const router = express.Router();

router.use(protect);

router.post('/check-in', checkIn);
router.get('/today', getTodayAttendance);
router.get('/history', getAttendanceHistory);

export default router;
