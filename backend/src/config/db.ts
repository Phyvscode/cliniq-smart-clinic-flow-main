import mongoose from "mongoose";

const connectDB = async (): Promise<void> => {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI is not defined in .env");

  try {
    await mongoose.connect(uri);
    console.log("✅  MongoDB Atlas connected");
  } catch (err) {
    console.error("❌  MongoDB connection failed:", err);
    process.exit(1);
  }
};

export default connectDB;