import { Schema, model, Document } from 'mongoose';

export interface IUserDocument extends Document {
  name                   : string;
  email                  : string;
  passwordHash           : string;
  role                   : 'attendee' | 'organizer' | 'staff' | 'admin';
  phone                 ?: string;
  avatar                ?: string;
  isActive               : boolean;
  emailVerified          : boolean;
  emailVerificationToken?: string;
  googleAccessToken     ?: string;
  googleRefreshToken    ?: string;
  createdAt              : Date;
  updatedAt              : Date;
}

const userSchema = new Schema<IUserDocument>(
  {
    name        : { type: String, required: true, trim: true },
    email       : { type: String, required: true, unique: true, lowercase: true },
    passwordHash: { type: String, required: true, select: false },
    role        : { 
      type   : String,
      enum   : ['attendee', 'organizer', 'staff', 'admin'],
      default: 'attendee'
    },
    phone                 : { type: String, default: null },
    avatar                : { type: String, default: null },
    isActive              : { type: Boolean, default: true },
    emailVerified         : { type: Boolean, default: false },
    emailVerificationToken: { type: String, select: false, default: null },
    googleAccessToken     : { type: String, select: false, default: null },
    googleRefreshToken    : { type: String, select: false, default: null },
  },
  { 
    timestamps: true,
    collection: 'users'
  }
);

userSchema.index({ email: 1 }, { name: 'idx_users_email', unique: true });

export const UserModel = model<IUserDocument>('User', userSchema);