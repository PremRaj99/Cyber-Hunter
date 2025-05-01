import express from "express";
import { verifyJWT } from "../middlewares/verifyUser.js";
import {
  getDevices,
  getLoginHistory,
  getSecurityStatus,
  logoutAllDevices,
  removeDevice,
  trustDevice,
} from "../controllers/security.controller.js";

const router = express.Router();

// All security routes should be protected
router.use(verifyJWT);

// Device management
router.get("/devices", getDevices);
router.delete("/device/:deviceId", removeDevice);
router.post("/device/trust", trustDevice);
router.post("/logout-all", logoutAllDevices);

// Security information
router.get("/logins", getLoginHistory);
router.get("/status", getSecurityStatus);

export default router;
