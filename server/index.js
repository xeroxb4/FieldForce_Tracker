import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import authRoutes from './routes/auth.js';
import omrRoutes from './routes/omr.js';
import merchRoutes from './routes/merchandiser.js';
import adminRoutes from './routes/admin.js';
import attendanceRoutes from './routes/attendance.js';
import outletRoutes from './routes/outlets.js';
import beatRoutes from './routes/beats.js';
import creditRoutes from './routes/credits.js';
import targetRoutes from './routes/targets.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5100;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/omr', omrRoutes);
app.use('/api/merchandiser', merchRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/outlets', outletRoutes);
app.use('/api/beats', beatRoutes);
app.use('/api/credits', creditRoutes);
app.use('/api/targets', targetRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'FieldForce Tracker API is running' });
});

// Connect to MongoDB
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('✅ Connected to MongoDB Atlas');
    app.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error('❌ MongoDB connection error:', err.message);
    process.exit(1);
  });
