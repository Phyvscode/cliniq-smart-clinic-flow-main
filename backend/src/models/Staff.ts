import mongoose, { Document, Schema } from "mongoose";

export interface IStaff extends Document {
  user: mongoose.Types.ObjectId;       // ref → User
  role: "doctor" | "reception" | "lab_staff" | "radiologist" | "nurse" | "housekeeping" | "pharmacist";
  dateOfBirth: Date;
  gender: "Male" | "Female" | "Other";
  address: string;
  photoUrl?: string;                   // saved file path
  documentUrl?: string;                // PDF file path
  // Professional
  specialization?: string;             // doctors only
  qualification?: string;
  licenseNumber?: string;
  // Work schedule
  availableDays: string[];
  timeStart: string;                   // "09:00"
  timeEnd: string;                     // "17:00"
  room?: string;
  department?: string;
}

const StaffSchema = new Schema<IStaff>(
  {
    user:           { type: Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    role:           { type: String, enum: ["doctor","reception","lab_staff","radiologist","nurse","housekeeping","pharmacist"], required: true },
    dateOfBirth:    { type: Date, required: true },
    gender:         { type: String, enum: ["Male", "Female", "Other"], required: true },
    address:        { type: String, default: "" },
    photoUrl:       { type: String },
    documentUrl:    { type: String },
    specialization: { type: String },
    qualification:  { type: String },
    licenseNumber:  { type: String },
    availableDays:  [{ type: String }],
    timeStart:      { type: String, default: "09:00" },
    timeEnd:        { type: String, default: "17:00" },
    room:           { type: String },
    department:     { type: String },
  },
  { timestamps: true }
);

export default mongoose.model<IStaff>("Staff", StaffSchema);