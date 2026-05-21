import "dotenv/config";
import mongoose from "mongoose";

const dropIndex = async () => {
  const uri = process.env.MONGODB_URI;
  if (!uri) { console.error("MONGODB_URI not found in .env"); process.exit(1); }

  await mongoose.connect(uri);
  console.log("✅ Connected to MongoDB");

  const db = mongoose.connection.db;
  if (!db) { console.error("DB not initialized"); process.exit(1); }

  try {
    await db.collection("queues").dropIndex("patient_1_date_1");
    console.log("✅ Index 'patient_1_date_1' dropped successfully");
  } catch (err: any) {
    if (err.code === 27) {
      console.log("ℹ️  Index does not exist — nothing to drop");
    } else {
      console.error("❌ Error dropping index:", err.message);
    }
  }

  await mongoose.disconnect();
  console.log("Done. You can now add the same patient multiple times.");
  process.exit(0);
};

dropIndex();