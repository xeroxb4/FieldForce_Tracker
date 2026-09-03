import mongoose from 'mongoose';

const creditSchema = new mongoose.Schema(
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
    outletId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Outlet',
    },
    customerName: {
      type: String,
      required: true,
      trim: true,
    },
    shopName: {
      type: String,
      default: '',
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    amountPaid: {
      type: Number,
      default: 0,
    },
    balance: {
      type: Number,
      required: true,
    },
    dueDate: {
      type: String, // YYYY-MM-DD
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['pending', 'partial', 'collected', 'overdue'],
      default: 'pending',
      index: true,
    },
    saleDate: {
      type: String, // date of original sale
      default: '',
    },
    collectedAt: {
      type: Date,
    },
    notes: {
      type: String,
      default: '',
    },
  },
  { timestamps: true }
);

creditSchema.index({ userId: 1, status: 1 });

export default mongoose.model('Credit', creditSchema);
