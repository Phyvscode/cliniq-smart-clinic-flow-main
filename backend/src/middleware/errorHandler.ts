import { Request, Response, NextFunction } from "express";

export interface AppError extends Error {
  statusCode?: number;
}

export const errorHandler = (
  err: any,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  let statusCode = err.statusCode ?? 500;
  let message    = err.message || "Internal server error";

  // Mongoose validation errors → friendly messages
  if (err.name === "ValidationError" && err.errors) {
    statusCode = 400;
    const fields = Object.values(err.errors as Record<string, any>);
    const first  = fields[0] as any;
    if (first?.kind === "enum") {
      message = `Invalid value for "${first.path}". Please try again or contact support.`;
    } else {
      message = fields.map((e: any) => e.message).join(", ");
    }
  }

  // Mongoose duplicate key
  if (err.code === 11000) {
    statusCode = 409;
    const field = Object.keys(err.keyPattern || {})[0] || "field";
    message = field === "email"
      ? "A staff member with this email already exists."
      : `Duplicate value for ${field}. Please use a different value.`;
  }

  if (process.env.NODE_ENV === "development") {
    console.error("❌ Error:", err);
  }

  res.status(statusCode).json({ message });
};

// Wrapper so you don't need try/catch in every controller
export const asyncHandler =
  (fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) =>
  (req: Request, res: Response, next: NextFunction) =>
    fn(req, res, next).catch(next);