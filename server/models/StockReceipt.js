import mongoose from 'mongoose';

const lineSchema = new mongoose.Schema(
  {
    productName: { type: String, required: true },
    category: { type: String, default: '' },
    unit: { type: String, enum: ['PC', 'Pack', 'Carton'], default: 'PC' },
    quantity: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const stockReceiptSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    outletId: { type: mongoose.Schema.Types.ObjectId, ref: 'Outlet' },
    outletName: { type: String, required: true },
    date: { type: String, required: true }, // YYYY-MM-DD
    lines: { type: [lineSchema], default: [] },
    notes: { type: String, default: '' },
    location: {
      lat: Number,
      lng: Number,
    },
  },
  { timestamps: true }
);

stockReceiptSchema.index({ userId: 1, date: 1 });

export default mongoose.model('StockReceipt', stockReceiptSchema);
