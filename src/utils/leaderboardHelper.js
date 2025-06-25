import { updateLeaderboardSkills } from "../controllers/leaderboard.controller.js";
import Leaderboard from "../models/Leaderboard.model.js";
import Individual from "../models/Individual.model.js";
import TeamDetail from "../models/TeamDetail.model.js";

/**
 * Update an individual's leaderboard entry
 * This should be called whenever an individual's points change
 */
export const updateIndividualLeaderboard = async (userId, points) => {
  try {
    await Leaderboard.findOneAndUpdate(
      { type: "individual", userId },
      {
        $set: {
          points,
          lastUpdated: new Date(),
        },
      },
      { upsert: true }
    );

    return true;
  } catch (error) {
    console.error("Error updating individual leaderboard:", error);
    return false;
  }
};

/**
 * Update a team's leaderboard entry
 * This should be called whenever a team's points change
 */
export const updateTeamLeaderboard = async (teamId, points) => {
  try {
    await Leaderboard.findOneAndUpdate(
      { type: "team", teamId },
      {
        $set: {
          points,
          lastUpdated: new Date(),
        },
      },
      { upsert: true }
    );

    return true;
  } catch (error) {
    console.error("Error updating team leaderboard:", error);
    return false;
  }
};

/**
 * Update leaderboard skills for an individual
 */
export const updateUserSkills = async (
  userId,
  techStackIds,
  languageIds,
  tagIds
) => {
  return await updateLeaderboardSkills(
    userId,
    techStackIds,
    languageIds,
    tagIds
  );
};

/**
 * Initialize leaderboard data from existing users and teams
 * This should be called manually to populate leaderboard if it's empty
 */
export const initializeLeaderboardData = async () => {
  try {
    console.log(
      "Initializing leaderboard data from existing users and teams..."
    );

    // Sync individual data to leaderboard
    let individuals = [];
    try {
      individuals = await Individual.find().select("userId point");
      console.log(`Found ${individuals.length} individuals to sync`);
    } catch (error) {
      console.error("Error finding individuals:", error);
      individuals = [];
    }

    const individualResults = [];
    for (const individual of individuals) {
      try {
        if (!individual.userId) {
          console.warn("Found individual without userId, skipping");
          continue;
        }

        await updateIndividualLeaderboard(
          individual.userId,
          individual.point || 0
        );
        individualResults.push({
          userId: individual.userId,
          points: individual.point || 0,
        });
      } catch (error) {
        console.error(`Error updating individual ${individual.userId}:`, error);
      }
    }

    // Sync team data to leaderboard
    let teams = [];
    try {
      teams = await TeamDetail.find().select("_id points");
      console.log(`Found ${teams.length} teams to sync`);
    } catch (error) {
      console.error("Error finding teams:", error);
      teams = [];
    }

    const teamResults = [];
    for (const team of teams) {
      try {
        if (!team._id) {
          console.warn("Found team without _id, skipping");
          continue;
        }

        await updateTeamLeaderboard(team._id, team.points || 0);
        teamResults.push({
          teamId: team._id,
          points: team.points || 0,
        });
      } catch (error) {
        console.error(`Error updating team ${team._id}:`, error);
      }
    }

    console.log("Initial leaderboard data created successfully");
    return {
      individualCount: individualResults.length,
      teamCount: teamResults.length,
    };
  } catch (error) {
    console.error("Error initializing leaderboard data:", error);
    throw error;
  }
};

/**
 * Register a new user to the leaderboard
 * This should be called whenever a new user is created
 */
export const registerUserToLeaderboard = async (userId, points = 0) => {
  try {
    // Check if user already exists in leaderboard
    const existingEntry = await Leaderboard.findOne({
      type: "individual",
      userId,
    });

    if (existingEntry) {
      return true; // User already registered
    }

    // Create new leaderboard entry for user
    await Leaderboard.create({
      type: "individual",
      userId,
      points,
      lastUpdated: new Date(),
    });

    console.log(`User ${userId} registered to leaderboard successfully`);
    return true;
  } catch (error) {
    console.error("Error registering user to leaderboard:", error);
    return false;
  }
};

/**
 * Register a new team to the leaderboard
 * This should be called whenever a new team is created
 */
export const registerTeamToLeaderboard = async (teamId, points = 0) => {
  try {
    // Check if team already exists in leaderboard
    const existingEntry = await Leaderboard.findOne({
      type: "team",
      teamId,
    });

    if (existingEntry) {
      return true; // Team already registered
    }

    // Create new leaderboard entry for team
    await Leaderboard.create({
      type: "team",
      teamId,
      points,
      lastUpdated: new Date(),
    });

    console.log(`Team ${teamId} registered to leaderboard successfully`);
    return true;
  } catch (error) {
    console.error("Error registering team to leaderboard:", error);
    return false;
  }
};
