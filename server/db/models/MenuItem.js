import mongoose from 'mongoose';

const MenuItemSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true },
    price: { type: Number, required: true },
    prepTime: { type: Number, required: true },
    category: { type: String, required: true, index: true },
  },
  { timestamps: true },
);

export const MenuItem = mongoose.models.MenuItem ?? mongoose.model('MenuItem', MenuItemSchema);

