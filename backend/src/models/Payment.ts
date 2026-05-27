import mongoose, { Document, Schema } from "mongoose";

export interface IPayment extends Document {
  patient:      mongoose.Types.ObjectId;
  amount:       number;
  type?:        string;
  method?:      string;
  notes?:       string;
  queueEntry?:  mongoose.Types.ObjectId;
  doctor?:      mongoose.Types.ObjectId;
  date:         string;   // YYYY-MM-DD
}

const PaymentSchema = new Schema<IPayment>(
  {
    patient:    { type: Schema.Types.ObjectId, ref: "Patient", required: true },
    amount:     { type: Number, required: true, min: 0 },
    type:       { type: String, default: "consultation" },
    method:     { type: String, default: "cash" },
    notes:      { type: String, default: "" },
    queueEntry: { type: Schema.Types.ObjectId, ref: "Queue" },
    doctor:     { type: Schema.Types.ObjectId, ref: "User" },
    date:       { type: String, required: true },
  },
  { timestamps: true }
);

export default mongoose.model<IPayment>("Payment", PaymentSchema);