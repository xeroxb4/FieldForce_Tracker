import mongoose from 'mongoose';

const outletSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    createdBy: {
      type: String,
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    contactName: {
      type: String,
      default: '',
    },
    contactPhone: {
      type: String,
      default: '',
    },
    address: {
      type: String,
      default: '',
    },
    territory: {
      type: String,
      default: '',
    },
    distributor: {
      type: String,
      default: '',
    },
    location: {
      lat: { type: Number, required: true },
      lng: { type: Number, required: true },
    },
    // pending → approved / rejected
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
      index: true,
    },
    // Day of week assigned by admin: 1=Mon ... 5=Fri (6=Sat for merch)
    // Can be multiple days
    assignedDays: {
      type: [Number], // e.g. [1, 3, 5] = Mon, Wed, Fri
      default: [],
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User', // which OMR this outlet is assigned to
      index: true,
    },
    approvedBy: {
      type: String,
      default: '',
    },
    approvedAt: {
      type: Date,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    notes: {
      type: String,
      default: '',
    },
  },
  { timestamps: true }
);

outletSchema.index({ userId: 1, status: 1 });
outletSchema.index({ assignedTo: 1, status: 1 });

export default mongoose.model('Outlet', outletSchema);
