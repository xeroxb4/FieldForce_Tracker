import mongoose from 'mongoose';

/**
 * OMR shelf / planogram photos for AVC outlets — twice per month.
 * period: 1 = days 1–15, 2 = days 16–end
 */
const avcShelfPhotoSchema = new mongoose.Schema(
  {
    outletId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Outlet',
      required: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    shopName: { type: String, default: '' },
    distributor: { type: String, default: '', index: true },
    avcTier: {
      type: String,
      enum: ['Gold', 'Silver', 'Bronze', ''],
      default: '',
      index: true,
    },
    year: { type: Number, required: true, index: true },
    month: { type: Number, required: true, index: true }, // 1-12
    period: { type: Number, required: true, enum: [1, 2], index: true },
    photo: { type: String, required: true }, // data URL or https
    notes: { type: String, default: '' },
    capturedAt: { type: Date, default: Date.now },
    location: {
      lat: Number,
      lng: Number,
    },
  },
  { timestamps: true }
);

avcShelfPhotoSchema.index(
  { outletId: 1, year: 1, month: 1, period: 1 },
  { unique: true }
);

export default mongoose.model('AvcShelfPhoto', avcShelfPhotoSchema);
