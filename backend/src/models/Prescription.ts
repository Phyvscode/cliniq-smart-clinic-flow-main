import mongoose, { Document, Schema } from "mongoose";

interface PrescriptionMedicineDoc {
  medicine:          mongoose.Types.ObjectId;
  medicineName:      string;
  morning:           boolean;
  afternoon:         boolean;
  evening:           boolean;
  night:             boolean;
  durationDays:      number;
  instructions?:     string;
  frequencyInterval?: string | null;
  dosageAmount?:      number | null;
  dosageUnit?:        string | null;
}

export interface IVitals {
  bpSys?:  number;
  bpDia?:  number;
  pulse?:  number;
  temp?:   number;
  spo2?:   number;
  rr?:     number;
  height?: number;
  weight?: number;
  bmi?:    number;
}

export interface IPrescription extends Document {
  patient:        mongoose.Types.ObjectId;
  doctor:         mongoose.Types.ObjectId;
  doctorName:     string;
  complaints:     string[];   // patient complaints (was: problems)
  problems:       string[];   // kept for backward compat
  investigations: string[];   // tests advised
  diagnoses:      string[];   // diagnosis
  medicines:      PrescriptionMedicineDoc[];
  vitals?:        IVitals;
  notes?:         string;
  referral?:      { specialist: string; notes?: string } | null;
  labTests?:      { tests: string[]; notes?: string } | null;
  rxCode?:        string;
  date:           string;
  followUpDate?:  string | null;
}

const PrescriptionMedSchema = new Schema<PrescriptionMedicineDoc>(
  {
    medicine:          { type: Schema.Types.ObjectId, ref: "Medicine", required: true },
    medicineName:      { type: String, required: true },
    morning:           { type: Boolean, default: false },
    afternoon:         { type: Boolean, default: false },
    evening:           { type: Boolean, default: false },
    night:             { type: Boolean, default: false },
    durationDays:      { type: Number, required: true },
    instructions:      { type: String, default: "" },
    frequencyInterval: { type: String, default: null },
    dosageAmount:      { type: Number, default: null },
    dosageUnit:        { type: String, default: null },
  },
  { _id: false }
);

const PrescriptionSchema = new Schema<IPrescription>(
  {
    patient:        { type: Schema.Types.ObjectId, ref: "Patient",  required: true },
    doctor:         { type: Schema.Types.ObjectId, ref: "User",     required: true },
    doctorName:     { type: String, required: true },
    complaints:     [{ type: String }],
    problems:       [{ type: String }],   // backward compat
    investigations: [{ type: String }],
    diagnoses:      [{ type: String }],
    medicines:      [PrescriptionMedSchema],
    vitals: {
      bpSys:  { type: Number, default: null },
      bpDia:  { type: Number, default: null },
      pulse:  { type: Number, default: null },
      temp:   { type: Number, default: null },
      spo2:   { type: Number, default: null },
      rr:     { type: Number, default: null },
      height: { type: Number, default: null },
      weight: { type: Number, default: null },
      bmi:    { type: Number, default: null },
    },
    notes:          { type: String, default: "" },
    referral:       {
      specialist: { type: String },
      notes:      { type: String },
    },
    labTests: {
      tests: [{ type: String }],
      notes: { type: String },
    },
    rxCode: { type: String },
    date:   { type: String, required: true },
    followUpDate: { type: String, default: null },
  },
  { timestamps: true }
);

export default mongoose.model<IPrescription>("Prescription", PrescriptionSchema);