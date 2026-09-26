import dotenv from "dotenv";
import mongoose from "mongoose";
import dbConnection from "../config/db.js"; // Your existing connection logic

dotenv.config();

// Fixes production error:
// E11000 duplicate key error collection: waqaemakkahPortal.travelnetworkmargins
// index: type_1 dup key: { type: "umrah" }
//
// Cause: the collection was created before the "source" field existed, so it
// still carries a legacy unique index on { type: 1 } alone. The schema now
// declares a compound unique index on { type: 1, source: 1 }, but Mongoose
// never drops old indexes automatically - it only creates missing ones.
async function migrateTravelNetworkMarginIndex() {
  try {
    await dbConnection(); // Connect to MongoDB
    console.log("✅ Connected to MongoDB");

    const collection = mongoose.connection.db.collection("travelnetworkmargins");

    const indexes = await collection.indexes();
    const legacyIndex = indexes.find(
      (idx) => idx.name === "type_1" && Object.keys(idx.key).length === 1,
    );

    if (legacyIndex) {
      await collection.dropIndex("type_1");
      console.log("✅ Dropped legacy unique index type_1");
    } else {
      console.log("ℹ️ Legacy index type_1 not found (already removed)");
    }

    // Ensure the correct compound unique index exists
    await collection.createIndex({ type: 1, source: 1 }, { unique: true });
    console.log("✅ Ensured compound unique index { type: 1, source: 1 }");

    await mongoose.disconnect();
    console.log("✅ Disconnected from MongoDB");
  } catch (err) {
    console.error("❌ Migration failed:", err);
    await mongoose.disconnect();
    process.exit(1);
  }
}

migrateTravelNetworkMarginIndex();
