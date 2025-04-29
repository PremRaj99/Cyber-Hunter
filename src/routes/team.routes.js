import express from "express";
import { verifyJWT } from "../middlewares/verifyUser.js";
import {
  createTeam,
  getAllTeams,
  getTeamById,
  updateTeam,
  addTeamMember,
  removeTeamMember,
  updateTechStack,
  addTeamMessage,
  getTeamLeaderboard,
  deleteTeam,
  getUserTeams,
  getTeamWithMembers,
  getTeamChannelMessages,
} from "../controllers/team.controller.js";

const router = express.Router();

// Team routes
router.post("/", verifyJWT, createTeam);
router.get("/", verifyJWT, getUserTeams);
router.get("/all", verifyJWT, getAllTeams);
router.get("/leaderboard", verifyJWT, getTeamLeaderboard);
router.get("/:teamId", verifyJWT, getTeamById);
router.put("/:teamId", verifyJWT, updateTeam);
router.delete("/:teamId", verifyJWT, deleteTeam);

// Team member routes
router.post("/:teamId/members", verifyJWT, addTeamMember);
router.delete("/:teamId/members/:memberId", verifyJWT, removeTeamMember);

// Team tech stack routes
router.put("/:teamId/tech-stack", verifyJWT, updateTechStack);

// Team message routes
router.post("/:teamId/messages", verifyJWT, addTeamMessage);

// Add new endpoints
router.get("/:teamId/members-detail", verifyJWT, getTeamWithMembers); // New detailed members endpoint
router.get("/:teamId/chat/:channelName", verifyJWT, getTeamChannelMessages); // Channel messages endpoint

export default router;
