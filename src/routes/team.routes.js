import express from "express";
import { verifyJWT } from "../middlewares/verifyUser.js";
import {
  createTeam,
  getAllTeams,
  getTeamById,
  updateTeam,
  addTeamMember, // Now properly imported
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
  sendTeamInvitation,
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
import { upload } from "../middlewares/multer.middleware.js";
import UserModel from "../models/User.model.js";
import UserDetail from "../models/UserDetail.model.js"; // Add missing import
import TeamDetail from "../models/TeamDetail.model.js"; // Add missing import

const router = express.Router();

router.get("/my-join-requests", verifyJWT, getUserJoinRequests);

// Team routes
router.post(
  "/",
  verifyJWT,
  upload.fields([{ name: "TeamLogo", maxCount: 1 }]),
  createTeam
);
router.get("/", verifyJWT, getUserTeams);
router.get("/all", verifyJWT, getAllTeams);
router.get("/leaderboard", verifyJWT, getTeamLeaderboard);
router.get("/:teamId", verifyJWT, getTeamById);
router.put("/:teamId", verifyJWT, updateTeam);
router.delete("/:teamId", verifyJWT, deleteTeam);

// Team member routes
router.delete("/:teamId/members/:memberId", verifyJWT, removeTeamMember);
// Route to get team members details
router.get("/:teamId/members-detail", verifyJWT, getTeamWithMembers);

// Team tech stack routes
router.put("/:teamId/tech-stack", verifyJWT, updateTechStack);

// Team message routes
router.post("/:teamId/messages", verifyJWT, addTeamMessage);

// Team join requests routes
router.get(
  "/:teamId/join-requests",
  verifyJWT,
  validateTeamId,
  getTeamJoinRequests
);

// Send a join request to a team
router.post(
  "/:teamId/join-request",
  verifyJWT,
  validateTeamId,
  async (req, res, next) => {
    try {
      // Add error handling wrapper
      const userId = req.user._id;

      // Check if user already has a team
      const user = await UserModel.findById(userId);
      if (user && user.teamId) {
        return res.status(403).json({
          success: false,
          message: "You are already a member of a team",
        });
      }

      // Continue to existing middleware
      next();
    } catch (error) {
      console.error("Error in join request pre-check:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error while processing join request",
      });
    }
  },
  checkNotAlreadyMember,
  checkExistingJoinRequest,
  requestToJoinTeam
);

// Get team invitations (sent by the team)
router.get(
  "/:teamId/invitations",
  verifyJWT,
  validateTeamId,
  isTeamCreator,
  async (req, res) => {
    try {
      const teamId = req.params.teamId;
      const team = await TeamDetail.findById(teamId);

      if (!team) {
        return res.status(404).json({
          success: false,
          message: "Team not found",
        });
      }

      // Filter invitations (status = "invited")
      const invitations = team.joinRequests.filter(
        (req) => req.status === "invited"
      );

      // Populate user data for each invitation
      const populatedInvitations = await Promise.all(
        invitations.map(async (invitation) => {
          const user = await UserModel.findById(invitation.userId).select(
            "email profilePicture"
          );
          const userDetail = await UserDetail.findOne({
            userId: invitation.userId,
          }).select("name");

          return {
            _id: invitation._id,
            userId: invitation.userId,
            message: invitation.message,
            status: invitation.status,
            requestedAt: invitation.requestedAt,
            respondedAt: invitation.respondedAt,
            userData: {
              name: userDetail?.name || "Unknown User",
              email: user?.email || "Unknown Email",
              profilePicture: user?.profilePicture || null,
            },
          };
        })
      );

      return res.status(200).json({
        success: true,
        data: populatedInvitations,
        message: "Team invitations retrieved successfully",
      });
    } catch (error) {
      console.error("Error fetching team invitations:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to retrieve team invitations",
      });
    }
  }
);

// Response to team invitation (by the invited user)
router.put(
  "/:teamId/invitation/:requestId",
  verifyJWT,
  validateTeamId,
  async (req, res) => {
    try {
      const { teamId, requestId } = req.params;
      const { accept } = req.body;

      if (typeof accept !== "boolean") {
        return res.status(400).json({
          success: false,
          message: "Missing or invalid 'accept' parameter",
        });
      }

      const team = await TeamDetail.findById(teamId);
      if (!team) {
        return res.status(404).json({
          success: false,
          message: "Team not found",
        });
      }

      // Find the invitation
      const invitationIndex = team.joinRequests.findIndex(
        (req) =>
          req._id.toString() === requestId &&
          req.userId.toString() === req.user._id.toString() &&
          req.status === "invited"
      );

      if (invitationIndex === -1) {
        return res.status(404).json({
          success: false,
          message: "Invitation not found or you are not authorized",
        });
      }

      // Check if team is full before accepting
      if (accept && team.TeamMembers.length >= 5) {
        return res.status(400).json({
          success: false,
          message: "Team is already full (maximum 5 members)",
        });
      }

      // Update the invitation
      team.joinRequests[invitationIndex].status = accept
        ? "accepted"
        : "rejected";
      team.joinRequests[invitationIndex].respondedAt = new Date();

      if (accept) {
        // Add user to team
        team.TeamMembers.push({
          userId: req.user._id,
          role: "Member",
          status: "Active",
          points: 0,
        });

        // Update user's team reference
        await UserModel.findByIdAndUpdate(
          req.user._id,
          { $set: { teamId: team._id } },
          { new: true }
        );

        // Update UserDetail
        await UserDetail.findOneAndUpdate(
          { userId: req.user._id },
          { $set: { teamId: team._id } }
        );
      }

      await team.save();

      return res.status(200).json({
        success: true,
        data: {
          teamId,
          requestId,
          status: accept ? "accepted" : "rejected",
        },
        message: accept ? "You have joined the team!" : "Invitation declined",
      });
    } catch (error) {
      console.error("Error responding to invitation:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to process invitation response",
      });
    }
  }
);

// Add new endpoints
 // New detailed members endpoint
router.get("/:teamId/chat/:channelName", verifyJWT, getTeamChannelMessages); // Channel messages endpoint

// Add the new route for team invitations
router.post("/:teamId/invite", verifyJWT, validateTeamId, sendTeamInvitation);

// Add the missing route for responding to join requests
router.put(
  "/:teamId/join-request/:requestId",
  verifyJWT,
  validateTeamId,
  async (req, res, next) => {
    try {
      const { teamId, requestId } = req.params;
      const { status } = req.body;

      if (!status || !["accepted", "rejected"].includes(status)) {
        return res.status(400).json({
          success: false,
          message: "Invalid status. Must be 'accepted' or 'rejected'",
        });
      }

      next();
    } catch (error) {
      console.error("Error in join request response pre-check:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error while processing join request response",
      });
    }
  },
  respondToJoinRequest
);

export default router;
