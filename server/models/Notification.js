import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ['outlet_pending', 'outlet_approved', 'outlet_rejected', 'system'],
      default: 'system',
    },
    title: { type: String, required: true },
    message: { type: String, default: '' },
    outletId: { type: mongoose.Schema.Types.ObjectId, ref: 'Outlet' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    forRole: { type: String, default: 'admin' },
    read: { type: Boolean, default: false },
    meta: { type: Object, default: {} },
  },
  { timestamps: true }
);

notificationSchema.index({ forRole: 1, read: 1, createdAt: -1 });

export default mongoose.model('Notification', notificationSchema);
