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
} from "../controllers/auth.controller.js";
import { verifyJWT } from "../middlewares/verifyUser.js";

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

export default Router;
