import express from "express";
import { verifyJWT } from "../middlewares/verifyUser.js";
import {
  getLeaderboard,
  updateLeaderboardRankings,
  getLeaderboardFilters,
  initializeLeaderboard,
  refreshLeaderboard,
} from "../controllers/leaderboard.controller.js";

const router = express.Router();

// Get leaderboard data with filtering
router.get("/", getLeaderboard);

// Get available filters for leaderboard
router.get("/filters", getLeaderboardFilters);

// Update leaderboard rankings (admin only)
router.post("/update-rankings", verifyJWT, updateLeaderboardRankings);

// Initialize leaderboard with existing data (admin only)
router.post("/initialize", verifyJWT, initializeLeaderboard);

// Refresh leaderboard by checking for missing entries (admin only)
router.post("/refresh", verifyJWT, refreshLeaderboard);

export default router;
