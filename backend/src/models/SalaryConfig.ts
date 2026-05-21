import mongoose, { Document, Schema } from "mongoose";

export type SalaryType = "fixed" | "percentage" | "mixed";

export interface ISalaryConfig extends Document {
  doctor:           mongoose.Types.ObjectId;
  type:             SalaryType;
  fixedAmount?:     number;
  percentage?:      number;
  mixedFixed?:      number;
  consultationPct?: number;
  procedurePct?:    number;
  effectiveFrom:    string;
  notes?:           string;
}

// Do NOT use Schema<ISalaryConfig> — mongoose's schema field types
// don't line up perfectly with the document interface and TypeScript
// will complain. Pass the interface only to model<>() below.
const SalaryConfigSchema = new Schema(
  {
    doctor: {
      type:     Schema.Types.ObjectId,
      ref:      "User",
      required: true,
      unique:   true,
    },
    type: {
      type:     String,
      enum:     ["fixed", "percentage", "mixed"],
      required: true,
    },
    fixedAmount:     { type: Number, min: 0,   default: null },
    percentage:      { type: Number, min: 0,   max: 100, default: null },
    mixedFixed:      { type: Number, min: 0,   default: null },
    consultationPct: { type: Number, min: 0,   max: 100, default: null },
    procedurePct:    { type: Number, min: 0,   max: 100, default: null },
    effectiveFrom:   { type: String, required: true },
    notes:           { type: String, default:  "" },
  },
  { timestamps: true }
);

// ISalaryConfig generic goes here — this is where mongoose expects it
export default mongoose.model<ISalaryConfig>("SalaryConfig", SalaryConfigSchema);