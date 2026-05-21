import mongoose, { Document, Schema } from "mongoose";

export interface IMedicine extends Document {
  name:          string;
  type:          string;          // Tablet, Syrup, Injection, etc.
  category?:     string;
  manufacturer?: string;
  unit?:         string;          // tab, ml, mg, strip
  price?:        number;          // price per unit
  stock?:        number;
  createdBy?:    mongoose.Types.ObjectId;
}

const MedicineSchema = new Schema<IMedicine>(
  {
    name:         { type: String, required: true, trim: true, unique: true },
    type:         { type: String, default: "", trim: true },
    category:     { type: String, default: "" },
    manufacturer: { type: String, default: "" },
    unit:         { type: String, default: "" },
    price:        { type: Number, default: 0, min: 0 },
    stock:        { type: Number, default: 0, min: 0 },
    createdBy:    { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true },
);

export default mongoose.model<IMedicine>("Medicine", MedicineSchema);