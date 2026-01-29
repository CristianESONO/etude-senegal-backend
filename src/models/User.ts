import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: 'student' | 'admin' | 'landlord';
  phone?: string;
  nationality?: string;
  favorites: {
    establishments: mongoose.Types.ObjectId[];
    housing: mongoose.Types.ObjectId[];
  };
  isVerified: boolean;
}

const UserSchema = new Schema({
  email: { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, required: true },
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  role: { type: String, required: true, enum: ['student', 'admin', 'landlord'], default: 'student' },
  phone: { type: String },
  nationality: { type: String },
  favorites: {
    establishments: [{ type: Schema.Types.ObjectId, ref: 'Establishment' }],
    housing: [{ type: Schema.Types.ObjectId, ref: 'Housing' }]
  },
  isVerified: { type: Boolean, default: false }
}, { timestamps: true });

export default mongoose.model<IUser>('User', UserSchema);