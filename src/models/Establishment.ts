import mongoose, { Schema, Document } from 'mongoose';

export interface IEstablishment extends Document {
  name: string;
  type: 'university' | 'school' | 'institute';
  location: string;
  description: string;
  studentsCount: number;
  rating: number;
  programs: string[];
  images: string[];
  isCAMESRecognized: boolean;
  contact: {
    email: string;
    phone: string;
    website?: string;
  };
  coordinates?: {
    lat: number;
    lng: number;
  };
}

const EstablishmentSchema = new Schema({
  name: { type: String, required: true, unique: true },
  type: { type: String, required: true, enum: ['university', 'school', 'institute'] },
  location: { type: String, required: true },
  description: { type: String, required: true },
  studentsCount: { type: Number, default: 0 },
  rating: { type: Number, min: 0, max: 5, default: 0 },
  programs: [{ type: String }],
  images: [{ type: String }],
  isCAMESRecognized: { type: Boolean, default: false },
  contact: {
    email: { type: String, required: true },
    phone: { type: String, required: true },
    website: { type: String }
  },
  coordinates: {
    lat: { type: Number },
    lng: { type: Number }
  }
}, { timestamps: true });

export default mongoose.model<IEstablishment>('Establishment', EstablishmentSchema);