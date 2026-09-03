import mongoose from 'mongoose';

const niveaSKUSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    skuCode: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    category: {
      type: String,
      enum: ['Roll-on', 'Spray', 'Lotion', 'Shower Gel', 'Other'],
      required: true,
      index: true,
    },
    size: {
      type: String,
      default: '',
    },
    barcode: {
      type: String,
      default: '',
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

export default mongoose.model('NiveaSKU', niveaSKUSchema);
