import UserNotificationSettings from "../models/UserNotificationSettings.model.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { errorHandler } from "../utils/error.js";

/**
 * Get user notification settings
 */
export const getUserNotificationSettings = async (req, res, next) => {
  try {
    const userId = req.user._id;

    // Use the getOrCreate method to ensure settings exist
    const settings = await UserNotificationSettings.getOrCreate(userId);

    res.status(200).json(
      ApiResponse(
        200,
        {
          email: settings.email,
          push: settings.push,
          sound: settings.sound,
          doNotDisturbUntil: settings.doNotDisturbUntil,
          types: settings.types,
        },
        "Notification settings retrieved successfully"
      )
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Update user notification settings
 */
export const updateNotificationSettings = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const updates = req.body;

    // Make sure updates are valid
    const validFields = ["email", "push", "sound", "doNotDisturbUntil"];

    // Create an update object with valid fields
    const updateObj = {};

    Object.keys(updates).forEach((key) => {
      // Handle nested type settings
      if (key.startsWith("types.")) {
        const typePath = key;
        updateObj[typePath] = updates[key];
      }
      // Handle top-level settings
      else if (validFields.includes(key)) {
        updateObj[key] = updates[key];
      }
    });

    // Update settings
    const updatedSettings = await UserNotificationSettings.findOneAndUpdate(
      { userId },
      { $set: updateObj },
      { new: true, upsert: true }
    );

    res
      .status(200)
      .json(
        ApiResponse(
          200,
          updatedSettings,
          "Notification settings updated successfully"
        )
      );
  } catch (error) {
    next(error);
  }
};

/**
 * Mute all notifications
 */
export const muteAllNotifications = async (req, res, next) => {
  try {
    const userId = req.user._id;

    // Disable all notification types
    const updates = {
      email: false,
      push: false,
      sound: false,
      "types.all": false,
      "types.messages": false,
      "types.system": false,
      "types.team": false,
      "types.project": false,
    };

    const updatedSettings = await UserNotificationSettings.findOneAndUpdate(
      { userId },
      { $set: updates },
      { new: true, upsert: true }
    );

    res
      .status(200)
      .json(
        ApiResponse(200, updatedSettings, "All notifications have been muted")
      );
  } catch (error) {
    next(error);
  }
};

/**
 * Enable Do Not Disturb mode
 */
export const enableDoNotDisturb = async (req, res, next) => {
  try {
    const userId = req.user._id;

    // Set DND for 8 hours by default (or use provided duration)
    const hoursToMute = req.body.hours || 8;
    const doNotDisturbUntil = new Date();
    doNotDisturbUntil.setHours(doNotDisturbUntil.getHours() + hoursToMute);

    const updatedSettings = await UserNotificationSettings.findOneAndUpdate(
      { userId },
      {
        $set: {
          doNotDisturbUntil,
          push: false,
          sound: false,
        },
      },
      { new: true, upsert: true }
    );

    res.status(200).json(
      ApiResponse(
        200,
        {
          ...updatedSettings.toObject(),
          doNotDisturbHours: hoursToMute,
        },
        `Do Not Disturb enabled for ${hoursToMute} hours`
      )
    );
  } catch (error) {
    next(error);
  }
};
