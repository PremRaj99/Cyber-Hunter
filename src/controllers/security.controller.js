import Device from "../models/Device.model.js";
import LoginHistory from "../models/LoginHistory.model.js";
import User from "../models/User.model.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { errorHandler } from "../utils/error.js";
import crypto from "crypto";
import axios from "axios";
import { UAParser } from "ua-parser-js";

// Get all devices for a user
export const getDevices = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const devices = await Device.find({ userId }).sort({ lastActive: -1 });

    // Mark the current device
    const currentDeviceId = req.cookies.deviceId || req.headers["x-device-id"];

    const formattedDevices = devices.map((device) => {
      const isCurrentDevice = device.deviceId === currentDeviceId;
      return {
        ...device.toObject(),
        isCurrentDevice,
      };
    });

    res
      .status(200)
      .json(
        new ApiResponse(200, formattedDevices, "Devices retrieved successfully")
      );
  } catch (error) {
    next(error);
  }
};

// Get login history for a user
export const getLoginHistory = async (req, res, next) => {
  try {
    const userId = req.user._id;
    // Get latest 10 login attempts
    const loginHistory = await LoginHistory.find({ userId })
      .sort({ timestamp: -1 })
      .limit(10);

    res
      .status(200)
      .json(
        new ApiResponse(
          200,
          loginHistory,
          "Login history retrieved successfully"
        )
      );
  } catch (error) {
    next(error);
  }
};

// Trust or untrust a device
export const trustDevice = async (req, res, next) => {
  try {
    const { deviceId, trusted } = req.body;
    const userId = req.user._id;

    if (!deviceId) {
      return next(errorHandler(400, "Device ID is required"));
    }

    const device = await Device.findOne({ _id: deviceId, userId });
    if (!device) {
      return next(errorHandler(404, "Device not found"));
    }

    device.trusted = trusted;
    await device.save();

    res
      .status(200)
      .json(
        new ApiResponse(
          200,
          device,
          `Device ${trusted ? "trusted" : "untrusted"} successfully`
        )
      );
  } catch (error) {
    next(error);
  }
};

// Remove a device (revoke access)
export const removeDevice = async (req, res, next) => {
  try {
    const { deviceId } = req.params;
    const userId = req.user._id;

    const device = await Device.findOne({ _id: deviceId, userId });
    if (!device) {
      return next(errorHandler(404, "Device not found"));
    }

    await Device.findByIdAndDelete(deviceId);

    res
      .status(200)
      .json(new ApiResponse(200, null, "Device removed successfully"));
  } catch (error) {
    next(error);
  }
};

// Logout from all devices
export const logoutAllDevices = async (req, res, next) => {
  try {
    const userId = req.user._id;

    // Delete all devices except current
    const currentDeviceId = req.cookies.deviceId || req.headers["x-device-id"];

    if (currentDeviceId) {
      await Device.deleteMany({
        userId,
        deviceId: { $ne: currentDeviceId },
      });
    } else {
      await Device.deleteMany({ userId });
    }

    res
      .status(200)
      .json(new ApiResponse(200, null, "Logged out from all other devices"));
  } catch (error) {
    next(error);
  }
};

// Get security status
export const getSecurityStatus = async (req, res, next) => {
  try {
    const userId = req.user._id;

    const [user, devices] = await Promise.all([
      User.findById(userId),
      Device.find({ userId }).countDocuments(),
    ]);

    if (!user) {
      return next(errorHandler(404, "User not found"));
    }

    const securityStatus = {
      twoFactorEnabled: user.twoFactorEnabled || false,
      deviceCount: devices,
      lastPasswordChange: user.passwordChangedAt || null,
    };

    res
      .status(200)
      .json(
        new ApiResponse(
          200,
          securityStatus,
          "Security status retrieved successfully"
        )
      );
  } catch (error) {
    next(error);
  }
};

// Record login attempt (success or failure)
export const recordLoginAttempt = async (
  userId,
  req,
  status,
  reason = null
) => {
  try {
    const parser = new UAParser(req.headers["user-agent"]);
    const browser =
      `${parser.getBrowser().name || "Unknown"} ${parser.getBrowser().version || ""}`.trim();
    const os =
      `${parser.getOS().name || "Unknown"} ${parser.getOS().version || ""}`.trim();
    const device =
      parser.getDevice().model || parser.getDevice().vendor || "Unknown Device";

    const ip =
      req.ip || req.headers["x-forwarded-for"]?.split(",")[0] || "Unknown IP";

    // Get location from IP with safe fallback
    let location = "Unknown Location";
    try {
      // Set a reasonable timeout for IP lookup (2 seconds)
      const ipResponse = await axios
        .get(`http://ip-api.com/json/${ip}`, {
          timeout: 2000,
        })
        .catch((err) => {
          // If connection fails, try alternative service
          return axios
            .get(`https://ipapi.co/${ip}/json/`, {
              timeout: 2000,
            })
            .catch(() => null);
        });

      if (ipResponse?.data) {
        if (ipResponse.data.status === "success" || ipResponse.data.city) {
          // Format for ip-api.com or ipapi.co response
          const city = ipResponse.data.city || "";
          const country =
            ipResponse.data.country || ipResponse.data.country_name || "";
          location = `${city}${city && country ? ", " : ""}${country}`.trim();
          if (!location) location = "Unknown Location";
        }
      }
    } catch (error) {
      // Silent fail - just use default "Unknown Location"
      console.log("IP geolocation service unavailable, using default location");
    }

    const deviceInfo = `${device} (${browser})`;

    const loginRecord = new LoginHistory({
      userId,
      deviceInfo,
      browser,
      os,
      ip,
      location,
      status,
      reason,
      timestamp: new Date(),
    });

    await loginRecord.save();
    return loginRecord;
  } catch (error) {
    console.error("Error recording login attempt:", error);
    return null;
  }
};

// Register a new device
export const registerDevice = async (userId, req) => {
  try {
    const parser = new UAParser(req.headers["user-agent"]);
    const browserName = parser.getBrowser().name || "Unknown";
    const browserVersion = parser.getBrowser().version || "";
    const browser = `${browserName} ${browserVersion}`.trim();

    const osName = parser.getOS().name || "Unknown";
    const osVersion = parser.getOS().version || "";
    const os = `${osName} ${osVersion}`.trim();

    const deviceType = parser.getDevice().type || "desktop";
    const deviceVendor = parser.getDevice().vendor || "";
    const deviceModel = parser.getDevice().model || "";
    let deviceName = "Unknown Device";

    if (deviceVendor && deviceModel) {
      deviceName = `${deviceVendor} ${deviceModel}`;
    } else if (deviceType === "mobile") {
      deviceName = "Mobile Device";
    } else if (deviceType === "tablet") {
      deviceName = "Tablet Device";
    } else {
      deviceName = `${osName} Computer`;
    }

    const ip =
      req.ip || req.headers["x-forwarded-for"]?.split(",")[0] || "Unknown IP";

    // Get location from IP with safe fallback
    let location = "Unknown Location";
    try {
      // Set a reasonable timeout for IP lookup (2 seconds)
      const ipResponse = await axios
        .get(`http://ip-api.com/json/${ip}`, {
          timeout: 2000,
        })
        .catch((err) => {
          // If connection fails, try alternative service
          return axios
            .get(`https://ipapi.co/${ip}/json/`, {
              timeout: 2000,
            })
            .catch(() => null);
        });

      if (ipResponse?.data) {
        if (ipResponse.data.status === "success" || ipResponse.data.city) {
          // Format for ip-api.com or ipapi.co response
          const city = ipResponse.data.city || "";
          const country =
            ipResponse.data.country || ipResponse.data.country_name || "";
          location = `${city}${city && country ? ", " : ""}${country}`.trim();
          if (!location) location = "Unknown Location";
        }
      }
    } catch (error) {
      // Silent fail - just use default "Unknown Location"
      console.log("IP geolocation service unavailable, using default location");
    }

    // Generate device ID and token
    const deviceId = crypto.randomBytes(16).toString("hex");
    const token = crypto.randomBytes(32).toString("hex");

    // Create or update device
    const existingDevice = await Device.findOne({
      userId,
      browser,
      os,
      ip,
    });

    if (existingDevice) {
      existingDevice.lastActive = new Date();
      existingDevice.token = token;
      await existingDevice.save();
      return {
        device: existingDevice,
        token,
        deviceId: existingDevice.deviceId,
      };
    }

    const newDevice = new Device({
      userId,
      deviceId,
      deviceName,
      browser,
      os,
      ip,
      location,
      token,
      lastActive: new Date(),
    });

    await newDevice.save();
    return { device: newDevice, token, deviceId };
  } catch (error) {
    console.error("Error registering device:", error);
    return null;
  }
};

// Verify device token
export const verifyDeviceToken = async (userId, deviceId, token) => {
  try {
    if (!deviceId || !token) {
      return false;
    }

    const device = await Device.findOne({ userId, deviceId });
    if (!device || device.token !== token) {
      return false;
    }

    // Update last active time
    device.lastActive = new Date();
    await device.save();

    return true;
  } catch (error) {
    console.error("Error verifying device token:", error);
    return false;
  }
};
