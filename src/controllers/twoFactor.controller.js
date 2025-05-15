import User from "../models/User.model.js";
import { errorHandler } from "../utils/error.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import speakeasy from "speakeasy";
import QRCode from "qrcode";

// Generate a 2FA secret and QR code for a user
export const generate2FASecret = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const user = await User.findById(userId);

    if (!user) {
      return next(errorHandler(404, "User not found"));
    }

    // Generate a new secret
    const secret = speakeasy.generateSecret({
      name: `Cyber Hunter (${user.email})`,
    });

    // Store the secret temporarily (not enabling 2FA yet)
    user.twoFactorTempSecret = secret.base32;
    await user.save();

    // Generate QR code
    const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url);

    res
      .status(200)
      .json(
        new ApiResponse(
          200,
          { qrCodeUrl, secret: secret.base32 },
          "2FA secret generated successfully"
        )
      );
  } catch (error) {
    next(error);
  }
};

// Verify the 2FA token and enable 2FA
export const verify2FAToken = async (req, res, next) => {
  try {
    const { token } = req.body;

    // Add validation for token format
    if (
      !token ||
      typeof token !== "string" ||
      token.length !== 6 ||
      !/^\d+$/.test(token)
    ) {
      return next(
        errorHandler(400, "Invalid token format. Must be a 6-digit number")
      );
    }

    const userId = req.user._id;
    const user = await User.findById(userId);

    if (!user) {
      return next(errorHandler(404, "User not found"));
    }

    // If no temporary secret exists, user hasn't started 2FA setup
    if (!user.twoFactorTempSecret) {
      return next(errorHandler(400, "2FA setup not initiated"));
    }

    console.log(
      `Verifying token: ${token} with secret: ${user.twoFactorTempSecret}`
    );

    // Verify the token with window parameter to handle timing issues
    const verified = speakeasy.totp.verify({
      secret: user.twoFactorTempSecret,
      encoding: "base32",
      token: token,
      window: 2, // Allow a time skew of +/- 2 steps (60 seconds)
    });

    console.log(`Token verification result: ${verified}`);

    if (!verified) {
      return next(errorHandler(400, "Invalid 2FA token"));
    }

    // Enable 2FA and save the secret permanently
    user.twoFactorEnabled = true;
    user.twoFactorSecret = user.twoFactorTempSecret;
    user.twoFactorTempSecret = undefined;
    await user.save();

    res
      .status(200)
      .json(
        new ApiResponse(
          200,
          { twoFactorEnabled: true },
          "2FA enabled successfully"
        )
      );
  } catch (error) {
    console.error("2FA verification error:", error);
    next(error);
  }
};

// Disable 2FA after verifying a token
export const disable2FA = async (req, res, next) => {
  try {
    const { token } = req.body;
    const userId = req.user._id;
    const user = await User.findById(userId);

    if (!user) {
      return next(errorHandler(404, "User not found"));
    }

    // Ensure 2FA is currently enabled
    if (!user.twoFactorEnabled || !user.twoFactorSecret) {
      return next(errorHandler(400, "2FA is not enabled"));
    }

    // Verify the token for security
    const verified = speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: "base32",
      token: token,
    });

    if (!verified) {
      return next(errorHandler(400, "Invalid 2FA token"));
    }

    // Disable 2FA
    user.twoFactorEnabled = false;
    user.twoFactorSecret = undefined;
    await user.save();

    res
      .status(200)
      .json(
        new ApiResponse(
          200,
          { twoFactorEnabled: false },
          "2FA disabled successfully"
        )
      );
  } catch (error) {
    next(error);
  }
};

// Validate 2FA token during login process
export const validate2FALogin = async (req, res, next) => {
  try {
    const { token, email } = req.body;

    if (!token || !email) {
      return next(errorHandler(400, "Token and email are required"));
    }

    const user = await User.findOne({ email });

    if (!user) {
      return next(errorHandler(404, "User not found"));
    }

    if (!user.twoFactorEnabled || !user.twoFactorSecret) {
      return next(errorHandler(400, "2FA is not enabled for this account"));
    }

    // Verify the token
    const verified = speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: "base32",
      token: token,
    });

    if (!verified) {
      return next(errorHandler(400, "Invalid 2FA token"));
    }

    // Return success response
    res
      .status(200)
      .json(
        new ApiResponse(200, { verified: true }, "2FA verification successful")
      );
  } catch (error) {
    next(error);
  }
};

// Get user's 2FA status
export const get2FAStatus = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const user = await User.findById(userId);

    if (!user) {
      return next(errorHandler(404, "User not found"));
    }

    res
      .status(200)
      .json(
        new ApiResponse(
          200,
          { twoFactorEnabled: user.twoFactorEnabled || false },
          "2FA status retrieved"
        )
      );
  } catch (error) {
    next(error);
  }
};
