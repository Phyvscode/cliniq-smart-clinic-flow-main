import mongoose, { Document, Schema } from "mongoose";

export interface IPatient extends Document {
  name:                 string;
  dateOfBirth:          Date;
  age:                  number;
  gender:               "Male" | "Female" | "Other";
  phone:                string;
  email?:               string;
  address?:             string;
  pinCode?:             string;
  bloodGroup?:          string;
  relativeName?:        string;
  relativeRelationship?:string;
  relativePhone?:       string;
  govIdType?:           string;
  govIdNumber?:         string;
  visitType?:           "OPD" | "IPD" | "Emergency";
  department?:          string;
  doctorAssigned?:      string;
  appointmentType?:     "New" | "Follow-up";
  allergies?:           string;
  chronicConditions?:   string;
  currentMedications?:  string;
  severity?:            "Normal" | "Urgent" | "Critical";
  insuranceProvider?:   string;
  policyNumber?:        string;
  insuranceType?:       "Cashless" | "Reimbursement";
  occupation?:          string;
  maritalStatus?:       string;
  referredBy?:          "Doctor" | "Online" | "Walk-in" | "";
  consentGiven?:        boolean;
  registeredBy?:        mongoose.Types.ObjectId;
  permanentCode?:       string;  // unique 6-digit lifetime code
}

const PatientSchema = new Schema<IPatient>(
  {
    name:                  { type: String, required: true, trim: true },
    dateOfBirth:           { type: Date, required: true },
    gender:                { type: String, enum: ["Male","Female","Other"], required: true },
    phone:                 { type: String, required: true },
    email:                 { type: String },
    address:               { type: String },
    pinCode:               { type: String },
    bloodGroup:            { type: String },
    relativeName:          { type: String },
    relativeRelationship:  { type: String },
    relativePhone:         { type: String },
    govIdType:             { type: String },
    govIdNumber:           { type: String },
    visitType:             { type: String, enum: ["OPD","IPD","Emergency"] },
    department:            { type: String },
    doctorAssigned:        { type: String },
    appointmentType:       { type: String, enum: ["New","Follow-up"] },
    allergies:             { type: String },
    chronicConditions:     { type: String },
    currentMedications:    { type: String },
    severity:              { type: String, enum: ["Normal","Urgent","Critical"] },
    insuranceProvider:     { type: String },
    policyNumber:          { type: String },
    insuranceType:         { type: String, enum: ["Cashless","Reimbursement"] },
    occupation:            { type: String },
    maritalStatus:         { type: String },
    referredBy:            { type: String, enum: ["Doctor","Online","Walk-in",""] },
    consentGiven:          { type: Boolean, default: false },
    registeredBy:          { type: Schema.Types.ObjectId, ref: "User" },
    permanentCode:         { type: String, unique: true, sparse: true },
  },
  {
    timestamps: true,
    toJSON:     { virtuals: true },
    toObject:   { virtuals: true },
  },
);

// Virtual age calculated from dateOfBirth
PatientSchema.virtual("age").get(function () {
  const dob  = this.dateOfBirth;
  if (!dob) return 0;
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const m = today.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--;
  return age;
});

export default mongoose.model<IPatient>("Patient", PatientSchema);