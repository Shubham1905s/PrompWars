import mongoose from 'mongoose';

const BookingSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true, index: true },
    holdId: { type: String },
    eventId: { type: String, required: true, index: true },
    seatIds: { type: [String], required: true },
    userId: { type: String, required: true, index: true },
    gate: { type: String, required: true },
    parkingZone: { type: String, required: true },
    status: { type: String, required: true },
    amount: { type: Number, required: true },
    createdAt: { type: Date, required: true, index: true },
  },
  { timestamps: false },
);

BookingSchema.index({ userId: 1, createdAt: -1 });

export const Booking = mongoose.models.Booking ?? mongoose.model('Booking', BookingSchema);

