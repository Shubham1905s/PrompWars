import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, index: true, lowercase: true, trim: true },
    password: { type: String, required: true },
    role: { type: String, required: true, enum: ['user', 'vendor', 'admin', 'delivery'] },
  },
  { timestamps: true },
);

export const User = mongoose.models.User ?? mongoose.model('User', UserSchema);

