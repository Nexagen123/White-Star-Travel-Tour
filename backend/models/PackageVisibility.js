import mongoose from "mongoose";

const packageVisibilitySchema = new mongoose.Schema(
  {
    // For local packages: this will be the _id from GroupTicketing
    // For travel network packages: this will be the externalId
    packageId: {
      type: String,
      required: true,
      index: true,
    },
    // Source of the package: local-db or an external supplier
    source: {
      type: String,
      enum: ["local-db", "travel-network", "abid-air"],
      required: true,
      index: true,
    },
    // For travel network packages, store the external ID separately for easier querying
    externalId: {
      type: String,
      index: true,
      sparse: true,
    },
    // Visibility status
    isVisible: {
      type: Boolean,
      default: true,
    },
    // Optional: store who last modified this
    updatedBy: {
      type: String,
      ref: "User",
    },
  },
  {
    timestamps: true,
  },
);

// Create a compound index for packageId + source to ensure uniqueness
packageVisibilitySchema.index({ packageId: 1, source: 1 }, { unique: true });

// Static method to get or create visibility setting
packageVisibilitySchema.statics.getOrCreate = async function (
  packageId,
  source,
  externalId = null,
) {
  let record = await this.findOne({ packageId, source });

  if (!record) {
    record = await this.create({
      packageId,
      source,
      externalId,
      isVisible: true,
    });
  }

  return record;
};

// Static method to toggle visibility
packageVisibilitySchema.statics.toggleVisibility = async function (
  packageId,
  source,
  isVisible,
) {
  const record = await this.findOne({ packageId, source });

  if (!record) {
    // Create new record with the specified visibility
    return await this.create({
      packageId,
      source,
      isVisible,
    });
  }

  record.isVisible = isVisible;
  await record.save();
  return record;
};

// Static method to get all visibility settings for a source
packageVisibilitySchema.statics.getBySource = async function (source) {
  return await this.find({ source });
};

const PackageVisibility = mongoose.model(
  "PackageVisibility",
  packageVisibilitySchema,
);

export default PackageVisibility;
