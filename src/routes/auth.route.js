import express from "express";
import { login, logout, refreshToken, signup, test } from "../controllers/auth.controller.js";
import { verifyToken } from "../utils/verifyUser.js";

const Router = express.Router();

// define router

Router.get("/test", test);
Router.post("/login", login);
Router.post("/signup", signup);
Router.post("/logout", verifyToken, logout);
Router.put("/refresh", verifyToken, refreshToken)

export default Router;
