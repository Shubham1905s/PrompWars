import mongoose from 'mongoose';

const ZoneSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true },
    type: { type: String, required: true, index: true },
    area: { type: String, required: true },
    gate: { type: String, required: true },
    parkingZone: { type: String, required: true },
    occupancy: { type: Number, required: true },
    capacity: { type: Number, required: true },
    waitTime: { type: Number, required: true },
  },
  { timestamps: true },
);

export const Zone = mongoose.models.Zone ?? mongoose.model('Zone', ZoneSchema);

