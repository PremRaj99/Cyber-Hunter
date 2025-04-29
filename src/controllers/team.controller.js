import ApiError from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import TeamDetail from "../models/TeamDetail.model.js";
import User from "../models/User.model.js";
import UserDetail from "../models/UserDetail.model.js";
import Individual from "../models/Individual.model.js";
import mongoose from "mongoose";
import asyncHandler from "../utils/asyncHandler.js";
import uploadOnCloudinary from "../utils/fileUpload.js";

// Create a new team
const createTeam = asyncHandler(async (req, res) => {
  const { TeamName, TeamDescription } = req.body;
  console.log("Received team creation request:", req.body);

  // Validate input
  if (!TeamName) {
    throw new ApiError(400, "Team name is required");
  }

  // Check if team name already exists
  const existingTeam = await TeamDetail.findOne({ TeamName });
  if (existingTeam) {
    throw new ApiError(409, "Team with this name already exists");
  }

  // Parse team members if they are strings
  let teamMembers = [];
  if (req.body.TeamMembers) {
    // Handle multiple members
    if (Array.isArray(req.body.TeamMembers)) {
      teamMembers = req.body.TeamMembers.map((memberId) => ({
        userId: memberId,
        role: "Member",
        status: "Active",
        points: 0,
      }));
    }
    // Handle single member
    else if (typeof req.body.TeamMembers === "string") {
      teamMembers = [
        {
          userId: req.body.TeamMembers,
          role: "Member",
          status: "Active",
          points: 0,
        },
      ];
    }
  }

  // Parse other arrays
  const techStack = Array.isArray(req.body.techStack)
    ? req.body.techStack
    : req.body.techStack
      ? [req.body.techStack]
      : [];

  const interests = Array.isArray(req.body.interests)
    ? req.body.interests
    : req.body.interests
      ? [req.body.interests]
      : [];

  // Process team logo if provided
  let TeamLogo = undefined;
  if (req.files && req.files.TeamLogo) {
    const teamLogoFile = req.files.TeamLogo[0];
    const uploadResult = await uploadOnCloudinary(teamLogoFile.path);
    if (uploadResult) {
      TeamLogo = uploadResult.url;
    }
  }

  // Create team with creator as first member
  const team = await TeamDetail.create({
    TeamCreaterId: req.user._id,
    TeamName,
    TeamDescription: TeamDescription || "",
    TeamLogo,
    TeamMembers: [
      {
        userId: req.user._id,
        role: "Leader",
        status: "Active",
        points: 0,
      },
      ...teamMembers,
    ],
    techStack,
    interests,
  });

  if (!team) {
    throw new ApiError(500, "Failed to create team");
  }

  // After creating the team
  await User.findByIdAndUpdate(
    req.user._id,
    { $set: { teamId: team._id } },
    { new: true }
  );

  // Add this to also update UserDetail
  await UserDetail.findOneAndUpdate(
    { userId: req.user._id },
    { $set: { teamId: team._id } }
  );

  return res
    .status(201)
    .json(new ApiResponse(201, team, "Team created successfully"));
});

// Get all teams
const getAllTeams = asyncHandler(async (req, res) => {
  const teams = await TeamDetail.find({})
    .populate("TeamCreaterId", "username email avatar")
    .sort({ points: -1 });

  return res
    .status(200)
    .json(new ApiResponse(200, teams, "Teams fetched successfully"));
});

// Get team by ID
const getTeamById = asyncHandler(async (req, res) => {
  const { teamId } = req.params;

  if (!teamId || !mongoose.Types.ObjectId.isValid(teamId)) {
    throw new ApiError(400, "Invalid team ID");
  }

  const team = await TeamDetail.findById(teamId)
    .populate("TeamCreaterId", "username email avatar")
    .populate("TeamMembers.userId", "name email profilePicture") // <-- populate user details for each member
    .populate("projectId") // <-- populate project details
    .populate("achievementId");

  if (!team) {
    throw new ApiError(404, "Team not found");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, team, "Team fetched successfully"));
});

// Update team
const updateTeam = asyncHandler(async (req, res) => {
  const { teamId } = req.params;
  const {
    TeamName,
    TeamDescription,
    TeamLogo,
    techStack,
    fieldOfExcellence,
    interests,
  } = req.body;

  if (!teamId || !mongoose.Types.ObjectId.isValid(teamId)) {
    throw new ApiError(400, "Invalid team ID");
  }

  const team = await TeamDetail.findById(teamId);

  if (!team) {
    throw new ApiError(404, "Team not found");
  }

  // Only team creator can update team
  if (team.TeamCreaterId.toString() !== req.user._id.toString()) {
    throw new ApiError(403, "You are not authorized to update this team");
  }

  // Check if updating team name and if it exists
  if (TeamName && TeamName !== team.TeamName) {
    const nameExists = await TeamDetail.findOne({ TeamName });
    if (nameExists) {
      throw new ApiError(409, "Team name already taken");
    }
  }

  // Update team fields
  team.TeamName = TeamName || team.TeamName;
  team.TeamDescription = TeamDescription || team.TeamDescription;
  team.TeamLogo = TeamLogo || team.TeamLogo;

  if (techStack) team.techStack = techStack;
  if (fieldOfExcellence) team.fieldOfExcellence = fieldOfExcellence;
  if (interests) team.interests = interests;

  await team.save();

  return res
    .status(200)
    .json(new ApiResponse(200, team, "Team updated successfully"));
});

// Add team member
const addTeamMember = asyncHandler(async (req, res) => {
  const { teamId } = req.params;
  const { userId, role = "Member", skills = [] } = req.body;

  if (
    !teamId ||
    !mongoose.Types.ObjectId.isValid(teamId) ||
    !userId ||
    !mongoose.Types.ObjectId.isValid(userId)
  ) {
    throw new ApiError(400, "Invalid team ID or user ID");
  }

  const team = await TeamDetail.findById(teamId);

  if (!team) {
    throw new ApiError(404, "Team not found");
  }

  // Only team creator can add members
  if (team.TeamCreaterId.toString() !== req.user._id.toString()) {
    throw new ApiError(403, "You are not authorized to update this team");
  }

  // Check if user exists
  const user = await User.findById(userId);
  if (!user) {
    throw new ApiError(404, "User not found");
  }

  // Check if user is already in team
  if (team.TeamMembers.some((member) => member.userId.toString() === userId)) {
    throw new ApiError(409, "User is already a team member");
  }

  // Check if team already has 5 members
  if (team.TeamMembers.length >= 5) {
    throw new ApiError(
      400,
      "Team already has the maximum number of members (5)"
    );
  }

  // Add member to team
  team.TeamMembers.push({
    userId,
    role,
    status: "Active",
    points: 0,
    skills,
  });

  await team.save;

  // Update user's team reference
  await User.findByIdAndUpdate(
    userId,
    { $set: { teamId: team._id } },
    { new: true }
  );

  return res
    .status(200)
    .json(new ApiResponse(200, team, "Team member added successfully"));
});

// Remove team member
const removeTeamMember = asyncHandler(async (req, res) => {
  const { teamId, memberId } = req.params;

  if (
    !teamId ||
    !mongoose.Types.ObjectId.isValid(teamId) ||
    !memberId ||
    !mongoose.Types.ObjectId.isValid(memberId)
  ) {
    throw new ApiError(400, "Invalid team ID or member ID");
  }

  const team = await TeamDetail.findById(teamId);

  if (!team) {
    throw new ApiError(404, "Team not found");
  }

  // Only team creator can remove members
  if (team.TeamCreaterId.toString() !== req.user._id.toString()) {
    throw new ApiError(403, "You are not authorized to update this team");
  }

  // Cannot remove team creator
  if (memberId === team.TeamCreaterId.toString()) {
    throw new ApiError(400, "Cannot remove team creator");
  }

  // Remove member
  team.TeamMembers = team.TeamMembers.filter(
    (member) => member.userId.toString() !== memberId
  );

  await team.save();

  // Update user's team reference
  await User.findByIdAndUpdate(
    memberId,
    { $unset: { teamId: "" } },
    { new: true }
  );

  return res
    .status(200)
    .json(new ApiResponse(200, team, "Team member removed successfully"));
});

// Update team tech stack
const updateTechStack = asyncHandler(async (req, res) => {
  const { teamId } = req.params;
  const { techStack } = req.body;

  if (!teamId || !mongoose.Types.ObjectId.isValid(teamId)) {
    throw new ApiError(400, "Invalid team ID");
  }

  if (!techStack || !Array.isArray(techStack)) {
    throw new ApiError(400, "Tech stack must be an array");
  }

  const team = await TeamDetail.findById(teamId);

  if (!team) {
    throw new ApiError(404, "Team not found");
  }

  // Only team members can update tech stack
  const isMember = team.TeamMembers.some(
    (member) => member.userId.toString() === req.user._id.toString()
  );

  if (!isMember) {
    throw new ApiError(403, "You are not a member of this team");
  }

  team.techStack = techStack;
  await team.save();

  return res
    .status(200)
    .json(new ApiResponse(200, team, "Tech stack updated successfully"));
});

// Add team message
const addTeamMessage = asyncHandler(async (req, res) => {
  const { teamId } = req.params;
  const { message, attachments = [] } = req.body;

  if (!teamId || !mongoose.Types.ObjectId.isValid(teamId)) {
    throw new ApiError(400, "Invalid team ID");
  }

  if (!message) {
    throw new ApiError(400, "Message is required");
  }

  const team = await TeamDetail.findById(teamId);

  if (!team) {
    throw new ApiError(404, "Team not found");
  }

  // Only team members can send messages
  const isMember = team.TeamMembers.some(
    (member) => member.userId.toString() === req.user._id.toString()
  );

  if (!isMember) {
    throw new ApiError(403, "You are not a member of this team");
  }

  // Add message to team
  team.chatMessages.push({
    userId: req.user._id,
    message,
    timestamp: new Date(),
    attachments,
  });

  await team.save();

  return res
    .status(201)
    .json(
      new ApiResponse(
        201,
        team.chatMessages[team.chatMessages.length - 1],
        "Message sent successfully"
      )
    );
});

// Get team leaderboard
const getTeamLeaderboard = asyncHandler(async (req, res) => {
  const teams = await TeamDetail.find()
    .sort({ points: -1 })
    .limit(10)
    .select("TeamName TeamLogo points");

  return res
    .status(200)
    .json(new ApiResponse(200, teams, "Team leaderboard fetched successfully"));
});

// Delete team
const deleteTeam = asyncHandler(async (req, res) => {
  const { teamId } = req.params;

  if (!teamId || !mongoose.Types.ObjectId.isValid(teamId)) {
    throw new ApiError(400, "Invalid team ID");
  }

  const team = await TeamDetail.findById(teamId);

  if (!team) {
    throw new ApiError(404, "Team not found");
  }

  // Only team creator can delete team
  if (team.TeamCreaterId.toString() !== req.user._id.toString()) {
    throw new ApiError(403, "You are not authorized to delete this team");
  }

  // Remove team references from all members
  for (const member of team.TeamMembers) {
    await User.findByIdAndUpdate(
      member.userId,
      { $unset: { teamId: "" } },
      { new: true }
    );
  }

  // Delete the team
  await TeamDetail.findByIdAndDelete(teamId);

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Team deleted successfully"));
});

// Get teams for the current authenticated user
const getUserTeams = asyncHandler(async (req, res) => {
  // Get user ID from the authenticated request
  const userId = req.user._id;

  // Find teams where this user is a member
  const teams = await TeamDetail.find({
    "TeamMembers.userId": userId,
  }).populate("TeamCreaterId", "name email profilePicture");

  if (!teams || teams.length === 0) {
    return res
      .status(200)
      .json(new ApiResponse(200, [], "User is not a member of any teams"));
  }

  return res
    .status(200)
    .json(new ApiResponse(200, teams, "User teams fetched successfully"));
});

/**
 * Get team with detailed member information
 * @route GET /api/v1/team/:teamId/members-detail
 */
const getTeamWithMembers = asyncHandler(async (req, res) => {
  const { teamId } = req.params;

  if (!teamId || !mongoose.Types.ObjectId.isValid(teamId)) {
    throw new ApiError(400, "Invalid team ID");
  }

  // First find the team - only include the fields we need for the UI
  const team = await TeamDetail.findById(teamId)
    .select(
      "TeamName TeamLogo TeamDescription techStack interests TeamMembers TeamCreaterId projectId"
    )
    .lean();

  if (!team) {
    throw new ApiError(404, "Team not found");
  }

  // Check if user is authorized to view this team
  const isTeamCreator =
    team.TeamCreaterId.toString() === req.user._id.toString();
  const isMember = team.TeamMembers.some(
    (member) => member.userId.toString() === req.user._id.toString()
  );

  if (!isMember && !isTeamCreator) {
    throw new ApiError(
      403,
      "You are not authorized to view this team's details"
    );
  }

  // Enhanced approach: Collect all member IDs
  const memberIds = team.TeamMembers.map((member) => member.userId);

  // Fetch only the essential user data we need
  const [userData, userDetailData, individualData] = await Promise.all([
    // Get email and profilePicture from user collection
    User.find({ _id: { $in: memberIds } })
      .select("_id email profilePicture")
      .lean(),

    // Get name and interests from UserDetail collection
    UserDetail.find({ userId: { $in: memberIds } })
      .select("userId name interests profilePicture") // Add profilePicture from UserDetail as well
      .lean(),

    // Get only points from individual profiles
    Individual.find({ userId: { $in: memberIds } })
      .select("userId point")
      .lean(),
  ]);

  // Map the minimal data we need for each team member
  const enhancedTeamMembers = team.TeamMembers.map((member) => {
    // Find related data for this member
    const user = userData.find(
      (u) => u._id.toString() === member.userId.toString()
    );

    const userDetail = userDetailData.find(
      (ud) => ud.userId && ud.userId.toString() === member.userId.toString()
    );

    const indivData = individualData.find(
      (ind) => ind.userId && ind.userId.toString() === member.userId.toString()
    );

    // Check for profile picture in both User and UserDetail
    const profilePicture = user?.profilePicture || userDetail?.profilePicture;

    // Return only the fields you specifically need
    return {
      _id: member._id,
      userId: member.userId,
      role: member.role,
      status: member.status,
      points: member.points || 0,
      skills: member.skills || [],
      social: member.social || {},

      // User data - include profile picture if available
      userData: {
        email: user?.email,
        profilePicture: profilePicture,
      },

      // UserDetail data - name and interests
      userDetailData: userDetail
        ? {
            name: userDetail.name,
            interests: userDetail.interests || [],
          }
        : null,

      // Individual data - just points
      individualData: indivData
        ? {
            point: indivData.point || 0,
          }
        : { point: 0 },
    };
  });

  // Replace the team members with our enhanced but minimal data
  team.TeamMembers = enhancedTeamMembers;

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        team,
        "Team with comprehensive member information fetched successfully"
      )
    );
});

/**
 * Get messages for a specific team channel
 * @route GET /api/v1/team/:teamId/chat/:channelName
 */
const getTeamChannelMessages = async (req, res, next) => {
  try {
    const { teamId, channelName } = req.params;

    // Find the team
    const team = await TeamDetail.findById(teamId);

    if (!team) {
      return res.status(404).json({
        success: false,
        message: "Team not found",
      });
    }

    // Check if user is a team member
    const isMember = team.TeamMembers.some(
      (member) =>
        member.userId.toString() === req.user._id.toString() ||
        team.TeamCreaterId.toString() === req.user._id.toString()
    );

    if (!isMember) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to access this team's messages",
      });
    }

    // Check if the channel exists
    const channelExists = team.channels.some((ch) => ch.name === channelName);
    if (!channelExists && channelName !== "general") {
      return res.status(404).json({
        success: false,
        message: "Channel not found",
      });
    }

    // Filter messages for this channel
    // If chatMessages has a 'channel' property, filter by that
    // Otherwise, assume all messages without channel are from 'general'
    const messages = team.chatMessages
      .filter((msg) => {
        if (channelName === "general") {
          return !msg.channel || msg.channel === "general";
        }
        return msg.channel === channelName;
      })
      .sort((a, b) => a.timestamp - b.timestamp); // Sort by timestamp

    // Populate user details for each message
    const populatedMessages = await Promise.all(
      messages.map(async (msg) => {
        try {
          const userDetails = await User.findById(msg.userId).select(
            "name profilePicture"
          );
          return {
            id: msg._id,
            message: msg.message,
            timestamp: msg.timestamp,
            reactions: msg.reactions || [],
            attachments: msg.attachments || [],
            userId: userDetails
              ? {
                  _id: userDetails._id,
                  name: userDetails.name,
                  profilePicture: userDetails.profilePicture,
                }
              : { name: "Unknown User" },
          };
        } catch (error) {
          console.error("Error populating user details for message:", error);
          return {
            id: msg._id,
            message: msg.message,
            timestamp: msg.timestamp,
            reactions: msg.reactions || [],
            attachments: msg.attachments || [],
            userId: { name: "Unknown User" },
          };
        }
      })
    );

    return res.status(200).json({
      success: true,
      data: populatedMessages,
      message: `Messages retrieved for channel ${channelName}`,
    });
  } catch (error) {
    console.error("Error getting channel messages:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch channel messages",
    });
  }
};

export {
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
  getTeamWithMembers, // Add the new function to exports
  getTeamChannelMessages, // This was already exported separately
};
