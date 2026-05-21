import mongoose, { Document, Schema } from "mongoose";

interface PrescriptionMedicineDoc {
  medicine:           mongoose.Types.ObjectId;
  dosageAmount?:      number;
  dosageUnit?:        string;
  morning:            boolean;
  afternoon:          boolean;
  evening:            boolean;
  night:              boolean;
  frequencyInterval?: string;
  durationDays:       number;
  instructions?:      string;
}

export interface IPrescription extends Document {
  patient:             mongoose.Types.ObjectId;
  doctor:              mongoose.Types.ObjectId;
  queueEntry?:         mongoose.Types.ObjectId;
  rxCode:              string;   // YYYYMMDDNNN — unique per visit
  diagnosis?:          string;
  problems:            string[];
  medicines:           PrescriptionMedicineDoc[];
  notes?:              string;
  referral?:           { needed: boolean; specialist?: string; reason?: string };
  labTests?:           { category: string; name: string }[];
  collectedByPharmacy: boolean;
  collectedAt?:        Date;
  collectedBy?:        mongoose.Types.ObjectId;
  paymentMethod?:      string;
}

const PrescriptionMedSchema = new Schema<PrescriptionMedicineDoc>(
  {
    medicine:          { type: Schema.Types.ObjectId, ref: "Medicine", required: true },
    dosageAmount:      { type: Number },
    dosageUnit:        { type: String },
    morning:           { type: Boolean, default: false },
    afternoon:         { type: Boolean, default: false },
    evening:           { type: Boolean, default: false },
    night:             { type: Boolean, default: false },
    frequencyInterval: { type: String },
    durationDays:      { type: Number, required: true },
    instructions:      { type: String },
  },
  { _id: false },
);

const PrescriptionSchema = new Schema<IPrescription>(
  {
    patient:    { type: Schema.Types.ObjectId, ref: "Patient",  required: true },
    doctor:     { type: Schema.Types.ObjectId, ref: "User",     required: true },
    queueEntry: { type: Schema.Types.ObjectId, ref: "Queue" },
    rxCode:     { type: String, unique: true, sparse: true },
    diagnosis:  { type: String, default: "" },
    problems:   [{ type: String }],
    medicines:  [PrescriptionMedSchema],
    notes:      { type: String },
    referral: {
      type: new Schema({ needed: Boolean, specialist: String, reason: String }),
      default: null,
    },
    labTests: {
      type: [new Schema({ category: String, name: String }, { _id: false })],
      default: [],
    },
    collectedByPharmacy: { type: Boolean, default: false },
    collectedAt:         { type: Date },
    collectedBy:         { type: Schema.Types.ObjectId, ref: "User" },
    paymentMethod:       { type: String },
  },
  { timestamps: true },
);

export default mongoose.model<IPrescription>("Prescription", PrescriptionSchema);