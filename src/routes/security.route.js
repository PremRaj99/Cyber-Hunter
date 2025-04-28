import express from "express";
import { verifyJWT } from "../middlewares/verifyUser.js";
import {
  getDevices,
  getLoginHistory,
  trustDevice,
  removeDevice,
  logoutAllDevices,
  getSecurityStatus,
} from "../controllers/security.controller.js";

const Router = express.Router();

Router.get("/devices", verifyJWT, getDevices);
Router.get("/logins", verifyJWT, getLoginHistory);
Router.post("/device/trust", verifyJWT, trustDevice);
Router.delete("/device/:deviceId", verifyJWT, removeDevice);
Router.post("/logout-all", verifyJWT, logoutAllDevices);
Router.get("/status", verifyJWT, getSecurityStatus);

export default Router;
