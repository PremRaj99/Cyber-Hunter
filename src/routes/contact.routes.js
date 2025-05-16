import express from "express";
import {
  submitContactForm,
  getAllContacts,
  getContactById,
  updateContactStatus,
} from "../controllers/contactController.js";
import { protect, restrictTo } from "../middleware/authMiddleware.js";

const router = express.Router();

// Public route for submitting contact form
router.post("/", submitContactForm);

// Admin only routes - protected
router.use(protect);
router.get("/", restrictTo("admin"), getAllContacts);
router.get("/:id", restrictTo("admin"), getContactById);
router.patch("/:id", restrictTo("admin"), updateContactStatus);

export default router;
