import mongoose from "mongoose";

/**
 * Stores the global margin applied to all umrah packages for a given supplier
 * source (Travel Network, Abid Air, etc). One record per (type, source) pair
 * exists (upserted).
 */

const travelNetworkMarginSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["umrah"],
      default: "umrah",
      required: true,
    },
    source: {
      type: String,
      enum: ["travel-network", "abid-air"],
      default: "travel-network",
      required: true,
    },
    // Fixed PKR amount added on top of every room type price. Can be
    // negative to apply a discount off the supplier's base price instead.
    marginAmount: {
      type: Number,
      default: 0,
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Register",
    },
  },
  { timestamps: true },
);

travelNetworkMarginSchema.index({ type: 1, source: 1 }, { unique: true });

export default mongoose.model("TravelNetworkMargin", travelNetworkMarginSchema);
