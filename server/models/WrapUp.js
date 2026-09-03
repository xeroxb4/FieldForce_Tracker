import mongoose from 'mongoose';

const wrapUpSchema = new mongoose.Schema(
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
    date: {
      type: String, // YYYY-MM-DD
      required: true,
      index: true,
    },
    territory: {
      type: String,
      default: '',
    },
    distributor: {
      type: String,
      default: '',
    },
    shopsPlanned: {
      type: Number,
      default: 0,
    },
    shopsVisited: {
      type: Number,
      default: 0,
    },
    shopNames: {
      type: [String],
      default: [],
    },
    ordersCount: {
      type: Number,
      default: 0,
    },
    totalAmount: {
      type: Number,
      default: 0,
    },
    notes: {
      type: String,
      default: '',
    },
  },
  { timestamps: true }
);

// One wrap-up per user per day
wrapUpSchema.index({ userId: 1, date: 1 }, { unique: true });

export default mongoose.model('WrapUp', wrapUpSchema);
