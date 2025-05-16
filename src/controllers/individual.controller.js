import Individual from "../models/Individual.model.js";
import { errorHandler } from "../utils/error.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { updateIndividualLeaderboard } from "../utils/leaderboardHelper.js";

export const createIndividual = async (req, res, next) => {
  try {
    const { description, tagId } = req.body;

    const newIndividual = new Individual({
      userId: req.user._id,
      description,
      tagId,
    });

    await newIndividual.save();
    res.status(200).json("Profile created successfully.");
  } catch (error) {
    next(error);
  }
};

export const updateIndividual = async (req, res, next) => {
  try {
    const { description, tagId } = req.body;
    const updatedIndividual = await Individual.findByIdAndUpdate(
      req.params.id,
      { description, tagId },
      { new: true }
    );

    if (!updatedIndividual) {
      return res.status(404).json("Individual not found.");
    }

    res.status(200).json("Profile updated successfully.");
  } catch (error) {
    next(error);
  }
};

export const getIndividual = async (req, res, next) => {
  try {
    const individual = await Individual.findById(req.params.id);

    if (!individual) {
      return res.status(404).json("Individual not found.");
    }

    res.status(200).json(individual);
  } catch (error) {
    next(error);
  }
};

export const getIndividualByUserId = async (req, res, next) => {
  try {
    const individual = await Individual.findOne({ userId: req.params.userId });

    if (!individual) {
      return next(errorHandler(404, "Individual not found"));
    }

    res
      .status(200)
      .json(ApiResponse(200, individual, "Individual fetched successfully"));
  } catch (error) {
    next(error);
  }
};

export const updateIndividualPoints = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { points } = req.body;

    if (isNaN(points)) {
      return next(errorHandler(400, "Points must be a number"));
    }

    const individual = await Individual.findOne({ userId });

    if (!individual) {
      return next(errorHandler(404, "Individual profile not found"));
    }

    // Update points
    individual.point = points;
    await individual.save();

    // Update leaderboard
    await updateIndividualLeaderboard(userId, points);

    res
      .status(200)
      .json(new ApiResponse(200, individual, "Points updated successfully"));
  } catch (error) {
    next(error);
  }
};
