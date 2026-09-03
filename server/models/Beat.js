import mongoose from 'mongoose';

const beatSchema = new mongoose.Schema(
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
      type: String, // YYYY-MM-DD
      required: true,
      index: true,
    },
    outlets: [
      {
        outletId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Outlet',
        },
        outletName: String,
        visited: {
          type: Boolean,
          default: false,
        },
        visitId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Visit',
        },
      },
    ],
    notes: {
      type: String,
      default: '',
    },
  },
  { timestamps: true }
);

// One beat plan per user per day
beatSchema.index({ userId: 1, date: 1 }, { unique: true });

export default mongoose.model('Beat', beatSchema);
