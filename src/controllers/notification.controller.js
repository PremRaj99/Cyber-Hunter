import mongoose from "mongoose";
import Notification from "../models/Notification.model.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { errorHandler } from "../utils/error.js";

/**
 * Get all notifications for a user
 */
export const getUserNotifications = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const notifications = await Notification.find({ userId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Notification.countDocuments({ userId });
    const unreadCount = await Notification.countDocuments({
      userId,
      isRead: false,
    });

    const hasNextPage = skip + notifications.length < total;

    res.status(200).json(
      ApiResponse(
        200,
        {
          notifications,
          pagination: {
            total,
            page,
            limit,
            hasNextPage,
          },
          unreadCount,
        },
        "Notifications fetched successfully"
      )
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Mark a notification as read
 */
export const markNotificationAsRead = async (req, res, next) => {
  try {
    const { notificationId } = req.params;
    const userId = req.user._id;

    // Validate object ID format
    if (!mongoose.Types.ObjectId.isValid(notificationId)) {
      return next(errorHandler(400, "Invalid notification ID"));
    }

    // Make sure the notification belongs to the requesting user
    const notification = await Notification.findOne({
      _id: notificationId,
      userId,
    });

    if (!notification) {
      return next(errorHandler(404, "Notification not found"));
    }

    // Update the notification
    notification.isRead = true;
    await notification.save();

    res
      .status(200)
      .json(ApiResponse(200, notification, "Notification marked as read"));
  } catch (error) {
    next(error);
  }
};

/**
 * Mark all notifications as read for a user
 */
export const markAllAsRead = async (req, res, next) => {
  try {
    const userId = req.user._id;

    const result = await Notification.updateMany(
      { userId, isRead: false },
      { $set: { isRead: true } }
    );

    res
      .status(200)
      .json(
        ApiResponse(
          200,
          { modifiedCount: result.modifiedCount },
          "All notifications marked as read"
        )
      );
  } catch (error) {
    next(error);
  }
};

/**
 * Delete a notification
 */
export const deleteNotification = async (req, res, next) => {
  try {
    const { notificationId } = req.params;
    const userId = req.user._id;

    // Validate object ID format
    if (!mongoose.Types.ObjectId.isValid(notificationId)) {
      return next(errorHandler(400, "Invalid notification ID"));
    }

    // Make sure the notification belongs to the requesting user
    const notification = await Notification.findOne({
      _id: notificationId,
      userId,
    });

    if (!notification) {
      return next(errorHandler(404, "Notification not found"));
    }

    await Notification.findByIdAndDelete(notificationId);

    res
      .status(200)
      .json(ApiResponse(200, null, "Notification deleted successfully"));
  } catch (error) {
    next(error);
  }
};
