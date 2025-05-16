import express from "express";
import { verifyJWT } from "../middlewares/verifyUser.js";
import {
  submitContactForm,
  getAllContacts,
  getContactById,
  updateContactStatus,
} from "../controllers/contactController.js";

const router = express.Router();

// Public route for contact form submission
router.post("/", submitContactForm);

// Admin routes - protected by authentication
router.get("/admin/messages", verifyJWT, getAllContacts);
router.get("/admin/messages/:id", verifyJWT, getContactById);
router.patch("/admin/messages/:id", verifyJWT, updateContactStatus);

export default router;
