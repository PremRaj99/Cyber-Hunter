import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    message: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      enum: ["info", "success", "warning", "error", "update", "reminder"],
      default: "info",
    },
    isRead: {
      type: Boolean,
      default: false,
    },
    link: {
      type: String,
      default: null,
    },
    actionRequired: {
      type: Boolean,
      default: false,
    },
    category: {
      type: String,
      enum: ["system", "team", "project", "account", "achievement"],
      default: "system",
    },
    expiresAt: {
      type: Date,
      default: function () {
        // Notifications expire after 30 days by default
        const now = new Date();
        return new Date(now.setDate(now.getDate() + 30));
      },
    },
  },
  { timestamps: true }
);

// Add indexes for efficient querying
notificationSchema.index({ userId: 1, createdAt: -1 });
notificationSchema.index({ userId: 1, isRead: 1 });
notificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // TTL index for auto-deletion

const Notification = mongoose.model("Notification", notificationSchema);

export default Notification;
