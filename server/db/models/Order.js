import mongoose from 'mongoose';

const OrderSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true, index: true },
    bookingId: { type: String, required: true, index: true },
    userId: { type: String, required: true, index: true },
    seatId: { type: String, required: true },
    items: {
      type: [
        {
          itemId: { type: String, required: true },
          quantity: { type: Number, required: true },
        },
      ],
      required: true,
    },
    total: { type: Number, required: true },
    status: { type: String, required: true, index: true },
    createdAt: { type: Date, required: true, index: true },
  },
  { timestamps: false },
);

OrderSchema.index({ createdAt: -1 });

export const Order = mongoose.models.Order ?? mongoose.model('Order', OrderSchema);

