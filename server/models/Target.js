import mongoose from 'mongoose';

const targetSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    repName: {
      type: String,
      required: true,
    },
    // Format: "2026-09" (year-month)
    month: {
      type: String,
      required: true,
      index: true,
    },
    targetAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    achievedAmount: {
      type: Number,
      default: 0,
    },
    // Percentage 0–100
    percentage: {
      type: Number,
      default: 0,
    },
    setBy: {
      type: String,
      default: 'admin',
    },
  },
  { timestamps: true }
);

// One target per user per month
targetSchema.index({ userId: 1, month: 1 }, { unique: true });

export default mongoose.model('Target', targetSchema);
