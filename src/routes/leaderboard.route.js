import express from "express";
import { verifyJWT } from "../middlewares/verifyUser.js";
import {
  getLeaderboard,
  updateLeaderboardRankings,
  getLeaderboardFilters,
} from "../controllers/leaderboard.controller.js";

const router = express.Router();

// Get leaderboard data with filtering
router.get("/", getLeaderboard);

// Get available filters for leaderboard
router.get("/filters", getLeaderboardFilters);

// Update leaderboard rankings (admin only)
router.post("/update-rankings", verifyJWT, updateLeaderboardRankings);

export default router;
