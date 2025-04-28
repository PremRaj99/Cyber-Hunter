import {
  verifyDeviceToken,
  registerDevice,
  recordLoginAttempt,
} from "../controllers/security.controller.js";

export const trackDevice = async (req, res, next) => {
  try {
    // Skip for unauthenticated routes
    if (!req.user) {
      return next();
    }

    const userId = req.user._id;
    const deviceId = req.cookies.deviceId || req.headers["x-device-id"];
    const deviceToken =
      req.cookies.deviceToken || req.headers["x-device-token"];

    // Verify existing device
    if (deviceId && deviceToken) {
      const isValidDevice = await verifyDeviceToken(
        userId,
        deviceId,
        deviceToken
      );
      if (isValidDevice) {
        return next();
      }
    }

    // Register new device
    const deviceData = await registerDevice(userId, req);
    if (deviceData) {
      // Set cookies for browser clients
      res.cookie("deviceId", deviceData.deviceId, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        maxAge: 365 * 24 * 60 * 60 * 1000, // 1 year
      });

      res.cookie("deviceToken", deviceData.token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        maxAge: 365 * 24 * 60 * 60 * 1000, // 1 year
      });

      // Also add to headers for API clients
      res.setHeader("X-Device-Id", deviceData.deviceId);
      res.setHeader("X-Device-Token", deviceData.token);
    }

    next();
  } catch (error) {
    console.error("Error in device tracker middleware:", error);
    next();
  }
};
