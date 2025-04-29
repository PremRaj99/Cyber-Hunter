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
  requestToJoinTeam,
  getTeamJoinRequests,
  respondToJoinRequest,
  getUserJoinRequests,
  cancelJoinRequest,
} from "../controllers/team.controller.js";
import {
  validateTeamId,
  isTeamCreator,
  isTeamMember,
  hasAvailableSlots,
  checkExistingJoinRequest,
  checkNotAlreadyMember,
  validateJoinRequest,
} from "../middlewares/team.middleware.js";

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

// Team join request routes
router.get("/my-join-requests", verifyJWT, getUserJoinRequests);
router.post(
  "/:teamId/join-request",
  verifyJWT,
  validateTeamId,
  checkNotAlreadyMember,
  checkExistingJoinRequest,
  requestToJoinTeam
);
router.get(
  "/:teamId/join-requests",
  verifyJWT,
  validateTeamId,
  isTeamCreator,
  getTeamJoinRequests
);
router.put(
  "/:teamId/join-request/:requestId",
  verifyJWT,
  validateTeamId,
  isTeamCreator,
  validateJoinRequest,
  respondToJoinRequest
);
router.delete(
  "/:teamId/join-request",
  verifyJWT,
  validateTeamId,
  cancelJoinRequest
);

// Add new endpoints
router.get("/:teamId/members-detail", verifyJWT, getTeamWithMembers); // New detailed members endpoint
router.get("/:teamId/chat/:channelName", verifyJWT, getTeamChannelMessages); // Channel messages endpoint

export default router;
