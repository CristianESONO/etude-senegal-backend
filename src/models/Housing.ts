// src/models/Housing.ts
import mongoose, { Schema, Document } from 'mongoose';

export interface IHousing extends Document {
  title: string;
  description: string;
  type: 'studio' | 'colocation' | 'university';
  location: string;
  neighborhood: string;
  price: number;
  bedrooms: number;
  bathrooms: number;
  amenities: string[];
  images: string[]; // Stocke les URLs ou IDs des images
  imageIds: string[]; // Stocke les IDs GridFS des images
  isAvailable: boolean;
  contact: {
    name: string;
    phone: string;
    email: string;
  };
  features: {
    hasFurniture: boolean;
    hasInternet: boolean;
    hasKitchen: boolean;
  };
}

const HousingSchema = new Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  type: { type: String, required: true, enum: ['studio', 'colocation', 'university'] },
  location: { type: String, required: true },
  neighborhood: { type: String, required: true },
  price: { type: Number, required: true },
  bedrooms: { type: Number, required: true },
  bathrooms: { type: Number, required: true },
  amenities: [{ type: String }],
  images: [{ type: String }], // URLs des images
  imageIds: [{ type: String }], // IDs GridFS
  isAvailable: { type: Boolean, default: true },
  contact: {
    name: { type: String, required: true },
    phone: { type: String, required: true },
    email: { type: String, required: true }
  },
  features: {
    hasFurniture: { type: Boolean, default: false },
    hasInternet: { type: Boolean, default: false },
    hasKitchen: { type: Boolean, default: false }
  }
}, { timestamps: true });

export default mongoose.model<IHousing>('Housing', HousingSchema);