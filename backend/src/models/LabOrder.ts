import mongoose, { Document, Schema } from "mongoose";

export type LabOrderStatus = "ordered" | "sample_collected" | "processing" | "report_ready";

export interface ILabOrder extends Document {
  patient:        mongoose.Types.ObjectId;
  doctor:         mongoose.Types.ObjectId;
  tests:          string[];
  status:         LabOrderStatus;
  feeCollected:   boolean;
  paymentMethod?: string;
  amount?:        number;
  reportBase64?:  string;
  reportFileName?:string;
  notes?:         string;
  date:           string;
}

const LabOrderSchema = new Schema<ILabOrder>(
  {
    patient:        { type: Schema.Types.ObjectId, ref: "Patient", required: true },
    doctor:         { type: Schema.Types.ObjectId, ref: "User",    required: true },
    tests:          [{ type: String }],
    status:         { type: String, enum: ["ordered","sample_collected","processing","report_ready"], default: "ordered" },
    feeCollected:   { type: Boolean, default: false },
    paymentMethod:  { type: String },
    amount:         { type: Number, default: 0 },
    reportBase64:   { type: String },
    reportFileName: { type: String },
    notes:          { type: String },
    date:           { type: String, required: true },
  },
  { timestamps: true }
);

export default mongoose.model<ILabOrder>("LabOrder", LabOrderSchema);
