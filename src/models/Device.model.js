import mongoose from "mongoose";

const deviceSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    deviceId: {
      type: String,
      required: true,
    },
    deviceName: {
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
    lastActive: {
      type: Date,
      default: Date.now,
    },
    trusted: {
      type: Boolean,
      default: false,
    },
    token: {
      type: String,
      required: true,
    },
  },
  { timestamps: true }
);

// Index for faster queries
deviceSchema.index({ userId: 1, deviceId: 1 });

export default mongoose.model("Device", deviceSchema);
