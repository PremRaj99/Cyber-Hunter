import express from "express";
import {
  generateNonce,
  verifyWalletSignature,
  connectWalletToAccount,
  disconnectWallet,
} from "../controllers/walletAuth.controller.js";
import { verifyJWT } from "../middlewares/verifyUser.js";

const Router = express.Router();

// Public routes
Router.post("/nonce", generateNonce);
Router.post("/verify", verifyWalletSignature);

// Protected routes (require authentication)
Router.post("/connect", verifyJWT, connectWalletToAccount);
Router.post("/disconnect", verifyJWT, disconnectWallet);

export default Router;
