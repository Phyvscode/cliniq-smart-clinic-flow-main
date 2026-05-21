import mongoose, { Document, Schema } from "mongoose";

export type PaymentType = "consultation" | "procedure" | "follow-up" | "emergency" | "other";
export type PaymentMethod = "cash" | "card" | "upi" | "insurance" | "other";

export interface IPayment extends Document {
  patient:       mongoose.Types.ObjectId;
  doctor?:       mongoose.Types.ObjectId;   // set when prescription is saved
  queueEntry?:   mongoose.Types.ObjectId;
  amount:        number;                    // in ₹
  type:          PaymentType;
  method:        PaymentMethod;
  notes?:        string;
  date:          string;                    // "YYYY-MM-DD"
  collectedBy:   mongoose.Types.ObjectId;   // receptionist userId
}

const PaymentSchema = new Schema<IPayment>(
  {
    patient:     { type: Schema.Types.ObjectId, ref: "Patient",  required: true },
    doctor:      { type: Schema.Types.ObjectId, ref: "User" },
    queueEntry:  { type: Schema.Types.ObjectId, ref: "Queue" },
    amount:      { type: Number, required: true, min: 0 },
    type:        { type: String, enum: ["consultation","procedure","follow-up","emergency","other"], default: "consultation" },
    method:      { type: String, enum: ["cash","card","upi","insurance","other"], default: "cash" },
    notes:       { type: String, default: "" },
    date:        { type: String, required: true },          // YYYY-MM-DD
    collectedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

// Indexes for fast revenue queries
PaymentSchema.index({ date: 1 });
PaymentSchema.index({ doctor: 1, date: 1 });

export default mongoose.model<IPayment>("Payment", PaymentSchema);