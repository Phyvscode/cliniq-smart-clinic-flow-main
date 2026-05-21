import jwt from "jsonwebtoken";
import { Types } from "mongoose";

export const generateToken = (id: Types.ObjectId | string): string => {
  return jwt.sign({ id: String(id) }, process.env.JWT_SECRET!, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  } as jwt.SignOptions);
};

// Returns today's date as "YYYY-MM-DD" (used for daily queue reset)
export const todayString = (): string =>
  new Date().toISOString().split("T")[0];