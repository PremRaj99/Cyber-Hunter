import express from "express";
import passport from "passport";
import User from "../models/User.model.js";
import UserDetail from "../models/UserDetail.model.js";
import Individual from "../models/Individual.model.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import generateTokens from "../utils/generateTokens.js";
import { recordLoginAttempt } from "../controllers/security.controller.js";
import jwt from "jsonwebtoken";
// Import the CLIENT_URL from constants
import { CLIENT_URL } from "../constant.js";

const router = express.Router();

// Add a diagnostic route to check if GitHub routes are registered
router.get("/github-test", (req, res) => {
  console.log("GitHub test route hit successfully");
  res.json(
    new ApiResponse(
      200,
      {
        message: "GitHub routes are registered correctly",
        clientId: process.env.GITHUB_CLIENT_ID ? "Configured" : "Missing",
        callbackUrl: process.env.GITHUB_CALLBACK_URL || "Not configured",
        passportInitialized: !!passport._strategies.github,
      },
      "GitHub routes test"
    )
  );
});

// Add a diagnostic route to verify GitHub credentials
router.get("/github-config", (req, res) => {
  res.json({
    success: true,
    data: {
      clientIdConfigured: !!process.env.GITHUB_CLIENT_ID,
      callbackUrl:
        process.env.GITHUB_CALLBACK_URL ||
        "http://localhost:3000/api/v1/auth/github/callback",
    },
    message: "GitHub configuration status",
  });
});

// Route to initiate GitHub authentication with better error handling
router.get(
  "/github",
  (req, res, next) => {
    console.log("GitHub auth route hit at", new Date().toISOString());

    // Verify credentials are available before proceeding
    if (!process.env.GITHUB_CLIENT_ID || !process.env.GITHUB_CLIENT_SECRET) {
      console.error("Missing GitHub OAuth credentials");
      return res
        .status(500)
        .send("GitHub authentication is not configured properly on the server");
    }

    next();
  },
  passport.authenticate("github", { scope: ["user:email"] })
);

// GitHub callback route that handles the response from GitHub
router.get(
  "/github/callback",
  (req, res, next) => {
    console.log("GitHub callback route hit with params:", req.query);
    next();
  },
  passport.authenticate("github", {
    failureRedirect: `${CLIENT_URL}/auth/login?error=github_auth_failed`,
    session: false,
  }),
  async (req, res) => {
    try {
      console.log("GitHub auth successful, processing user");

      // Get user from passport
      const user = req.user;
      if (!user) {
        console.error("No user object in request after GitHub auth");
        return res.redirect(`${CLIENT_URL}/auth/login?error=no_user`);
      }

      // Record successful login
      await recordLoginAttempt(user._id, req, "success");

      // Generate tokens for the user
      const { accessToken, refreshToken } = await generateTokens(user._id);
      console.log("Generated tokens for user:", user._id);

      // Redirect to frontend with token - make sure to send both tokens
      const redirectUrl = `${CLIENT_URL}/auth/github/success?token=${accessToken}&refreshToken=${refreshToken}`;
      console.log(`Redirecting to: ${redirectUrl}`);

      // Use a direct HTTP redirect rather than res.redirect which might be causing issues
      res.writeHead(302, {
        Location: redirectUrl,
      });
      return res.end();
    } catch (error) {
      console.error("GitHub auth error:", error);
      return res.redirect(`${CLIENT_URL}/auth/login?error=server_error`);
    }
  }
);

// Route to get GitHub user data after authentication
router.get("/github/user", async (req, res, next) => {
  try {
    const token =
      req.cookies?.accessToken ||
      req.header("Authorization")?.replace("Bearer ", "");

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized: No token provided",
      });
    }

    // Verify the token and get user ID
    const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
    const userId = decoded._id;

    // Find the user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Get additional user details
    const userDetail = await UserDetail.findOne({ userId }).populate(
      "interestId",
      "content -_id"
    );

    const individual = await Individual.findOne({ userId }).select(
      "-_id -userId"
    );

    // Format the response data
    const { password, refreshToken: _, ...userData } = user.toObject();

    const responseData = {
      ...userData,
      isProfileComplete: Boolean(userDetail?.profilePicture),
      ...(userDetail && {
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
        interest: userDetail.interestId?.map((int) => int.content) || [],
        bio: individual?.description,
      }),
    };

    res.status(200).json({
      success: true,
      data: responseData,
      message: "GitHub user data retrieved successfully",
    });
  } catch (error) {
    console.error("GitHub user data error:", error);
    res.status(401).json({
      success: false,
      message: "Invalid token or session expired",
    });
  }
});

export default router;
