import mongoose from 'mongoose';

const skuEntrySchema = new mongoose.Schema(
  {
    skuId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'NiveaSKU',
      required: true,
    },
    skuName: String,
    category: String,
    available: {
      type: Boolean,
      default: true,
    },
    facings: {
      type: Number,
      default: 0,
    },
    price: {
      type: Number,
      default: 0,
    },
    orderQty: {
      type: Number,
      default: 0,
    },
    notes: {
      type: String,
      default: '',
    },
  },
  { _id: false }
);

const merchVisitSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    merchandiserName: {
      type: String,
      required: true,
    },
    date: {
      type: String, // YYYY-MM-DD
      required: true,
      index: true,
    },
    shopName: {
      type: String,
      required: true,
      trim: true,
    },
    territory: {
      type: String,
      default: '',
    },
    distributor: {
      type: String,
      default: '',
    },
    skuEntries: [skuEntrySchema],
    photos: [
      {
        url: String,
        caption: String,
      },
    ],
    overallNotes: {
      type: String,
      default: '',
    },
    location: {
      lat: Number,
      lng: Number,
    },
  },
  { timestamps: true }
);

merchVisitSchema.index({ userId: 1, date: 1 });

export default mongoose.model('MerchVisit', merchVisitSchema);
