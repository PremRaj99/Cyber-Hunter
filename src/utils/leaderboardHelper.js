import { updateLeaderboardSkills } from "../controllers/leaderboard.controller.js";
import Leaderboard from "../models/Leaderboard.model.js";

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
