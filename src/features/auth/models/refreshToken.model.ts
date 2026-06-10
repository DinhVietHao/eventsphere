import { Schema, model, Document } from 'mongoose';

export interface IRefreshTokenDocument extends Document {
  userId     : Schema.Types.ObjectId;
  tokenHash  : string;
  deviceName?: string;
  ipAddress ?: string;
  expiresAt  : Date;
  createdAt  : Date;
}

const refreshTokenSchema = new Schema<IRefreshTokenDocument>(
  {
    userId    : { type: Schema.Types.ObjectId, ref: 'User', required: true },
    tokenHash : { type: String, required: true, unique: true },
    deviceName: { type: String, default: null },
    ipAddress : { type: String, default: null },
    expiresAt : { type: Date, required: true },
  },
  { 
    timestamps: { createdAt: true, updatedAt: false },
    collection: 'refresh_tokens'
  }
);

refreshTokenSchema.index({ tokenHash: 1 }, { name: 'idx_tokens_tokenHash', unique: true });
refreshTokenSchema.index({ userId: 1 }, { name: 'idx_tokens_userId' });
refreshTokenSchema.index({ expiresAt: 1 }, { name: 'idx_tokens_ttl', expireAfterSeconds: 0 });

export const RefreshTokenModel = model<IRefreshTokenDocument>('RefreshToken', refreshTokenSchema);