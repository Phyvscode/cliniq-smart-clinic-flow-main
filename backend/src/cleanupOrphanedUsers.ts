import "dotenv/config";
import mongoose from "mongoose";

const run = async () => {
  const uri = process.env.MONGODB_URI;
  if (!uri) { console.error("MONGODB_URI not in .env"); process.exit(1); }

  await mongoose.connect(uri);
  console.log("✅ Connected to MongoDB");

  const db = mongoose.connection.db!;

  // Get all user IDs that have a staff profile
  const staffDocs = await db.collection("staffs").find({}, { projection: { user: 1 } }).toArray();
  const staffUserIds = staffDocs.map(s => s.user?.toString()).filter(Boolean);

  // Get all non-admin users
  const users = await db.collection("users").find({ role: { $ne: "admin" } }).toArray();

  let deleted = 0;
  for (const user of users) {
    const userId = user._id.toString();
    if (!staffUserIds.includes(userId)) {
      await db.collection("users").deleteOne({ _id: user._id });
      console.log(`🗑️  Deleted orphaned user: ${user.name} (${user.email})`);
      deleted++;
    }
  }

  if (deleted === 0) {
    console.log("ℹ️  No orphaned users found.");
  } else {
    console.log(`\n✅ Cleaned up ${deleted} orphaned user(s). You can now re-add them.`);
  }

  await mongoose.disconnect();
  process.exit(0);
};

run().catch(err => { console.error("❌", err); process.exit(1); });