import mongoose from "mongoose";

const userNotificationSettingsSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    email: {
      type: Boolean,
      default: true,
    },
    push: {
      type: Boolean,
      default: true,
    },
    sound: {
      type: Boolean,
      default: true,
    },
    doNotDisturbUntil: {
      type: Date,
      default: null,
    },
    types: {
      all: {
        type: Boolean,
        default: true,
      },
      messages: {
        type: Boolean,
        default: true,
      },
      system: {
        type: Boolean,
        default: true,
      },
      team: {
        type: Boolean,
        default: true,
      },
      project: {
        type: Boolean,
        default: true,
      },
    },
  },
  { timestamps: true }
);

// Create or get settings for a user
userNotificationSettingsSchema.statics.getOrCreate = async function (userId) {
  let settings = await this.findOne({ userId });

  if (!settings) {
    settings = await this.create({
      userId,
      // Default settings will be applied from schema defaults
    });
  }

  return settings;
};

const UserNotificationSettings = mongoose.model(
  "UserNotificationSettings",
  userNotificationSettingsSchema
);

export default UserNotificationSettings;
