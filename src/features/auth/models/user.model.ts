import { Schema, model, Document, Types } from 'mongoose';

export interface IUser extends Document {
  name                     : string;
  email                    : string;
  passwordHash             : string;
  role                     : 'attendee' | 'organizer' | 'staff' | 'admin';
  phone                   ?: string;
  avatar                  ?: string;
  isActive                 : boolean;
  lockedReason            ?: string | null;
  lockedAt                ?: Date | null;
  lockedBy                ?: Types.ObjectId | IUser | null;
  unlockedAt              ?: Date | null;
  unlockedBy              ?: Types.ObjectId | IUser | null;
  emailVerified            : boolean;
  emailVerificationToken  ?: string;
  emailVerificationExpires?: Date | null;
  passwordResetToken      ?: string;
  passwordResetExpires    ?: Date | null;
  googleAccessToken       ?: string;
  googleRefreshToken      ?: string;
  createdAt                : Date;
  updatedAt                : Date;
}

const userSchema = new Schema<IUser>(
  {
    name        : { type: String, required: true, trim: true },
    email       : { type: String, required: true, unique: true, lowercase: true },
    passwordHash: { type: String, required: true, select: false },
    role        : { 
      type   : String,
      enum   : ['attendee', 'organizer', 'staff', 'admin'],
      default: 'attendee'
    },
    phone                   : { type: String, default: null },
    avatar                  : { type: String, default: null },
    isActive                : { type: Boolean, default: true },
    lockedReason            : { type: String, default: null, trim: true },
    lockedAt                : { type: Date, default: null },
    lockedBy                : { type: Schema.Types.ObjectId, ref: 'User', default: null },
    unlockedAt              : { type: Date, default: null },
    unlockedBy              : { type: Schema.Types.ObjectId, ref: 'User', default: null },
    emailVerified           : { type: Boolean, default: false },
    emailVerificationToken  : { type: String, select: false, default: null },
    emailVerificationExpires: { type: Date, select: false, default: null },
    passwordResetToken      : { type: String, select: false, default: null },
    passwordResetExpires    : { type: Date, select: false, default: null },
    googleAccessToken       : { type: String, select: false, default: null },
    googleRefreshToken      : { type: String, select: false, default: null },
  },
  { 
    timestamps: true,
    collection: 'users'
  }
);

userSchema.index({ email: 1 }, { name: 'idx_users_email', unique: true });

export const User = model<IUser>('User', userSchema);
