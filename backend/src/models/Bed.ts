import mongoose, { Document, Schema } from "mongoose";

export interface IBed extends Document {
  floor:       string;
  bedNumber:   string;
  status:      "available" | "occupied";
  patient?:    mongoose.Types.ObjectId;
  queueEntry?: mongoose.Types.ObjectId;
  occupiedAt?: Date;
  vacatedAt?:  Date;
}

const BedSchema = new Schema<IBed>(
  {
    floor:       { type: String, required: true, trim: true },
    bedNumber:   { type: String, required: true, trim: true },
    status:      { type: String, enum: ["available", "occupied"], default: "available" },
    patient:     { type: Schema.Types.ObjectId, ref: "Patient" },
    queueEntry:  { type: Schema.Types.ObjectId, ref: "Queue" },
    occupiedAt:  { type: Date },
    vacatedAt:   { type: Date },
  },
  { timestamps: true }
);

BedSchema.index({ floor: 1, bedNumber: 1 }, { unique: true });

export default mongoose.model<IBed>("Bed", BedSchema);
