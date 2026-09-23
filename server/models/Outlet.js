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
    /** true after GPS was set while standing at the shop (create confirm or update pin) */
    locationVerified: {
      type: Boolean,
      default: false,
    },
    /** shop front photo (data URL or https URL) */
    photo: {
      type: String,
      default: '',
    },
    /** Mini-wholesaler | Sub-wholesaler — derived from monthly capacity */
    channelType: {
      type: String,
      enum: ['', 'Mini-wholesaler', 'Sub-wholesaler'],
      default: '',
    },
    /** e.g. under_10000, from_10000 */
    monthlyCapacityBand: {
      type: String,
      default: '',
    },
    /** numeric lower bound of selected band for rules */
    monthlyCapacityMin: {
      type: Number,
      default: 0,
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

// Auto-build displayName + channel from capacity when min provided
outletSchema.pre('save', function (next) {
  if (this.monthlyCapacityMin != null && this.monthlyCapacityMin !== undefined) {
    this.channelType =
      Number(this.monthlyCapacityMin) >= 10000 ? 'Sub-wholesaler' : 'Mini-wholesaler';
  }
  const parts = [this.name];
  if (this.avcEnrolled && this.avcTier) {
    parts[0] = `${this.name} - AVC (${this.avcTier})`;
    this.avcTarget = AVC_TARGETS[this.avcTier] || 0;
  } else {
    this.avcTier = this.avcEnrolled ? this.avcTier : '';
    if (!this.avcEnrolled) {
      this.avcTier = '';
      this.avcTarget = 0;
    }
  }
  if (this.channelType) parts.push(this.channelType);
  if (this.monthlyCapacityBand) {
    const bandLabel = {
      under_2000: 'Under 2,000',
      '2000_3999': '2,000–3,999',
      '4000_5999': '4,000–5,999',
      '6000_9999': '6,000–9,999',
      '10000_12499': '10,000–12,499',
      '12500_plus': '12,500+',
      under_10000: 'Under 10,000',
      from_10000: '10,000+',
    };
    parts.push(bandLabel[this.monthlyCapacityBand] || this.monthlyCapacityBand);
  }
  this.displayName = parts.filter(Boolean).join(' · ');
  if (this.avcEnrolled && this.avcTier && !String(this.displayName).includes('AVC')) {
    this.displayName = `${this.name} - AVC (${this.avcTier})` +
      (this.channelType ? ` · ${this.channelType}` : '');
  }
  next();
});

export default mongoose.model('Outlet', outletSchema);
export { AVC_TARGETS };
