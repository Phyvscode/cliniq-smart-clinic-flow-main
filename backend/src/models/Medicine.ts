import mongoose, { Document, Schema } from "mongoose";

export type MedicineCategory =
  | "Fever & Pain" | "Antibiotics" | "Allergy & Cold" | "Gastric"
  | "Vitamins" | "Diabetes" | "BP & Cardiac" | "Injections"
  | "Dermatology" | "ENT" | "Ophthalmology" | "Pulmonology"
  | "Pediatric" | "Gynecology" | "Psychiatry" | "General";

export interface IMedicine extends Document {
  name:       string;
  type:       string;
  category:   MedicineCategory;
  createdBy?: mongoose.Types.ObjectId;
}

const MedicineSchema = new Schema<IMedicine>(
  {
    name:      { type: String, required: true, trim: true, unique: true },
    type:      { type: String, required: true, trim: true },
    category:  { type: String, default: "General" },
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

export default mongoose.model<IMedicine>("Medicine", MedicineSchema);