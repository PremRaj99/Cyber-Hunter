import { ethers } from "ethers";
import crypto from "crypto";
import User from "../models/User.model.js";
import WalletNonce from "../models/WalletNonce.model.js";
import UserDetail from "../models/UserDetail.model.js";
import Individual from "../models/Individual.model.js";
import { errorHandler } from "../utils/error.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import options from "../utils/cookieOptions.js";
import { recordLoginAttempt, registerDevice } from "./security.controller.js";

// Generate a nonce for wallet authentication
export const generateNonce = async (req, res, next) => {
  try {
    const { walletAddress } = req.body;

    if (!walletAddress) {
      return next(errorHandler(400, "Wallet address is required"));
    }

    // Validate wallet address format
    if (!ethers.utils.isAddress(walletAddress)) {
      return next(errorHandler(400, "Invalid wallet address"));
    }

    // Generate a random nonce
    const nonce = crypto.randomBytes(32).toString("hex");
    const message = `Sign this message to authenticate with Cyber Hunter: ${nonce}`;

    // Save nonce to database with expiration
    const walletNonce = new WalletNonce({
      walletAddress: walletAddress.toLowerCase(),
      nonce: message,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes from now
    });

    await walletNonce.save();

    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          { message, nonce },
          "Authentication nonce generated"
        )
      );
  } catch (error) {
    next(error);
  }
};

// Verify signature and authenticate user
export const verifyWalletSignature = async (req, res, next) => {
  try {
    const { walletAddress, signature } = req.body;

    if (!walletAddress || !signature) {
      return next(
        errorHandler(400, "Wallet address and signature are required")
      );
    }

    // Validate wallet address format
    if (!ethers.utils.isAddress(walletAddress)) {
      return next(errorHandler(400, "Invalid wallet address"));
    }

    // Find the latest nonce for this wallet
    const nonceRecord = await WalletNonce.findOne({
      walletAddress: walletAddress.toLowerCase(),
      used: false,
    }).sort({ createdAt: -1 });

    if (!nonceRecord) {
      return next(
        errorHandler(400, "No valid nonce found. Please request a new one.")
      );
    }

    if (nonceRecord.isExpired()) {
      return next(
        errorHandler(400, "Nonce has expired. Please request a new one.")
      );
    }

    // Verify signature
    const signerAddress = ethers.utils.verifyMessage(
      nonceRecord.nonce,
      signature
    );

    if (signerAddress.toLowerCase() !== walletAddress.toLowerCase()) {
      // Record failed login attempt
      await recordLoginAttempt(null, req, "failed", "Invalid wallet signature");
      return next(errorHandler(401, "Signature verification failed"));
    }

    // Mark nonce as used
    nonceRecord.used = true;
    await nonceRecord.save();

    // Find user by wallet address
    let user = await User.findOne({
      walletAddress: walletAddress.toLowerCase(),
    });

    if (!user) {
      // Create a new user with wallet address
      // Generate a pseudo-random email and password for the user
      const randomString = crypto.randomBytes(16).toString("hex");
      const pseudoEmail = `wallet_${randomString}@cyberhunter.auth`;
      const password = crypto.randomBytes(32).toString("hex");

      user = new User({
        email: pseudoEmail,
        password, // Store random password - user will never use it
        walletAddress: walletAddress.toLowerCase(),
        walletConnected: true,
        emailVerified: true, // Wallet verification is enough
      });

      await user.save();

      // Create welcome notification for the new user
      try {
        const Notification = (await import("../models/Notification.model.js"))
          .default;
        await Notification.create({
          userId: user._id,
          title: "Welcome to Cyber Hunter! 🎉",
          message:
            "Thanks for connecting your wallet! We're excited to have you join our community.",
          type: "success",
          isRead: false,
          link: "/dashboard/profile",
        });
      } catch (notifError) {
        console.error("Failed to create welcome notification:", notifError);
        // Continue execution even if notification creation fails
      }
    } else {
      // Update existing user if needed
      if (!user.walletConnected) {
        user.walletConnected = true;
        await user.save();
      }
    }

    // Record successful login
    await recordLoginAttempt(user._id, req, "success");

    // Register device
    const deviceData = await registerDevice(user._id, req);

    // Generate tokens
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();

    // Update user's refresh token
    user.refreshToken = refreshToken;
    await user.save();

    // Check if user has completed their profile by checking for UserDetail
    const userDetail = await UserDetail.findOne({ userId: user._id }).populate(
      "interestId",
      "content -_id"
    );
    const individual = await Individual.findOne({
      userId: user._id,
    }).select("-_id -userId");

    // Determine if profile is complete
    const isProfileComplete = !!userDetail; // true if userDetail exists

    // Prepare user data for response
    let userData = {
      ...user.toObject(),
      password: undefined, // Exclude password
      isProfileComplete,
    };

    // Add user details if they exist
    if (userDetail) {
      userData = {
        ...userData,
        name: userDetail.name,
        qId: userDetail.qId,
        course: userDetail.course,
        session: userDetail.session,
        branch: userDetail.branch,
        profilePicture: userDetail.profilePicture,
        DOB: userDetail.DOB,
        phoneNumber: userDetail.phoneNumber,
        gender: userDetail.gender,
        teamId: userDetail.teamId,
        interest: userDetail.interestId?.map((int) => int.content) || [],
        bio: individual?.description || "",
      };
    }

    res
      .cookie("accessToken", accessToken, options)
      .cookie("refreshToken", refreshToken, options)
      .cookie("deviceId", deviceData.deviceId, {
        ...options,
        maxAge: 365 * 24 * 60 * 60 * 1000, // 1 year
      })
      .cookie("deviceToken", deviceData.token, {
        ...options,
        maxAge: 365 * 24 * 60 * 60 * 1000, // 1 year
      })
      .status(200)
      .json(
        new ApiResponse(
          200,
          {
            ...userData,
            accessToken,
            refreshToken,
            walletAuthenticated: true,
          },
          "Wallet authentication successful"
        )
      );
  } catch (error) {
    next(error);
  }
};

// Connect wallet to existing account
export const connectWalletToAccount = async (req, res, next) => {
  try {
    const { walletAddress, signature } = req.body;
    const userId = req.user._id;

    if (!walletAddress || !signature) {
      return next(
        errorHandler(400, "Wallet address and signature are required")
      );
    }

    // Validate wallet address format
    if (!ethers.utils.isAddress(walletAddress)) {
      return next(errorHandler(400, "Invalid wallet address"));
    }

    // Check if wallet is already connected to another account
    const existingWalletUser = await User.findOne({
      walletAddress: walletAddress.toLowerCase(),
      _id: { $ne: userId },
    });

    if (existingWalletUser) {
      return next(
        errorHandler(409, "This wallet is already connected to another account")
      );
    }

    // Find the latest nonce for this wallet
    const nonceRecord = await WalletNonce.findOne({
      walletAddress: walletAddress.toLowerCase(),
      used: false,
    }).sort({ createdAt: -1 });

    if (!nonceRecord) {
      return next(
        errorHandler(400, "No valid nonce found. Please request a new one.")
      );
    }

    if (nonceRecord.isExpired()) {
      return next(
        errorHandler(400, "Nonce has expired. Please request a new one.")
      );
    }

    // Verify signature
    const signerAddress = ethers.utils.verifyMessage(
      nonceRecord.nonce,
      signature
    );

    if (signerAddress.toLowerCase() !== walletAddress.toLowerCase()) {
      return next(errorHandler(401, "Signature verification failed"));
    }

    // Mark nonce as used
    nonceRecord.used = true;
    await nonceRecord.save();

    // Update user with wallet address
    const user = await User.findById(userId);
    user.walletAddress = walletAddress.toLowerCase();
    user.walletConnected = true;
    await user.save();

    res
      .status(200)
      .json(
        new ApiResponse(
          200,
          { walletAddress: user.walletAddress, walletConnected: true },
          "Wallet connected successfully"
        )
      );
  } catch (error) {
    next(error);
  }
};

// Disconnect wallet from account
export const disconnectWallet = async (req, res, next) => {
  try {
    const userId = req.user._id;

    const user = await User.findById(userId);

    if (!user) {
      return next(errorHandler(404, "User not found"));
    }

    if (!user.walletAddress) {
      return next(errorHandler(400, "No wallet connected to this account"));
    }

    // Remove wallet info
    user.walletAddress = undefined;
    user.walletConnected = false;
    await user.save();

    res
      .status(200)
      .json(
        new ApiResponse(
          200,
          { walletConnected: false },
          "Wallet disconnected successfully"
        )
      );
  } catch (error) {
    next(error);
  }
};
