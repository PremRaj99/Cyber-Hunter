import express from "express";
import {
  login,
  logout,
  google,
  refreshToken,
  sendEmailRequest,
  signup,
  test,
  verifyEmail,
  changePassword,
  verifyPassword, // Add this import
} from "../controllers/auth.controller.js";
import { verifyJWT } from "../middlewares/verifyUser.js";
import {
  disable2FA,
  generate2FASecret,
  get2FAStatus,
  validate2FALogin,
  verify2FAToken,
} from "../controllers/twoFactor.controller.js";

const Router = express.Router();

// define router

// test if api is working
Router.get("/test", test);

// login
Router.post("/login", login);

// verify Email
Router.post("/send-otp", verifyJWT, sendEmailRequest);
Router.get("/verify-email/:token", verifyJWT, verifyEmail);

// signup
Router.post("/signup", signup);

Router.get("/google", google);

// logout
Router.post("/logout", verifyJWT, logout);

// refresh token
Router.put("/refresh", verifyJWT, refreshToken);

// Password management
Router.post("/verify-password", verifyJWT, verifyPassword); // Add this route
Router.post("/change-password", verifyJWT, changePassword);

// 2FA endpoints
Router.get("/2fa/status", verifyJWT, get2FAStatus);
Router.post("/2fa/generate", verifyJWT, generate2FASecret);
Router.post("/2fa/verify", verifyJWT, verify2FAToken);
Router.post("/2fa/disable", verifyJWT, disable2FA);

// Make validate2FALogin public - no JWT verification required
Router.post("/2fa/validate", validate2FALogin);

export default Router;
