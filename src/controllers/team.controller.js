import asyncHandler from "../utils/asyncHandler.js";
import mongoose from "mongoose";
import ApiError from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import TeamDetail from "../models/TeamDetail.model.js";
import User from "../models/User.model.js";
import UserDetail from "../models/UserDetail.model.js";
import uploadOnCloudinary from "../utils/fileUpload.js";
import { errorHandler } from "../utils/error.js";
import { updateTeamLeaderboard } from "../utils/leaderboardHelper.js";
import UserInvite from "../models/userInvite.model.js";

// Create a new team
const createTeam = asyncHandler(async (req, res) => {
  const { TeamName, TeamDescription } = req.body;
  console.log("Received team creation request:", req.body);

  // Check if the request body is being properly parsed
  console.log("Request body:", req.body);
  console.log("Team name:", TeamName);
  console.log("Files:", req.files);

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

  // Invite User to the team

  console.log(req.body.TeamMembers);

  if (req.body.TeamMembers && req.body.TeamMembers.length > 0) {
    req.body.TeamMembers.map(async (memberId) => {
      const inviteUser = await UserInvite.create({
        userId: memberId,
        teamId: team._id,
        message: "You have been invited to join a team",
        status: "pending",
      });

      if (!inviteUser) {
        throw new ApiError(500, "Failed to invite user");
      }
    });
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

  // Validate MongoDB ID format
  if (!teamId || !mongoose.Types.ObjectId.isValid(teamId)) {
    return res.status(400).json({
      success: false,
      message: "Invalid team ID format",
    });
  }

  try {
    const team = await TeamDetail.findById(teamId)
      .populate("TeamCreaterId", "username email avatar profilePicture")
      .populate({
        path: "TeamMembers.userId",
        model: "User",
        select: "email profilePicture phoneNumber",
      })
      .populate("projectId")
      .populate("achievementId");

    if (!team) {
      return res.status(404).json({
        success: false,
        message: "Team not found",
      });
    }

    // Enhance team members with UserDetail info for each member
    const enhancedTeamMembers = await Promise.all(
      team.TeamMembers.map(async (member) => {
        // Get additional user details from UserDetail model
        const userDetail = await UserDetail.findOne({
          userId: member.userId._id,
        }).select("name phoneNumber");

        return {
          _id: member._id,
          userId: member.userId._id,
          role: member.role,
          status: member.status,
          points: member.points || 0,
          email: member.userId.email,
          profilePicture: member.userId.profilePicture,
          phoneNumber: member.userId.phoneNumber || userDetail?.phoneNumber,
          name:
            userDetail?.name ||
            (member.userId.email
              ? member.userId.email.split("@")[0]
              : "Unknown User"),
          skills: member.skills || [],
          social: member.social || {},
        };
      })
    );

    // Replace the team members with our enhanced data
    const teamResponse = team.toObject();
    teamResponse.TeamMembers = enhancedTeamMembers;

    return res
      .status(200)
      .json(new ApiResponse(200, teamResponse, "Team fetched successfully"));
  } catch (error) {
    console.error(`Error fetching team ${teamId}:`, error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch team data due to server error",
    });
  }
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

/**
 * Add a member to team (for team leader use)
 * @route POST /api/v1/team/:teamId/members
 */
const addTeamMember = asyncHandler(async (req, res) => {
  const { teamId } = req.params;
  const { userId } = req.body;

  if (!teamId || !mongoose.Types.ObjectId.isValid(teamId)) {
    throw new ApiError(400, "Invalid team ID");
  }

  if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
    throw new ApiError(400, "Invalid user ID");
  }

  // Find the team
  const team = await TeamDetail.findById(teamId);
  if (!team) {
    throw new ApiError(404, "Team not found");
  }

  // Check if the requesting user is the team creator
  if (team.TeamCreaterId.toString() !== req.user._id.toString()) {
    throw new ApiError(403, "You are not authorized to add team members");
  }

  // Check if team is full
  if (team.TeamMembers.length >= 5) {
    throw new ApiError(400, "Team is already full (5 members maximum)");
  }

  // Check if user already belongs to a team
  const userToAdd = await User.findById(userId);
  if (!userToAdd) {
    throw new ApiError(404, "User not found");
  }

  if (userToAdd.teamId) {
    throw new ApiError(400, "User already belongs to a team");
  }

  // Check if user is already a member of this team
  const isAlreadyMember = team.TeamMembers.some(
    (member) => member.userId.toString() === userId
  );

  if (isAlreadyMember) {
    throw new ApiError(409, "User is already a member of this team");
  }

  // Add user to team
  team.TeamMembers.push({
    userId,
    role: "Member",
    status: "Active",
    points: 0,
  });

  // Update the user's team reference
  await User.findByIdAndUpdate(
    userId,
    { $set: { teamId: team._id } },
    { new: true }
  );

  // Update UserDetail
  await UserDetail.findOneAndUpdate({ userId }, { $set: { teamId: team._id } });

  await team.save();

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { teamId, userId },
        "User added to team successfully"
      )
    );
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

  // check if user is a leader
  const isLeader = team.TeamMembers.some(
    (member) =>
      member._id.toString() === memberId.toString() && member.role === "Leader"
  );
  if (isLeader) {
    throw new ApiError(400, "Cannot remove team leader");
  }

  // Only team creator can remove members
  if (team.TeamCreaterId.toString() !== req.user._id.toString()) {
    throw new ApiError(403, "You are not authorized to update this team");
  }

  // Cannot remove team creator
  if (memberId === team.TeamCreaterId.toString()) {
    throw new ApiError(400, "Cannot remove team creator");
  }

  console.log("memberId", memberId);

  let userId = null;

  // Remove member
  team.TeamMembers = team.TeamMembers.filter((member) => {
    if (member._id.toString() === memberId) {
      userId = member.userId;
      return false;
    }
    return true;
  });

  console.log("userId", userId);

  // Check if userId was found and set teamId to null
  if (userId) {
    await User.findByIdAndUpdate(
      userId,
      { $unset: { teamId: null } },
      { new: true }
    )
      .then((user) => {
        if (!user) {
          throw new ApiError(404, "User not found");
        }
        console.log("User teamId removed successfully");
      })
      .catch((error) => {
        console.error("Error removing teamId from user:", error);
        throw new ApiError(500, "Failed to remove teamId from user");
      });
  }
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

/**
 * Add team message
 */
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

  try {
    // Fetch only the essential user data we need
    const [userData, userDetailData] = await Promise.all([
      // Get email and profilePicture from user collection
      User.find({ _id: { $in: memberIds } })
        .select("_id email profilePicture")
        .lean(),

      // Get name and interests from UserDetail collection
      UserDetail.find({ userId: { $in: memberIds } })
        .select("userId name interests profilePicture") // Add profilePicture from UserDetail as well
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
  } catch (error) {
    console.error("Error in getTeamWithMembers:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch team member details",
    });
  }
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

/**
 * Request to join a team
 * @route POST /api/v1/team/:teamId/join-request
 */
const requestToJoinTeam = asyncHandler(async (req, res) => {
  try {
    const { teamId } = req.params;
    const { message = "" } = req.body;

    // Extra safety check for team existence
    const team = await TeamDetail.findById(teamId);
    if (!team) {
      return res.status(404).json({
        success: false,
        message: "Team not found",
      });
    }

    // Check if team is full - ensure TeamMembers exists and is an array
    if (
      team.TeamMembers &&
      Array.isArray(team.TeamMembers) &&
      team.TeamMembers.length >= 5
    ) {
      return res.status(400).json({
        success: false,
        message: "Team is already full (5 members maximum)",
      });
    }

    // Double-check user isn't already a member - handle case if TeamMembers is undefined
    const isMember =
      team.TeamMembers && Array.isArray(team.TeamMembers)
        ? team.TeamMembers.some(
            (member) => member.userId.toString() === req.user._id.toString()
          )
        : false;

    if (isMember) {
      return res.status(409).json({
        success: false,
        message: "You are already a member of this team",
      });
    }

    // Double-check for existing request - ensure joinRequests exists and is an array
    const joinRequests = team.joinRequests || [];
    const existingRequest = joinRequests.find
      ? joinRequests.find(
          (request) => request.userId.toString() === req.user._id.toString()
        )
      : undefined;

    if (existingRequest) {
      return res.status(409).json({
        success: false,
        message: "You have already requested to join this team",
      });
    }

    // Initialize joinRequests if it doesn't exist
    if (!team.joinRequests) {
      team.joinRequests = [];
    }

    // Add join request with proper error handling
    team.joinRequests.push({
      userId: req.user._id,
      message,
      status: "pending",
      requestedAt: new Date(),
    });

    await team.save();

    return res.status(200).json({
      success: true,
      data: { requestId: team.joinRequests[team.joinRequests.length - 1]._id },
      message: "Join request sent successfully",
    });
  } catch (error) {
    console.error("Error in requestToJoinTeam:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error while processing join request",
    });
  }
});

/**
 * Get all pending join requests for a team
 * @route GET /api/v1/team/:teamId/join-requests
 */
const getTeamJoinRequests = async (req, res, next) => {
  try {
    const { teamId } = req.params;

    // Find the team and validate ownership
    const team = await TeamDetail.findById(teamId);

    if (!team) {
      return next(errorHandler(404, "Team not found"));
    }

    // Check if user is authorized to view team requests
    const isTeamLeader = team.TeamMembers.some(
      (member) =>
        member.userId.toString() === req.user._id.toString() &&
        member.role === "Leader"
    );

    if (!isTeamLeader) {
      return next(
        errorHandler(403, "Only team leaders can view join requests")
      );
    }

    // Get join requests and populate with user data
    const joinRequests = team.joinRequests;

    // Populate each request with user data
    const populatedRequests = await Promise.all(
      joinRequests.map(async (request) => {
        // Find basic user data
        const user = await User.findById(request.userId).select(
          "email profilePicture"
        );

        // Find user details for name and additional info
        const userDetail = await UserDetail.findOne({
          userId: request.userId,
        }).select("name");

        return {
          _id: request._id,
          userId: request.userId,
          message: request.message,
          status: request.status,
          requestedAt: request.requestedAt,
          respondedAt: request.respondedAt,
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
      data: populatedRequests,
      message: "Join requests retrieved successfully",
    });
  } catch (error) {
    console.error("Error fetching join requests:", error);
    return next(errorHandler(500, "Failed to retrieve join requests"));
  }
};

/**
 * Respond to a join request (accept/reject)
 * @route PUT /api/v1/team/:teamId/join-request/:requestId
 */
const respondToJoinRequest = asyncHandler(async (req, res) => {
  const { teamId, requestId } = req.params;
  const { status } = req.body;

  if (!status || !["accepted", "rejected"].includes(status)) {
    throw new ApiError(400, "Invalid status. Must be 'accepted' or 'rejected'");
  }

  const team = await TeamDetail.findById(teamId);

  // Find the request
  const requestIndex = team.joinRequests.findIndex(
    (req) => req._id.toString() === requestId
  );

  if (requestIndex === -1) {
    throw new ApiError(404, "Join request not found");
  }

  const joinRequest = team.joinRequests[requestIndex];

  // Check if the team is full before accepting
  if (status === "accepted" && team.TeamMembers.length >= 5) {
    throw new ApiError(
      400,
      "Cannot accept request. Team is already full (5 members maximum)"
    );
  }

  // Update the request status
  team.joinRequests[requestIndex].status = status;
  team.joinRequests[requestIndex].respondedAt = new Date();

  if (status === "accepted") {
    // Add user to team
    team.TeamMembers.push({
      userId: joinRequest.userId,
      role: "Member",
      status: "Active",
      points: 0,
    });

    // Update user's team reference
    await User.findByIdAndUpdate(
      joinRequest.userId,
      { $set: { teamId: team._id } },
      { new: true }
    );

    // Also update UserDetail
    await UserDetail.findOneAndUpdate(
      { userId: joinRequest.userId },
      { $set: { teamId: team._id } }
    );
  }

  await team.save();

  return res
    .status(200)
    .json(
      new ApiResponse(200, { requestId, status }, `Join request ${status}`)
    );
});

// Get all join requests made by the current user
const getUserJoinRequests = asyncHandler(async (req, res) => {
  try {
    const userId = req.user._id;

    // Find teams where the user has join requests
    const teams = await TeamDetail.find({
      "joinRequests.userId": userId,
    }).select("TeamName TeamLogo TeamDescription joinRequests");

    // Format the response data
    const userRequests = [];

    teams.forEach((team) => {
      const userJoinRequests = team.joinRequests.filter(
        (request) => request.userId.toString() === userId.toString()
      );

      userJoinRequests.forEach((request) => {
        userRequests.push({
          teamId: team._id,
          teamName: team.TeamName || "Unknown Team",
          teamLogo: team.TeamLogo || null,
          requestId: request._id,
          status: request.status || "pending",
          message: request.message || "",
          requestedAt: request.requestedAt || new Date(),
          respondedAt: request.respondedAt,
        });
      });
    });

    // Also fetch invitations sent to the user (where status is "invited")
    const invitedTeams = await TeamDetail.find({
      joinRequests: {
        $elemMatch: {
          userId: userId,
          status: "invited",
        },
      },
    }).select("TeamName TeamLogo TeamDescription joinRequests");

    invitedTeams.forEach((team) => {
      const invitations = team.joinRequests.filter(
        (req) =>
          req.userId.toString() === userId.toString() &&
          req.status === "invited"
      );

      invitations.forEach((invitation) => {
        userRequests.push({
          teamId: team._id,
          teamName: team.TeamName || "Unknown Team",
          teamLogo: team.TeamLogo || null,
          requestId: invitation._id,
          status: "invited",
          message: invitation.message || "",
          requestedAt: invitation.requestedAt || new Date(),
          respondedAt: invitation.respondedAt,
          isInvitation: true,
        });
      });
    });

    // Always return success even if empty array
    return res.status(200).json({
      success: true,
      data: userRequests,
      message: "User join requests fetched successfully",
    });
  } catch (error) {
    console.error("Error in getUserJoinRequests:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch join requests",
    });
  }
});

/**
 * Cancel a join request
 * @route DELETE /api/v1/team/:teamId/join-request
 */
const cancelJoinRequest = asyncHandler(async (req, res) => {
  const { teamId } = req.params;
  const userId = req.user._id;

  const team = await TeamDetail.findById(teamId);

  if (!team) {
    throw new ApiError(404, "Team not found");
  }

  // Filter out the user's request
  team.joinRequests = team.joinRequests.filter(
    (request) => request.userId.toString() !== userId.toString()
  );

  await team.save();

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Join request cancelled successfully"));
});

/**
 * Send invitation to join a team
 * @route POST /api/v1/team/:teamId/invite
 */
const sendTeamInvitation = asyncHandler(async (req, res) => {
  const { teamId } = req.params;
  const { userId, message = "" } = req.body;

  if (!teamId || !mongoose.Types.ObjectId.isValid(teamId)) {
    throw new ApiError(400, "Invalid team ID");
  }

  if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
    throw new ApiError(400, "Invalid user ID");
  }

  // Find the team
  const team = await TeamDetail.findById(teamId);
  if (!team) {
    throw new ApiError(404, "Team not found");
  }

  // Check if the requesting user is the team creator or has admin rights
  if (team.TeamCreaterId.toString() !== req.user._id.toString()) {
    throw new ApiError(403, "You are not authorized to send team invitations");
  }

  // Check if team is full
  if (team.TeamMembers.length >= 5) {
    throw new ApiError(400, "Team is already full (5 members maximum)");
  }

  // Check if the invited user already belongs to a team
  const invitedUser = await User.findById(userId);
  if (!invitedUser) {
    throw new ApiError(404, "Invited user not found");
  }

  if (invitedUser.teamId) {
    throw new ApiError(400, "User already belongs to a team");
  }

  // Check if user is already a member of this team
  const isAlreadyMember = team.TeamMembers.some(
    (member) => member.userId.toString() === userId
  );

  if (isAlreadyMember) {
    throw new ApiError(409, "User is already a member of this team");
  }

  // Check if a request already exists
  const existingRequest = team.joinRequests?.find(
    (req) => req.userId.toString() === userId
  );

  if (existingRequest) {
    throw new ApiError(409, "A join request already exists for this user");
  }

  // Add the invitation as a special type of join request
  if (!team.joinRequests) {
    team.joinRequests = [];
  }

  team.joinRequests.push({
    userId,
    message,
    status: "invited", // Special status to indicate it was an invitation rather than a request
    requestedAt: new Date(),
    invitedBy: req.user._id,
  });

  await team.save();

  // Could send notification/email to invited user here

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { requestId: team.joinRequests[team.joinRequests.length - 1]._id },
        "Team invitation sent successfully"
      )
    );
});

// Update team points
const updateTeamPoints = asyncHandler(async (req, res) => {
  const { teamId } = req.params;
  const { points } = req.body;

  if (!teamId || !mongoose.Types.ObjectId.isValid(teamId)) {
    throw new ApiError(400, "Invalid team ID");
  }

  if (isNaN(points)) {
    throw new ApiError(400, "Points must be a number");
  }

  const team = await TeamDetail.findById(teamId);

  if (!team) {
    throw new ApiError(404, "Team not found");
  }

  // Only team creator can update points (or you can modify this permission)
  if (team.TeamCreaterId.toString() !== req.user._id.toString()) {
    throw new ApiError(403, "You are not authorized to update team points");
  }

  // Update team points
  team.points = points;
  await team.save();

  // Update leaderboard
  await updateTeamLeaderboard(teamId, points);

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { teamId, points },
        "Team points updated successfully"
      )
    );
});

// Make sure all these functions are defined in the file
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
  getTeamWithMembers,
  getTeamChannelMessages,
  requestToJoinTeam,
  getTeamJoinRequests,
  respondToJoinRequest,
  getUserJoinRequests,
  cancelJoinRequest,
  sendTeamInvitation,
  updateTeamPoints,
};
