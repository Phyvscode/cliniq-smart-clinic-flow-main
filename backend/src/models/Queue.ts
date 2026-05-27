import mongoose, { Document, Schema } from "mongoose";

export type QueueStatus = "waiting" | "in-consultation" | "done";

export interface IQueue extends Document {
  patient:     mongoose.Types.ObjectId;
  queueNumber: number;
  status:      QueueStatus;
  date:        string;
  rxCode?:     string;
  doctor?:     mongoose.Types.ObjectId;
}

const QueueSchema = new Schema<IQueue>(
  {
    patient:     { type: Schema.Types.ObjectId, ref: "Patient", required: true },
    queueNumber: { type: Number, required: true },
    status:      { type: String, enum: ["waiting","in-consultation","done"], default: "waiting" },
    date:        { type: String, required: true },
    rxCode:      { type: String },
    doctor:      { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

export default mongoose.model<IQueue>("Queue", QueueSchema);