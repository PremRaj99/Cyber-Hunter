import Notification from "../models/Notification.model.js";
import User from "../models/User.model.js";
import UserNotificationSettings from "../models/UserNotificationSettings.model.js";
import { sendMail } from "../utils/mailHandler.js";
import { sendNotificationToUser } from "../socket/socket.js";

/**
 * Create a new notification and deliver it based on user preferences
 */
export const createNotification = async (io, userId, notificationData) => {
  try {
    // Create notification record
    const notification = await Notification.create({
      userId,
      title: notificationData.title,
      message: notificationData.message,
      type: notificationData.type || "info",
      category: notificationData.category || "system",
      link: notificationData.link || null,
      actionRequired: notificationData.actionRequired || false,
    });

    // Get user notification settings
    const settings = await UserNotificationSettings.getOrCreate(userId);

    // Check if user is in Do Not Disturb mode
    const now = new Date();
    const isDND =
      settings.doNotDisturbUntil && settings.doNotDisturbUntil > now;

    // Check notification type settings
    const notificationType = notificationData.category || "system";
    const isTypeEnabled = settings.types?.[notificationType] !== false;

    // Skip delivery if DND or notification type is disabled
    if (isDND || !isTypeEnabled) {
      return {
        delivered: false,
        notification,
        reason: isDND ? "doNotDisturb" : "typeDisabled",
      };
    }

    // Delivery channels
    let deliveryResults = {
      inApp: true, // Always store in-app
      push: false,
      email: false,
      realtime: false,
    };

    // Send real-time notification via socket if enabled
    if (settings.push && io) {
      const sent = sendNotificationToUser(io, userId, {
        id: notification._id,
        title: notification.title,
        message: notification.message,
        type: notification.type,
        link: notification.link,
      });

      deliveryResults.realtime = sent;
    }

    // Send email notification if enabled
    if (settings.email && notificationData.sendEmail !== false) {
      try {
        const user = await User.findById(userId).select("email");

        if (user && user.email) {
          await sendMail(
            user.email,
            `Cyber Hunter: ${notification.title}`,
            notification.message,
            `<h1>${notification.title}</h1><p>${notification.message}</p>
             ${notification.link ? `<p>Visit: <a href="${notification.link}">${notification.link}</a></p>` : ""}`
          );

          deliveryResults.email = true;
        }
      } catch (emailError) {
        console.error("Failed to send email notification:", emailError);
      }
    }

    return {
      delivered: true,
      notification,
      deliveryResults,
    };
  } catch (error) {
    console.error("Error creating notification:", error);
    throw error;
  }
};

/**
 * Mark a notification as read
 */
export const markNotificationAsRead = async (notificationId, userId) => {
  return await Notification.findOneAndUpdate(
    { _id: notificationId, userId },
    { $set: { isRead: true } },
    { new: true }
  );
};

/**
 * Mark all notifications as read for a user
 */
export const markAllNotificationsAsRead = async (userId) => {
  return await Notification.updateMany(
    { userId, isRead: false },
    { $set: { isRead: true } }
  );
};

/**
 * Delete notifications by criteria
 */
export const deleteNotifications = async (criteria) => {
  return await Notification.deleteMany(criteria);
};
