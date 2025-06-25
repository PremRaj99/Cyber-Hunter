import Leaderboard from "../models/Leaderboard.model.js";
import Individual from "../models/Individual.model.js";
import TeamDetail from "../models/TeamDetail.model.js";
import User from "../models/User.model.js";
import UserDetail from "../models/UserDetail.model.js";
import TechStack from "../models/TechStack.model.js";
import Language from "../models/Language.model.js";
import Tag from "../models/Tag.model.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import asyncHandler from "../utils/asyncHandler.js";
import mongoose from "mongoose";
import {
  initializeLeaderboardData,
  registerUserToLeaderboard,
  registerTeamToLeaderboard,
} from "../utils/leaderboardHelper.js";

/**
 * Get leaderboard data with filtering options
 */
export const getLeaderboard = asyncHandler(async (req, res) => {
  const {
    type = "individual",
    search = "",
    techStack,
    language,
    tag,
    page = 1,
    limit = 10,
  } = req.query;

  // Validate type
  if (!["individual", "team"].includes(type)) {
    return res.status(400).json({
      success: false,
      message: "Invalid type parameter. Must be 'individual' or 'team'",
    });
  }

  // Build base query
  let query = { type };
  const skip = (parseInt(page) - 1) * parseInt(limit);

  // Add tech stack filter if provided
  if (techStack) {
    const techStackDoc = await TechStack.findOne({
      content: { $regex: techStack, $options: "i" },
    });
    if (techStackDoc) {
      query.techStacks = techStackDoc._id;
    }
  }

  // Add language filter if provided
  if (language) {
    const languageDoc = await Language.findOne({
      content: { $regex: language, $options: "i" },
    });
    if (languageDoc) {
      query.languages = languageDoc._id;
    }
  }

  // Add tag filter if provided
  if (tag) {
    const tagDoc = await Tag.findOne({
      content: { $regex: tag, $options: "i" },
    });
    if (tagDoc) {
      query.tags = tagDoc._id;
    }
  }

  try {
    // Get paginated results (we'll handle search differently below)
    const leaderboardItems = await Leaderboard.find(query)
      .sort({ points: -1, lastUpdated: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    // If no items found, return empty results
    if (!leaderboardItems || leaderboardItems.length === 0) {
      return res.status(200).json(
        new ApiResponse(
          200,
          {
            results: [],
            topThree: [],
            pagination: {
              page: parseInt(page),
              limit: parseInt(limit),
              totalCount: 0,
              totalPages: 0,
            },
          },
          `${type.charAt(0).toUpperCase() + type.slice(1)} leaderboard fetched successfully`
        )
      );
    }

    // Populate additional information based on type
    let populatedResults = [];
    let totalCount = 0;

    if (type === "individual") {
      // Get ids to fetch in bulk - filter out any null or undefined IDs
      const userIds = leaderboardItems
        .map((item) => item.userId)
        .filter((id) => id != null);

      if (userIds.length === 0) {
        return res.status(200).json(
          new ApiResponse(
            200,
            {
              results: [],
              topThree: [],
              pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                totalCount: 0,
                totalPages: 0,
              },
            },
            "No valid user IDs found in leaderboard"
          )
        );
      }

      // Fetch complete user information with all relevant relationships
      const [users, userDetails, projects] = await Promise.all([
        User.find({ _id: { $in: userIds } })
          .select("email") // Remove profilePicture from User model selection
          .lean(),
        UserDetail.find({ userId: { $in: userIds } })
          .select("name userId profilePicture") // Add profilePicture to UserDetail selection
          .lean(),
        mongoose.connection.db
          .collection("projects")
          .find({
            userId: {
              $in: userIds
                .map((id) => {
                  try {
                    return new mongoose.Types.ObjectId(id.toString());
                  } catch (err) {
                    console.warn(`Invalid ObjectId: ${id}`, err);
                    return null;
                  }
                })
                .filter(Boolean),
            },
          })
          .toArray(),
      ]);

      // Create lookup maps for efficient access - safely handle undefined values
      const userMap = {};
      users.forEach((user) => {
        if (user && user._id) {
          userMap[user._id.toString()] = user;
        }
      });

      const userDetailMap = {};
      userDetails.forEach((detail) => {
        if (detail && detail.userId) {
          userDetailMap[detail.userId.toString()] = detail;
        }
      });

      // Group projects by user ID
      const projectMap = {};
      projects.forEach((project) => {
        if (project && project.userId) {
          const userId = project.userId.toString();
          if (!projectMap[userId]) {
            projectMap[userId] = [];
          }
          projectMap[userId].push(project);
        }
      });

      // Enhance leaderboard items with user information - safely
      populatedResults = leaderboardItems
        .map((item, index) => {
          // Skip items with invalid userId
          if (!item.userId) {
            return null;
          }

          const userId = item.userId.toString();
          const user = userMap[userId] || {};
          const userDetail = userDetailMap[userId] || {};
          const userProjects = projectMap[userId] || [];

          // Extract unique tech stacks and languages from user's projects
          const techStacks = new Set();
          const languages = new Set();

          userProjects.forEach((project) => {
            if (project.techStack && Array.isArray(project.techStack)) {
              project.techStack.forEach((tech) => techStacks.add(tech));
            }
            if (
              project.programmingLanguages &&
              Array.isArray(project.programmingLanguages)
            ) {
              project.programmingLanguages.forEach((lang) =>
                languages.add(lang)
              );
            }
          });

          const techStackList = Array.from(techStacks);
          const languageList = Array.from(languages);

          // Use profilePicture from UserDetail model instead of User model
          return {
            rank: item.rank || index + 1 + skip,
            name:
              userDetail.name || user.email?.split("@")[0] || "Unknown User",
            email: user.email || "No Email",
            points: item.points || 0,
            userId: item.userId,
            profilePicture: userDetail.profilePicture || null, // Get profilePicture from userDetail instead
            techStack:
              techStackList.length > 0
                ? techStackList.length === 1
                  ? techStackList[0]
                  : `${techStackList[0]} +${techStackList.length - 1}`
                : "Not specified",
            language:
              languageList.length > 0
                ? languageList.length === 1
                  ? languageList[0]
                  : `${languageList[0]} +${languageList.length - 1}`
                : "Not specified",
          };
        })
        .filter(Boolean); // Remove any null entries

      // Sort the results by rank ascending (lowest rank number first)
      populatedResults.sort((a, b) => (a.rank || 999) - (b.rank || 999));

      // Apply search filter now to both name and email
      if (search) {
        populatedResults = populatedResults.filter(
          (item) =>
            (item.name &&
              item.name.toLowerCase().includes(search.toLowerCase())) ||
            (item.email &&
              item.email.toLowerCase().includes(search.toLowerCase()))
        );
      }

      // Get the filtered total count
      totalCount = populatedResults.length;

      // Apply pagination after filtering
      populatedResults = populatedResults.slice(0, parseInt(limit));
    } else {
      // For teams - the existing code with safety checks
      const teamIds = leaderboardItems
        .map((item) => item.teamId)
        .filter((id) => id != null);

      if (teamIds.length === 0) {
        return res.status(200).json(
          new ApiResponse(
            200,
            {
              results: [],
              topThree: [],
              pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                totalCount: 0,
                totalPages: 0,
              },
            },
            "No valid team IDs found in leaderboard"
          )
        );
      }

      let teams = [];

      try {
        teams = await TeamDetail.find({ _id: { $in: teamIds } })
          .select("TeamName TeamLogo TeamMembers")
          .lean();
      } catch (error) {
        console.error("Error fetching teams:", error);
        // Continue with empty array if query fails
      }

      const teamMap = {};
      teams.forEach((team) => {
        if (team && team._id) {
          teamMap[team._id.toString()] = team;
        }
      });

      populatedResults = leaderboardItems
        .map((item, index) => {
          if (!item || !item.teamId) {
            // Skip invalid items
            return null;
          }

          const teamId = item.teamId.toString();
          const team = teamMap[teamId] || {};

          return {
            rank: item.rank || index + 1 + skip,
            name: team.TeamName || "Unknown Team",
            points: item.points || 0,
            teamId: item.teamId,
            teamLogo: team.TeamLogo || null,
            members: team.TeamMembers?.length || 0,
            techStack: item.techStacks ? "Multiple" : "Not specified",
          };
        })
        .filter(Boolean); // Remove null entries

      // Apply search filter if needed
      if (search) {
        populatedResults = populatedResults.filter((item) =>
          item.name.toLowerCase().includes(search.toLowerCase())
        );
      }

      totalCount = populatedResults.length;
    }

    // For the top 3 results, we'll get them separately to display on podium
    let topThree = [];
    if (parseInt(page) === 1 && populatedResults.length > 0) {
      // Get the first 3 elements after sorting by rank
      topThree = [...populatedResults]
        .sort((a, b) => (a.rank || 999) - (b.rank || 999))
        .slice(0, 3);
    }

    return res.status(200).json(
      new ApiResponse(
        200,
        {
          results: populatedResults,
          topThree,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            totalCount,
            totalPages: Math.ceil(totalCount / parseInt(limit)),
          },
        },
        `${type.charAt(0).toUpperCase() + type.slice(1)} leaderboard fetched successfully`
      )
    );
  } catch (error) {
    console.error("Leaderboard error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch leaderboard data",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
});

/**
 * Update leaderboard rankings
 * This function should be called periodically or when points are updated
 */
export const updateLeaderboardRankings = asyncHandler(
  async (req, res, silent = false) => {
    try {
      // Update individual rankings
      const individuals = await Individual.find()
        .select("userId point")
        .sort({ point: -1 })
        .lean();

      // Process each individual
      for (let i = 0; i < individuals.length; i++) {
        const individual = individuals[i];

        // Find or create leaderboard entry
        await Leaderboard.findOneAndUpdate(
          {
            type: "individual",
            userId: individual.userId,
          },
          {
            points: individual.point,
            rank: i + 1,
            lastUpdated: new Date(),
          },
          {
            upsert: true,
            new: true,
          }
        );
      }

      // Update team rankings
      const teams = await TeamDetail.find()
        .select("_id points")
        .sort({ points: -1 })
        .lean();

      // Process each team
      for (let i = 0; i < teams.length; i++) {
        const team = teams[i];

        // Find or create leaderboard entry
        await Leaderboard.findOneAndUpdate(
          {
            type: "team",
            teamId: team._id,
          },
          {
            points: team.points || 0,
            rank: i + 1,
            lastUpdated: new Date(),
          },
          {
            upsert: true,
            new: true,
          }
        );
      }

      // If silent=true, don't send a response (used when chained from other functions)
      if (silent) return;

      return res.status(200).json(
        new ApiResponse(
          200,
          {
            individualCount: individuals.length,
            teamCount: teams.length,
          },
          "Leaderboard rankings updated successfully"
        )
      );
    } catch (error) {
      console.error("Error updating leaderboard rankings:", error);

      // If silent=true, don't send a response
      if (silent) throw error;

      return res.status(500).json({
        success: false,
        message: "Failed to update leaderboard rankings",
      });
    }
  }
);

/**
 * Get leaderboard filters (tech stacks, languages, tags)
 */
export const getLeaderboardFilters = asyncHandler(async (req, res) => {
  try {
    const [techStacks, languages, tags] = await Promise.all([
      TechStack.find().select("content").limit(20).lean(),
      Language.find().select("content").limit(20).lean(),
      Tag.find().select("content").limit(20).lean(),
    ]);

    return res.status(200).json(
      new ApiResponse(
        200,
        {
          techStacks: techStacks.map((item) => item.content),
          languages: languages.map((item) => item.content),
          tags: tags.map((item) => item.content),
        },
        "Leaderboard filters fetched successfully"
      )
    );
  } catch (error) {
    console.error("Error fetching leaderboard filters:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch leaderboard filters",
    });
  }
});

/**
 * Add tech stacks, languages, or tags to leaderboard entries
 * This would be called when a user updates their skills
 */
export const updateLeaderboardSkills = asyncHandler(
  async (userId, techStackIds, languageIds, tagIds) => {
    try {
      // Update the leaderboard entry with skills if it exists
      await Leaderboard.findOneAndUpdate(
        { type: "individual", userId },
        {
          $set: {
            techStacks: techStackIds || [],
            languages: languageIds || [],
            tags: tagIds || [],
            lastUpdated: new Date(),
          },
        }
      );

      return true;
    } catch (error) {
      console.error("Error updating leaderboard skills:", error);
      return false;
    }
  }
);

/**
 * Initialize leaderboard with existing users and teams
 * Use this endpoint if leaderboard is empty but you have users
 */
export const initializeLeaderboard = asyncHandler(async (req, res) => {
  try {
    // First check if leaderboard already has data
    const existingEntries = await Leaderboard.countDocuments().catch((err) => {
      console.error("Error counting leaderboard entries:", err);
      return 0;
    });

    // Allow initialization if leaderboard is empty or force param is true
    const isAdmin = req.user && req.user.role === "admin";
    const isEmpty = existingEntries === 0;
    const forceInitialize = req.query.force === "true";

    if (!isEmpty && !isAdmin && !forceInitialize) {
      return res.status(403).json({
        success: false,
        message: "Only admins can reinitialize non-empty leaderboards",
      });
    }

    // Initialize leaderboard with data from existing users and teams
    try {
      const result = await initializeLeaderboardData();

      // Update rankings after initialization
      await updateLeaderboardRankings(req, res, true);

      return res
        .status(200)
        .json(
          new ApiResponse(200, result, "Leaderboard initialized successfully")
        );
    } catch (initError) {
      console.error("Error in initialization process:", initError);
      return res.status(500).json({
        success: false,
        message: "Failed during leaderboard initialization process",
        error:
          process.env.NODE_ENV === "development"
            ? initError.message
            : undefined,
      });
    }
  } catch (error) {
    console.error("Error initializing leaderboard:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to initialize leaderboard",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
});

/**
 * Refresh leaderboard by checking for missing entries
 * This function finds users and teams that aren't in the leaderboard and adds them
 */
export const refreshLeaderboard = asyncHandler(async (req, res) => {
  try {
    // Step 1: Get all existing leaderboard user entries
    const existingUserEntries = await Leaderboard.find({
      type: "individual",
    }).select("userId");
    const existingUserIds = new Set(
      existingUserEntries.map((entry) => entry.userId.toString())
    );

    // Step 2: Get all existing leaderboard team entries
    const existingTeamEntries = await Leaderboard.find({
      type: "team",
    }).select("teamId");
    const existingTeamIds = new Set(
      existingTeamEntries.map((entry) => entry.teamId.toString())
    );

    // Step 3: Find all individuals and register missing ones
    const individuals = await Individual.find().select("userId point");
    console.log(`Found ${individuals.length} total individuals`);

    let newUserCount = 0;
    for (const individual of individuals) {
      if (!individual.userId) continue;

      if (!existingUserIds.has(individual.userId.toString())) {
        await registerUserToLeaderboard(
          individual.userId,
          individual.point || 0
        );
        newUserCount++;
      }
    }

    // Step 4: Find all teams and register missing ones
    const teams = await TeamDetail.find().select("_id points");
    console.log(`Found ${teams.length} total teams`);

    let newTeamCount = 0;
    for (const team of teams) {
      if (!team._id) continue;

      if (!existingTeamIds.has(team._id.toString())) {
        await registerTeamToLeaderboard(team._id, team.points || 0);
        newTeamCount++;
      }
    }

    // Step 5: Update rankings to ensure proper order
    await updateLeaderboardRankings(req, res, true);

    return res.status(200).json(
      new ApiResponse(
        200,
        {
          registeredUsers: newUserCount,
          registeredTeams: newTeamCount,
          totalUsers: individuals.length,
          totalTeams: teams.length,
        },
        "Leaderboard refreshed successfully"
      )
    );
  } catch (error) {
    console.error("Error refreshing leaderboard:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to refresh leaderboard",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
});
