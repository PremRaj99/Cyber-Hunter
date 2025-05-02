import express from "express";
import { verifyJWT } from "../middlewares/verifyUser.js";
import {
  getUserNotifications,
  markNotificationAsRead,
  markAllAsRead,
  deleteNotification,
} from "../controllers/notification.controller.js";

const router = express.Router();

// Get all notifications for current user
router.get("/", verifyJWT, getUserNotifications);

// Mark a notification as read
router.patch("/:notificationId/read", verifyJWT, markNotificationAsRead);

// Mark all notifications as read
router.patch("/read-all", verifyJWT, markAllAsRead);

// Delete a notification
router.delete("/:notificationId", verifyJWT, deleteNotification);

export default router;
