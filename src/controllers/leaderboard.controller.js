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
    // Get paginated results with search
    const leaderboardItems = await Leaderboard.find(query)
      .sort({ points: -1, lastUpdated: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    // Get total count
    const totalCount = await Leaderboard.countDocuments(query);

    // Populate additional information based on type
    let populatedResults = [];

    if (type === "individual") {
      // Get ids to fetch in bulk
      const userIds = leaderboardItems.map((item) => item.userId);

      // Fetch user and user details in parallel
      const [users, userDetails] = await Promise.all([
        User.find({ _id: { $in: userIds } })
          .select("email profilePicture")
          .lean(),
        UserDetail.find({ userId: { $in: userIds } })
          .select("name")
          .lean(),
      ]);

      // Create lookup maps for efficient access
      const userMap = users.reduce((map, user) => {
        map[user._id.toString()] = user;
        return map;
      }, {});

      const userDetailMap = userDetails.reduce((map, detail) => {
        map[detail.userId.toString()] = detail;
        return map;
      }, {});

      // Enhance leaderboard items with user information
      populatedResults = leaderboardItems.map((item, index) => {
        const userId = item.userId.toString();
        const user = userMap[userId] || {};
        const userDetail = userDetailMap[userId] || {};

        return {
          rank: item.rank || index + 1 + skip,
          name: userDetail.name || user.email?.split("@")[0] || "Unknown User",
          points: item.points,
          userId: item.userId,
          profilePicture: user.profilePicture,
          techStack: item.techStacks ? "Multiple" : "Not specified",
          language: item.languages ? "Multiple" : "Not specified",
        };
      });

      // Apply search filter if needed
      if (search) {
        populatedResults = populatedResults.filter((item) =>
          item.name.toLowerCase().includes(search.toLowerCase())
        );
      }
    } else {
      // For teams
      const teamIds = leaderboardItems.map((item) => item.teamId);
      const teams = await TeamDetail.find({ _id: { $in: teamIds } })
        .select("TeamName TeamLogo TeamMembers")
        .lean();

      const teamMap = teams.reduce((map, team) => {
        map[team._id.toString()] = team;
        return map;
      }, {});

      populatedResults = leaderboardItems.map((item, index) => {
        const teamId = item.teamId.toString();
        const team = teamMap[teamId] || {};

        return {
          rank: item.rank || index + 1 + skip,
          name: team.TeamName || "Unknown Team",
          points: item.points,
          teamId: item.teamId,
          teamLogo: team.TeamLogo,
          members: team.TeamMembers?.length || 0,
          techStack: item.techStacks ? "Multiple" : "Not specified",
        };
      });

      // Apply search filter if needed
      if (search) {
        populatedResults = populatedResults.filter((item) =>
          item.name.toLowerCase().includes(search.toLowerCase())
        );
      }
    }

    // For the top 3 results, we'll get them separately to display on podium
    let topThree = [];
    if (parseInt(page) === 1 && populatedResults.length > 0) {
      topThree = populatedResults.slice(
        0,
        Math.min(3, populatedResults.length)
      );
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
    });
  }
});

/**
 * Update leaderboard rankings
 * This function should be called periodically or when points are updated
 */
export const updateLeaderboardRankings = asyncHandler(async (req, res) => {
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
    return res.status(500).json({
      success: false,
      message: "Failed to update leaderboard rankings",
    });
  }
});

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
