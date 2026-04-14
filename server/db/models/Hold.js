import mongoose from 'mongoose';

const HoldSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true, index: true },
    eventId: { type: String, required: true, index: true },
    seatIds: { type: [String], required: true },
    userId: { type: String, required: true, index: true },
    expiresAt: { type: Date, required: true, index: true },
    createdAt: { type: Date, required: true },
  },
  { timestamps: false },
);

HoldSchema.index({ userId: 1, expiresAt: 1 });

export const Hold = mongoose.models.Hold ?? mongoose.model('Hold', HoldSchema);

