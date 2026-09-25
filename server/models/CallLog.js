import mongoose from 'mongoose';

const callLogSchema = new mongoose.Schema(
  {
    initiatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    initiatorName: { type: String, default: '' },
    direction: { type: String, enum: ['outbound', 'inbound'], default: 'outbound' },
    channel: {
      type: String,
      enum: ['voip', 'tel', 'whatsapp', 'webrtc-team'],
      default: 'voip',
    },
    toNumber: { type: String, default: '' },
    toName: { type: String, default: '' },
    toUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    outletId: { type: mongoose.Schema.Types.ObjectId, ref: 'Outlet' },
    status: {
      type: String,
      enum: ['initiated', 'ringing', 'in-progress', 'completed', 'failed', 'busy', 'no-answer', 'canceled'],
      default: 'initiated',
    },
    durationSec: { type: Number, default: 0 },
    twilioCallSid: { type: String, default: '' },
    notes: { type: String, default: '' },
  },
  { timestamps: true }
);

callLogSchema.index({ initiatedBy: 1, createdAt: -1 });
callLogSchema.index({ toNumber: 1, createdAt: -1 });

export default mongoose.model('CallLog', callLogSchema);
