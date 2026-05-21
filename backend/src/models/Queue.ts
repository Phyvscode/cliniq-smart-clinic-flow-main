import mongoose, { Document, Schema } from "mongoose";

export type QueueStatus = "waiting" | "in-consultation" | "done";

export interface IQueue extends Document {
  patient:         mongoose.Types.ObjectId;
  assignedDoctor?: mongoose.Types.ObjectId;  // ← NEW: which doctor this patient is seeing
  queueNumber:     number;
  status:          QueueStatus;
  date:            string;
}

const QueueSchema = new Schema<IQueue>(
  {
    patient:         { type: Schema.Types.ObjectId, ref: "Patient", required: true },
    assignedDoctor:  { type: Schema.Types.ObjectId, ref: "User" },                 // ← NEW
    queueNumber:     { type: Number, required: true },
    status:          { type: String, enum: ["waiting", "in-consultation", "done"], default: "waiting" },
    date:            { type: String, required: true },
  },
  { timestamps: true }
);

export default mongoose.model<IQueue>("Queue", QueueSchema);