import mongoose, { Document, Schema } from "mongoose";
import bcrypt from "bcryptjs";

export type UserRole = "admin" | "doctor" | "reception" | "lab_staff" | "radiologist" | "nurse" | "housekeeping" | "pharmacist";

export const ALL_STAFF_ROLES: UserRole[] = ["doctor","reception","lab_staff","radiologist","nurse","housekeeping","pharmacist"];

export interface IUser extends Document {
  name:            string;
  email:           string;
  password:        string;
  pin:             string;
  role:            UserRole;
  comparePassword: (candidate: string) => Promise<boolean>;
  comparePin:      (candidate: string) => Promise<boolean>;
}

const UserSchema = new Schema<IUser>(
  {
    name:     { type: String, required: true, trim: true },
    email:    { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, default: "" },
    pin:      { type: String, default: "" },
    role:     { type: String, enum: ["admin","doctor","reception","lab_staff","radiologist","nurse","housekeeping","pharmacist"], required: true },
  },
  { timestamps: true },
);

UserSchema.pre("save", async function (next) {
  if (this.isModified("password") && this.password) {
    this.password = await bcrypt.hash(this.password, 12);
  }
  if (this.isModified("pin") && this.pin) {
    this.pin = await bcrypt.hash(this.pin, 10);
  }
  next();
});

UserSchema.methods.comparePassword = async function (candidate: string): Promise<boolean> {
  if (!this.password) return false;
  return bcrypt.compare(candidate, this.password);
};

UserSchema.methods.comparePin = async function (candidate: string): Promise<boolean> {
  if (!this.pin) return false;
  return bcrypt.compare(String(candidate), this.pin);
};

export default mongoose.model<IUser>("User", UserSchema);