import mongoose from 'mongoose';

const AVC_TARGETS = {
  Gold: 12500,
  Silver: 10000,
  Bronze: 5000,
};

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
    // Display name includes AVC tier when enrolled
    displayName: {
      type: String,
      default: '',
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
    // AVC Program
    avcEnrolled: {
      type: Boolean,
      default: false,
    },
    avcTier: {
      type: String,
      enum: ['', 'Gold', 'Silver', 'Bronze'],
      default: '',
    },
    avcTarget: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
      index: true,
    },
    assignedDays: {
      type: [Number],
      default: [],
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
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

// Auto-build displayName
outletSchema.pre('save', function (next) {
  if (this.avcEnrolled && this.avcTier) {
    this.displayName = `${this.name} - AVC (${this.avcTier})`;
    this.avcTarget = AVC_TARGETS[this.avcTier] || 0;
  } else {
    this.displayName = this.name;
    this.avcTier = '';
    this.avcTarget = 0;
  }
  next();
});

export default mongoose.model('Outlet', outletSchema);
export { AVC_TARGETS };
