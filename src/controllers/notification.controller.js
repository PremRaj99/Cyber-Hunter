import mongoose from "mongoose";
import Notification from "../models/Notification.model.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { errorHandler } from "../utils/error.js";
import {
  markNotificationAsRead as markAsRead,
  markAllNotificationsAsRead,
  createNotification,
  deleteNotifications,
} from "../services/notification.service.js";

/**
 * Get all notifications for a user
 */
export const getUserNotifications = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Add filter options
    const filters = { userId };

    // Filter by type (info, success, warning, error, etc.)
    if (req.query.type) {
      filters.type = req.query.type;
    }

    // Filter by category (system, team, project, etc.)
    if (req.query.category) {
      filters.category = req.query.category;
    }

    // Filter by read status
    if (req.query.isRead === "true") {
      filters.isRead = true;
    } else if (req.query.isRead === "false") {
      filters.isRead = false;
    }

    const notifications = await Notification.find(filters)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Notification.countDocuments(filters);
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

    // Use the service to mark as read
    const updatedNotification = await markAsRead(notificationId, userId);

    res
      .status(200)
      .json(
        ApiResponse(200, updatedNotification, "Notification marked as read")
      );
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

    // Use filter parameters if provided
    const filters = { userId, isRead: false };

    if (req.query.type) {
      filters.type = req.query.type;
    }

    if (req.query.category) {
      filters.category = req.query.category;
    }

    const result = await Notification.updateMany(filters, {
      $set: { isRead: true },
    });

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

/**
 * Delete all read notifications
 */
export const deleteAllRead = async (req, res, next) => {
  try {
    const userId = req.user._id;

    const result = await deleteNotifications({
      userId,
      isRead: true,
    });

    res
      .status(200)
      .json(
        ApiResponse(
          200,
          { deletedCount: result.deletedCount },
          "All read notifications deleted successfully"
        )
      );
  } catch (error) {
    next(error);
  }
};

/**
 * Create a notification (admin only)
 */
export const createAdminNotification = async (req, res, next) => {
  try {
    const { userId, title, message, type, category, link, actionRequired } =
      req.body;

    if (!userId || !title || !message) {
      return next(errorHandler(400, "Missing required fields"));
    }

    // Check if target user exists
    const userExists = await mongoose.models.User.findById(userId);
    if (!userExists) {
      return next(errorHandler(404, "Target user not found"));
    }

    const notification = await Notification.create({
      userId,
      title,
      message,
      type: type || "info",
      category: category || "system",
      link,
      actionRequired: actionRequired || false,
    });

    res
      .status(201)
      .json(
        ApiResponse(201, notification, "Notification created successfully")
      );
  } catch (error) {
    next(error);
  }
};
