import express from "express";
import { verifyJWT } from "../middlewares/verifyUser.js";
import { verifyAdmin } from "../middlewares/verifyAdmin.js";
import {
  getUserNotifications,
  markNotificationAsRead,
  markAllAsRead,
  deleteNotification,
  deleteAllRead,
  createAdminNotification,
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

// Delete all read notifications
router.delete("/read", verifyJWT, deleteAllRead);

// Admin routes for notification management
router.post("/admin/create", verifyJWT, verifyAdmin, createAdminNotification);

export default router;
