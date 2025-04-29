import asyncHandler from "../utils/asyncHandler.js";
import ApiError from "../utils/ApiError.js";
import TeamDetail from "../models/TeamDetail.model.js";
import mongoose from "mongoose";

// Middleware to check if team exists
export const validateTeamId = asyncHandler(async (req, res, next) => {
  const { teamId } = req.params;

  if (!teamId || !mongoose.Types.ObjectId.isValid(teamId)) {
    throw new ApiError(400, "Invalid team ID");
  }

  const team = await TeamDetail.findById(teamId);

  if (!team) {
    throw new ApiError(404, "Team not found");
  }

  // Add team to request object for downstream middleware and controllers
  req.team = team;
  next();
});

// Middleware to check if user is team creator
export const isTeamCreator = asyncHandler(async (req, res, next) => {
  if (req.team.TeamCreaterId.toString() !== req.user._id.toString()) {
    throw new ApiError(403, "You are not authorized to perform this action");
  }

  next();
});

// Middleware to check if user is team member
export const isTeamMember = asyncHandler(async (req, res, next) => {
  const isMember = req.team.TeamMembers.some(
    (member) => member.userId.toString() === req.user._id.toString()
  );

  if (!isMember) {
    throw new ApiError(403, "You are not a member of this team");
  }

  next();
});

// Middleware to check if team has available slots
export const hasAvailableSlots = asyncHandler(async (req, res, next) => {
  if (req.team.TeamMembers.length >= 5) {
    throw new ApiError(
      400,
      "Team already has the maximum number of members (5)"
    );
  }

  next();
});
