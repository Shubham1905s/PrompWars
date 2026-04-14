import mongoose from 'mongoose';

const NotificationSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true, index: true },
    userId: { type: String, required: true, index: true },
    message: { type: String, required: true },
    type: { type: String, required: true },
    createdAt: { type: Date, required: true, index: true },
  },
  { timestamps: false },
);

NotificationSchema.index({ userId: 1, createdAt: -1 });

export const Notification = mongoose.models.Notification ?? mongoose.model('Notification', NotificationSchema);

