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
    plannedOutlets: {
      type: Number,
      default: 0,
      min: 0,
    },
    achievedAmount: {
      type: Number,
      default: 0,
    },
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

targetSchema.index({ userId: 1, month: 1 }, { unique: true });

export default mongoose.model('Target', targetSchema);
