import mongoose from "mongoose";

const loginHistorySchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false, // Allow null for unsuccessful login attempts
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
      default: "Unknown",
    },
    location: {
      type: String,
      default: "Unknown Location",
    },
    status: {
      type: String,
      enum: ["success", "failed"],
      required: true,
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
  { timestamps: false }
);

const LoginHistory = mongoose.model("LoginHistory", loginHistorySchema);

export default LoginHistory;
