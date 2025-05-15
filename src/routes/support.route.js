import express from "express";
import {
  createTicket,
  getUserTickets,
  getTicketById,
  updateTicketStatus,
} from "../controllers/support.controller.js";
import { verifyJWT } from "../middlewares/verifyUser.js";

const router = express.Router();

// Create a new support ticket
router.post("/tickets", verifyJWT, createTicket);

// Get all tickets for the authenticated user
router.get("/tickets", verifyJWT, getUserTickets);

// Get a specific ticket by ID
router.get("/tickets/:id", verifyJWT, getTicketById);

// Update ticket status
router.patch("/tickets/:id/status", verifyJWT, updateTicketStatus);

export default router;
