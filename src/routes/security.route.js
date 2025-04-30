import express from "express";
import { verifyJWT } from "../middlewares/verifyUser.js";
import {
  getDevices,
  getLoginHistory,
  trustDevice,
  removeDevice,
  logoutAllDevices,
  getSecurityStatus,
} from "../controllers/security.controller.js";

const router = express.Router();

// All routes require authentication
router.use(verifyJWT);

// Device management routes
router.get("/devices", getDevices);
router.post("/devices/trust", trustDevice);
router.delete("/devices/:deviceId", removeDevice);
router.post("/devices/logout-all", logoutAllDevices);

// Login history
router.get("/login-history", getLoginHistory);

// Security status
router.get("/status", getSecurityStatus);

export default router;
