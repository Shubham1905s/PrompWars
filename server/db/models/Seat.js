import mongoose from 'mongoose';

const SeatSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true, index: true },
    eventId: { type: String, required: true, index: true },
    sectionId: { type: String, required: true, index: true },
    sectionName: { type: String, required: true },
    row: { type: String, required: true },
    number: { type: Number, required: true },
    status: { type: String, required: true, enum: ['available', 'locked', 'booked'], index: true },
    price: { type: Number, required: true },
    gate: { type: String, required: true },
    parkingZone: { type: String, required: true },
    lockedBy: { type: String, default: null },
    holdExpiresAt: { type: Date, default: null },
  },
  { timestamps: true },
);

SeatSchema.index({ eventId: 1, sectionId: 1 });

export const Seat = mongoose.models.Seat ?? mongoose.model('Seat', SeatSchema);

