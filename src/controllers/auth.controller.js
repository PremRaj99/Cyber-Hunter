import User from "../models/User.model.js";
import bcryptjs from "bcryptjs";
import { errorHandler } from "../utils/error.js";
import UserDetail from "../models/UserDetail.model.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import options from "../utils/cookieOptions.js";
import generateCrypto from "../utils/generateCryptoCode.js";
import { sendMail } from "../utils/mailHandler.js";
import EmailVerification from "../models/EmailVerification.model.js";
import Individual from "../models/Individual.model.js";
import { googleUserResponse, oauth2Client } from "../utils/googleClient.js";
import { recordLoginAttempt, registerDevice } from "./security.controller.js";
import speakeasy from "speakeasy";

export const test = (req, res) => {
  res.json({
    message: "API is Running...",
  });
};

const generateAccessAndRefreshTokens = async (userId) => {
  try {
    const user = await User.findById(userId);
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();

    user.refreshToken = refreshToken;
    await user.save();
    return { accessToken, refreshToken };
  } catch (error) {
    throw errorHandler(
      500,
      "Something went wrong while generating refresh token"
    );
  }
};

export const login = async (req, res, next) => {
  const { email, password } = req.body;

  if (!email || !password || password === "") {
    // Record failed login attempt
    if (email) {
      const user = await User.findOne({ email });
      if (user) {
        await recordLoginAttempt(
          user._id,
          req,
          "failed",
          "Missing credentials"
        );
      }
    }
    return next(errorHandler(404, "All fields are required!"));
  }

  try {
    const validEmail = await User.findOne({ email: email });

    if (!validEmail) {
      await recordLoginAttempt(null, req, "failed", "User not found");
      return next(errorHandler(404, "User Not Found"));
    }

    const validPassword = bcryptjs.compareSync(password, validEmail.password);
    if (!validPassword) {
      await recordLoginAttempt(
        validEmail._id,
        req,
        "failed",
        "Invalid password"
      );
      return next(
        errorHandler(
          401,
          "Invalid Password, please try again with correct Details"
        )
      );
    }

    // Record successful login
    await recordLoginAttempt(validEmail._id, req, "success");

    // Register device
    const deviceData = await registerDevice(validEmail._id, req);

    // Check if 2FA is enabled for the user
    if (validEmail.twoFactorEnabled && validEmail.twoFactorSecret) {
      // Return a different response that indicates 2FA is required
      return res.status(200).json(
        ApiResponse(
          200,
          {
            requiresTwoFactor: true,
            email: validEmail.email,
            userId: validEmail._id,
            // Include userData but not access tokens
            userData: {
              ...validEmail._doc,
              password: undefined,
              twoFactorSecret: undefined,
              twoFactorTempSecret: undefined,
            },
          },
          "Please enter 2FA code to complete login"
        )
      );
    }

    // If 2FA is not enabled, proceed with normal login flow
    const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(
      validEmail._id
    );

    const { password: pass, ...rest } = validEmail._doc;
    const userDetail = await UserDetail.findOne({
      userId: validEmail._id,
    }).populate("interestId", "content -_id");

    const individual = await Individual.findOne({
      userId: validEmail._id,
    }).select("-_id -userId");

    // Return the user data with tokens

    const data = {
      ...rest,
      accessToken,
      refreshToken,
      name: userDetail?.name,
      course: userDetail?.course,
      session: userDetail?.session,
      branch: userDetail?.branch,
      profilePicture: userDetail?.profilePicture,
      DOB: userDetail?.DOB,
      phoneNumber: userDetail?.phoneNumber,
      gender: userDetail.gender,
      teamId: userDetail.teamId,
      qId: userDetail.qId,
      interest: userDetail.interestId.map((int) => int.content),
      bio: individual?.description,
    };
    return res
      .cookie("accessToken", accessToken, options)
      .cookie("refreshToken", refreshToken, options)
      .cookie("deviceId", deviceData.deviceId, {
        ...options,
        maxAge: 365 * 24 * 60 * 60 * 1000, // 1 year
      })
      .cookie("deviceToken", deviceData.token, {
        ...options,
        maxAge: 365 * 24 * 60 * 60 * 1000,
      })
      .status(200)
      .json(ApiResponse(200, data, "Login Successful"));
  } catch (error) {
    next(error);
  }
};

export const verifyTwoFactorAndLogin = async (req, res, next) => {
  try {
    const { email, token } = req.body;

    if (!email || !token) {
      return next(errorHandler(400, "Email and 2FA token are required"));
    }

    // Find the user
    const user = await User.findOne({ email });
    if (!user) {
      return next(errorHandler(404, "User not found"));
    }

    // Check if 2FA is enabled
    if (!user.twoFactorEnabled || !user.twoFactorSecret) {
      return next(errorHandler(400, "2FA is not enabled for this account"));
    }

    // Verify the 2FA token
    const verified = speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: "base32",
      token,
      window: 2, // Allow a time skew of +/- 2 steps (60 seconds)
    });

    if (!verified) {
      return next(errorHandler(401, "Invalid 2FA code"));
    }

    // Register device
    const deviceData = await registerDevice(user._id, req);

    // Generate tokens
    const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(
      user._id
    );

    // Get user data without sensitive info
    const { password, twoFactorSecret, twoFactorTempSecret, ...userData } =
      user._doc;

    // Return success with tokens
    return res
      .cookie("accessToken", accessToken, options)
      .cookie("refreshToken", refreshToken, options)
      .cookie("deviceId", deviceData.deviceId, {
        ...options,
        maxAge: 365 * 24 * 60 * 60 * 1000, // 1 year
      })
      .cookie("deviceToken", deviceData.token, {
        ...options,
        maxAge: 365 * 24 * 60 * 60 * 1000,
      })
      .status(200)
      .json(
        ApiResponse(
          200,
          { ...userData, accessToken, refreshToken },
          "2FA verified and login successful"
        )
      );
  } catch (error) {
    console.error("Error verifying 2FA:", error);
    next(errorHandler(500, "Error during 2FA verification"));
  }
};

export const signup = async (req, res, next) => {
  const { email, confirmPassword, password } = req.body;
  if (!email || !password || password === "" || !confirmPassword) {
    return next(errorHandler(404, "All fields are required!"));
  }
  if (confirmPassword !== password) {
    return next(errorHandler(404, "Password donot match!"));
  }
  try {
    const validEmail = await User.findOne({ email: email });
    if (validEmail) {
      return next(errorHandler(409, "Email already exists"));
    }
    const salt = bcryptjs.genSaltSync(10);
    const hashedPassword = bcryptjs.hashSync(password, salt);

    const user = new User({ email, password: hashedPassword });
    await user.save();

    // Create welcome notification for the new user
    try {
      const Notification = (await import("../models/Notification.model.js"))
        .default;
      await Notification.create({
        userId: user._id,
        title: "Welcome to Cyber Hunter! 🎉",
        message:
          "Congratulations on joining our community! We're excited to have you onboard.",
        type: "success",
        isRead: false,
        link: "/dashboard/profile",
      });
    } catch (notifError) {
      console.error("Failed to create welcome notification:", notifError);
      // Continue execution even if notification creation fails
    }

    const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(
      user._id
    );

    const { password: pass, refreshToken: ref, ...rest } = user._doc;
    res
      .cookie("accessToken", accessToken, options)
      .cookie("refreshToken", refreshToken, options)
      .status(200)
      .json(
        ApiResponse(
          200,
          { ...rest, accessToken, refreshToken },
          "Signup Successful"
        )
      );
  } catch (error) {
    next(error);
  }
};

export const google = async (req, res, next) => {
  const { code } = req.query;

  try {
    const googleResponse = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(googleResponse.tokens);
    const userInfo = await googleUserResponse(googleResponse);

    let user = await User.findOne({ email: userInfo.email });

    if (!user) {
      user = new User({
        email: userInfo.email,
        emailVerified: true,
        password: userInfo.id,
      });
      await user.save();
    } else if (!user.emailVerified) {
      user.emailVerified = true;
      await user.save();
    }

    const userDetail = await UserDetail.findOne({
      userId: user._id,
    }).populate("interestId", "content -_id");

    const individual = await Individual.findOne({
      userId: user._id,
    }).select("-_id -userId");

    const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(
      user._id
    );

    const { password: pass, ...rest } = user._doc;

    if (!userDetail) {
      return res
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", refreshToken, options)
        .status(200)
        .json(
          ApiResponse(
            200,
            { ...rest, accessToken, refreshToken },
            "Login Successful"
          )
        );
    }
    const data = {
      ...rest,
      accessToken,
      refreshToken,
      name: userDetail.name,
      course: userDetail.course,
      session: userDetail.session,
      branch: userDetail.branch,
      profilePicture: userDetail.profilePicture,
      DOB: userDetail.DOB,
      phoneNumber: userDetail.phoneNumber,
      gender: userDetail.gender,
      teamId: userDetail.teamId,
      qId: userDetail.qId,
      interest: userDetail.interestId.map((int) => int.content),
      bio: individual?.description,
    };

    res
      .status(200)
      .cookie("accessToken", accessToken, options)
      .cookie("refreshToken", refreshToken, options)
      .json(ApiResponse(200, data, "Google login successful"));
  } catch (error) {
    next(error);
  }
};

export const logout = async (req, res, next) => {
  try {
    // Remove current device
    const deviceId = req.cookies.deviceId || req.headers["x-device-id"];
    if (deviceId) {
      // Import Device model that was missing
      const Device = (await import("../models/Device.model.js")).default;
      await Device.findOneAndDelete({ deviceId, userId: req.user._id });
    }

    await User.findByIdAndUpdate(
      req.user._id,
      {
        $set: {
          refreshToken: undefined,
        },
      },
      {
        new: true,
      }
    );

    res
      .clearCookie("accessToken", options)
      .clearCookie("refreshToken", options)
      .clearCookie("deviceId", options)
      .clearCookie("deviceToken", options)
      .status(200)
      .json(ApiResponse(200, {}, "Logout Successful"));
  } catch (error) {
    next(error);
  }
};

export const refreshToken = async (req, res, next) => {
  const { refreshToken } = req.cookies || req.body;
  if (!refreshToken) {
    return next(errorHandler(401, "Unauthorized"));
  }
  try {
    const user = await User.findOne({ refreshToken });
    if (!user) {
      return next(errorHandler(401, "Unauthorized"));
    }
    const { accessToken, refreshToken: newRefreshToken } =
      await generateAccessAndRefreshTokens(user._id);

    res
      .cookie("accessToken", accessToken, options)
      .cookie("refreshToken", newRefreshToken, options)
      .status(200)
      .json(
        ApiResponse(
          200,
          { accessToken, refreshToken: newRefreshToken },
          "Refresh Token Generated"
        )
      );
  } catch (error) {
    next(error);
  }
};

export const sendEmailRequest = async (req, res, next) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    if (!user) {
      return next(errorHandler(404, "User Not Found"));
    }
    const token = generateCrypto(user._id, email);

    const html = `
        <!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>OTP Verification</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      margin: 0;
      padding: 0;
      background-color: #f4f4f4;
    }
    .container {
      max-width: 600px;
      margin: 20px auto;
      background: #ffffff;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
    }
    .header {
      background-color: #4CAF50;
      color: white;
      padding: 20px;
      text-align: center;
    }
    .content {
      padding: 20px;
      text-align: center;
    }
    .otp {
      font-size: 24px;
      font-weight: bold;
      color: #333;
      margin: 20px 0;
    }
    .footer {
      background: #f4f4f4;
      color: #555;
      font-size: 12px;
      text-align: center;
      padding: 10px;
    }
    .footer a {
      color: #4CAF50;
      text-decoration: none;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>OTP Verification</h1>
    </div>
    <div class="content">
      <p>Dear User,</p>
      <p>Use the OTP below to verify your email address:</p>
      <div class="otp">123456</div>
      <p>This OTP is valid for 10 minutes.</p>
      <p>If you didn’t request this, please ignore this email.</p>
    </div>
    <div class="footer">
      <p>Thank you for using our service.</p>
      <p><a href="https://www.example.com">Visit our website</a></p>
    </div>
  </div>
</body>
</html>

    `;

    sendMail(
      user.email,
      "Cyber Hunter Email Verification",
      "Verify your email",
      html
    );

    res.status(200).json(ApiResponse(200, {}, "OTP send to your email"));
  } catch (error) {
    next(error);
  }
};

export const verifyEmail = async (req, res, next) => {
  try {
    const { token } = req.params;
    const email = await EmailVerification.findOne({
      userId: req.user._id,
    });

    if (!email) {
      return next(errorHandler(404, "Email not found"));
    }

    if (email.token !== token) {
      return next(errorHandler(404, "Invalid Token"));
    }

    await User.findByIdAndUpdate(
      req.user._id,
      {
        $set: {
          emailVerified: true,
        },
      },
      {
        new: true,
      }
    );
    res.status(200).json(ApiResponse(200, {}, "Email Verified"));
  } catch (error) {
    next(error);
  }
};

export const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    if (!user) {
      return next(errorHandler(404, "User Not Found"));
    }
    res.status(200).json(ApiResponse(200, {}, "Password Reset Link Sent"));
  } catch (error) {
    next(error);
  }
};

export const resetPassword = async (req, res, next) => {
  try {
    const { email, password, confirmPassword } = req.body;
    if (!email || !password || password === "" || !confirmPassword) {
      return next(errorHandler(404, "All fields are required!"));
    }
    if (password !== confirmPassword) {
      return next(errorHandler(404, "Password donot match!"));
    }
    const user = await User.findOne({ email });
    if (!user) {
      return next(errorHandler(404, "User Not Found"));
    }
    const salt = bcryptjs.genSaltSync(10);
    const hashedPassword = bcryptjs.hashSync(password, salt);

    await User.findByIdAndUpdate(
      user._id,
      {
        $set: {
          password: hashedPassword,
        },
      },
      {
        new: true,
      }
    );

    res.status(200).json(ApiResponse(200, {}, "Password Reset Successful"));
  } catch (error) {
    next(error);
  }
};

export const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user._id;

    // Validate input
    if (!currentPassword || !newPassword) {
      return next(
        errorHandler(400, "Current password and new password are required")
      );
    }

    // Find the user
    const user = await User.findById(userId);
    if (!user) {
      return next(errorHandler(404, "User not found"));
    }

    // Verify current password
    const isPasswordValid = bcryptjs.compareSync(
      currentPassword,
      user.password
    );
    if (!isPasswordValid) {
      return next(errorHandler(401, "Current password is incorrect"));
    }

    // Check if new password is same as old password
    if (currentPassword === newPassword) {
      return next(
        errorHandler(400, "New password cannot be the same as current password")
      );
    }

    // Hash the new password
    const salt = bcryptjs.genSaltSync(10);
    const hashedPassword = bcryptjs.hashSync(newPassword, salt);

    // Update the password
    user.password = hashedPassword;
    await user.save();

    res
      .status(200)
      .json(new ApiResponse(200, {}, "Password changed successfully"));
  } catch (error) {
    next(error);
  }
};

export const verifyPassword = async (req, res, next) => {
  try {
    const { password } = req.body;
    const userId = req.user._id;

    if (!password) {
      return next(errorHandler(400, "Password is required"));
    }

    const user = await User.findById(userId);
    if (!user) {
      return next(errorHandler(404, "User not found"));
    }

    // Verify the password
    const isPasswordValid = bcryptjs.compareSync(password, user.password);
    if (!isPasswordValid) {
      return next(errorHandler(401, "Password is incorrect"));
    }

    res
      .status(200)
      .json(
        new ApiResponse(
          200,
          { verified: true },
          "Password verified successfully"
        )
      );
  } catch (error) {
    next(error);
  }
};
