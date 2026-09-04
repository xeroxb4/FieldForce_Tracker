import mongoose from 'mongoose';

const skuEntrySchema = new mongoose.Schema(
  {
    skuId: { type: mongoose.Schema.Types.ObjectId, ref: 'NiveaSKU' },
    skuName: String,
    category: String,
    available: { type: Boolean, default: true },
    facings: { type: Number, default: 0 },
    price: { type: Number, default: 0 },
    orderQty: { type: Number, default: 0 },
    notes: { type: String, default: '' },
  },
  { _id: false }
);

const sosRowSchema = new mongoose.Schema(
  {
    category: { type: String, required: true },
    numberOfBrands: { type: Number, default: 0 },
    totalCategoryFacings: { type: Number, default: 0 },
    niveaFacings: { type: Number, default: 0 },
    // Calculated
    sosPct: { type: Number, default: 0 },
    expectedSharePct: { type: Number, default: 0 },
    shelfAdvantage: { type: Number, default: 0 },
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
    merchandiserName: { type: String, required: true },
    date: { type: String, required: true, index: true },
    shopName: { type: String, required: true, trim: true },
    territory: { type: String, default: '' },
    distributor: { type: String, default: '' },
    visitType: {
      type: String,
      enum: ['Merchandising Visit', 'Store Audit', 'Planogram Check', 'Complete Audit', 'Other'],
      default: 'Merchandising Visit',
    },
    status: {
      type: String,
      enum: ['started', 'completed'],
      default: 'completed',
    },
    startedAt: { type: Date },
    skuEntries: [skuEntrySchema],
    // Share of Shelf rows
    sosRows: [sosRowSchema],
    // Photos as base64 data URLs (keep reasonable size on client)
    photos: [
      {
        url: String,
        caption: String,
        category: String,
        takenAt: Date,
      },
    ],
    overallNotes: { type: String, default: '' },
    location: {
      lat: Number,
      lng: Number,
    },
  },
  { timestamps: true }
);

merchVisitSchema.index({ userId: 1, date: 1 });

export default mongoose.model('MerchVisit', merchVisitSchema);

export const SOS_CATEGORIES = [
  'Roll-on',
  'Body Care',
  'Spray',
  'Shower',
  'Face Care',
  'Face Cleansing',
  'Men Care',
  'Lip Care',
];
