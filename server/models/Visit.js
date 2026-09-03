import mongoose from 'mongoose';

const visitSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    repName: {
      type: String,
      required: true,
    },
    date: {
      type: String, // YYYY-MM-DD format for easy querying
      required: true,
      index: true,
    },
    shopName: {
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
    territory: {
      type: String,
      default: '',
    },
    distributor: {
      type: String,
      default: '',
    },
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
    products: {
      type: String,
      default: '',
    },
    amount: {
      type: Number,
      default: 0,
    },
    notes: {
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

// Compound index for fast "today's visits by rep"
visitSchema.index({ userId: 1, date: 1 });

export default mongoose.model('Visit', visitSchema);
