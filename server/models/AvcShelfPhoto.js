import mongoose from 'mongoose';

/**
 * OMR shelf / planogram photos for AVC outlets — twice per month.
 * period: 1 = days 1–15, 2 = days 16–end
 * Multiple shelf images allowed per outlet per period.
 */
const shelfImageSchema = new mongoose.Schema(
  {
    photo: { type: String, required: true },
    label: { type: String, default: '' }, // e.g. Shelf 1
    capturedAt: { type: Date, default: Date.now },
    location: {
      lat: Number,
      lng: Number,
    },
  },
  { _id: true }
);

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
    month: { type: Number, required: true, index: true },
    period: { type: Number, required: true, enum: [1, 2], index: true },
    /** @deprecated single photo — kept for old rows; prefer photos[] */
    photo: { type: String, default: '' },
    photos: { type: [shelfImageSchema], default: [] },
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

/** Normalise legacy single `photo` into photos[] */
avcShelfPhotoSchema.methods.normalizedPhotos = function normalizedPhotos() {
  const list = Array.isArray(this.photos) ? [...this.photos] : [];
  if ((!list || list.length === 0) && this.photo) {
    list.push({
      photo: this.photo,
      label: 'Shelf 1',
      capturedAt: this.capturedAt || this.createdAt,
      location: this.location,
    });
  }
  return list;
};

export default mongoose.model('AvcShelfPhoto', avcShelfPhotoSchema);
