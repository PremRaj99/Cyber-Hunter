import express from "express";
import { verifyJWT } from "../middlewares/verifyUser.js";
import {
  createUserDetail,
  deleteUser,
  getUser,
  getUsers,
  updateUser,
  searchUsers,
  getCurrentUser,
  updateCurrentUser, // New controller function to add
} from "../controllers/user.controller.js";
import { upload } from "../middlewares/multer.middleware.js";
import * as notificationSettingsController from "../controllers/notificationSettings.controller.js";

const Router = express.Router();

// define router

// Get current user (me) - Add this new route first
Router.get("/me", verifyJWT, getCurrentUser);

// NEW: Update current user route
Router.post("/me/update", verifyJWT, updateCurrentUser);

// Search users route
Router.get("/search", verifyJWT, searchUsers);

// create user detail
Router.post(
  "/",
  verifyJWT,
  upload.fields([
    {
      name: "profilePicture",
      maxCount: 1,
    },
  ]),
  createUserDetail
);

// update user detail
Router.put(
  "/:userId",
  verifyJWT,
  upload.fields([
    {
      name: "profilePicture",
      maxCount: 1,
    },
  ]),
  updateUser
);

// delete user detail
Router.delete("/:userId", verifyJWT, deleteUser);

// get all users
Router.get("/", getUsers);

// get user detail
Router.get("/:userId", getUser);

// Notification settings routes
Router.get(
  "/notification-settings",
  verifyJWT,
  notificationSettingsController.getUserNotificationSettings
);

Router.patch(
  "/notification-settings",
  verifyJWT,
  notificationSettingsController.updateNotificationSettings
);

Router.post(
  "/notification-settings/mute-all",
  verifyJWT,
  notificationSettingsController.muteAllNotifications
);

Router.post(
  "/notification-settings/do-not-disturb",
  verifyJWT,
  notificationSettingsController.enableDoNotDisturb
);

export default Router;
