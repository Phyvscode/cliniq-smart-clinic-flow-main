import mongoose, { Document, Schema } from "mongoose";

export type StaffRole =
  | "doctor" | "reception" | "lab_staff"
  | "radiologist" | "nurse" | "housekeeping" | "pharmacist";

export interface IStaff extends Document {
  user:            mongoose.Types.ObjectId;
  role:            StaffRole;
  dateOfBirth:     Date;
  gender:          "Male" | "Female" | "Other";
  address:         string;
  photoUrl?:       string;
  documentUrl?:    string;
  signatureUrl?:   string;
  specialization?: string;
  qualification?:  string;
  licenseNumber?:  string;
  availableDays:   string[];
  timeStart:       string;
  timeEnd:         string;
  room?:           string;
  department?:     string;
  consultationFee: number;
}

const ALL_STAFF_ROLES = [
  "doctor","reception","lab_staff","radiologist","nurse","housekeeping","pharmacist"
];

const StaffSchema = new Schema<IStaff>(
  {
    user:            { type: Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    role:            { type: String, enum: ALL_STAFF_ROLES, required: true },
    dateOfBirth:     { type: Date,   required: true },
    gender:          { type: String, enum: ["Male","Female","Other"], required: true },
    address:         { type: String, default: "" },
    photoUrl:        { type: String },
    documentUrl:     { type: String },
    signatureUrl:    { type: String },
    specialization:  { type: String },
    qualification:   { type: String },
    licenseNumber:   { type: String },
    availableDays:   [{ type: String }],
    timeStart:       { type: String, default: "09:00" },
    timeEnd:         { type: String, default: "17:00" },
    room:            { type: String },
    department:      { type: String },
    consultationFee: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export default mongoose.model<IStaff>("Staff", StaffSchema);