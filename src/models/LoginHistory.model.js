import mongoose from "mongoose";

const loginHistorySchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    deviceInfo: {
      type: String,
      required: true,
    },
    browser: {
      type: String,
      default: "Unknown",
    },
    os: {
      type: String,
      default: "Unknown",
    },
    ip: {
      type: String,
      required: true,
    },
    location: {
      type: String,
      default: "Unknown",
    },
    status: {
      type: String,
      enum: ["success", "failed"],
      default: "success",
    },
    reason: {
      type: String,
      default: null,
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

// Index for faster queries
loginHistorySchema.index({ userId: 1 });

export default mongoose.model("LoginHistory", loginHistorySchema);
