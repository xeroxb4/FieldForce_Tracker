import mongoose from 'mongoose';

const lineItemSchema = new mongoose.Schema(
  {
    skuId: { type: mongoose.Schema.Types.ObjectId, ref: 'NiveaSKU' },
    productName: String,
    category: String,
    size: String,
    unit: {
      type: String,
      enum: ['pc', 'pack', 'carton'],
      default: 'pc',
    },
    quantity: { type: Number, default: 0 },
    unitPrice: { type: Number, default: 0 },
    lineTotal: { type: Number, default: 0 },
  },
  { _id: false }
);

const visitSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    repName: { type: String, required: true },
    date: { type: String, required: true, index: true },
    shopName: { type: String, required: true, trim: true },
    outletId: { type: mongoose.Schema.Types.ObjectId, ref: 'Outlet' },
    contactName: { type: String, default: '' },
    contactPhone: { type: String, default: '' },
    territory: { type: String, default: '' },
    distributor: { type: String, default: '' },
    outcome: {
      type: String,
      enum: [
        'Order Placed',
        'No Order',
        'Shop Closed',
        'Not Interested',
        'Follow Up',
        'Other',
      ],
      default: 'No Order',
    },
    // Reason when outcome is No Order
    noOrderReason: {
      type: String,
      default: '',
    },
    products: { type: String, default: '' },
    lineItems: [lineItemSchema],
    amount: { type: Number, default: 0 },
    // Payment
    paymentType: {
      type: String,
      enum: ['cash', 'credit', ''],
      default: '',
    },
    creditDurationWeeks: {
      type: Number, // 1 or 2
      default: null,
    },
    creditId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Credit',
    },
    notes: { type: String, default: '' },
    location: {
      lat: Number,
      lng: Number,
      accuracy: Number,
    },
    outletLocation: {
      lat: Number,
      lng: Number,
    },
    distanceMeters: { type: Number },
    syncedFromOffline: { type: Boolean, default: false },
  },
  { timestamps: true }
);

visitSchema.index({ userId: 1, date: 1 });

export default mongoose.model('Visit', visitSchema);
