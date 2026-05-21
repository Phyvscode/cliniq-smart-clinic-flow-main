import mongoose, { Document, Schema } from "mongoose";

export interface IPasswordReset extends Document {
  email:       string;
  otpHash:     string;        // bcrypt hash of the 6-digit OTP
  expiresAt:   Date;          // 20 minutes from creation
  used:        boolean;       // invalidated after first use
  ipAddress?:  string;
}

// Rate-limit tracker — separate collection
export interface IResetAttempt extends Document {
  email:      string;
  ipAddress:  string;
  attempts:   number;
  windowStart: Date;           // 1-hour rolling window
}

const PasswordResetSchema = new Schema<IPasswordReset>(
  {
    email:     { type: String, required: true, lowercase: true, trim: true },
    otpHash:   { type: String, required: true },
    expiresAt: { type: Date,   required: true },
    used:      { type: Boolean, default: false },
    ipAddress: { type: String },
  },
  { timestamps: true }
);

// Auto-delete documents 1 hour after expiry
PasswordResetSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 3600 });

const ResetAttemptSchema = new Schema<IResetAttempt>(
  {
    email:       { type: String, required: true, lowercase: true },
    ipAddress:   { type: String, required: true },
    attempts:    { type: Number, default: 1 },
    windowStart: { type: Date,   required: true },
  },
  { timestamps: true }
);

// Auto-delete rate-limit records after 2 hours
ResetAttemptSchema.index({ windowStart: 1 }, { expireAfterSeconds: 7200 });

export const PasswordReset = mongoose.model<IPasswordReset>("PasswordReset", PasswordResetSchema);
export const ResetAttempt  = mongoose.model<IResetAttempt>("ResetAttempt",  ResetAttemptSchema);