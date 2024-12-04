import Individual from "../models/Individual.model.js";

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
  } catch (error) {
    next(error);
  }
};

export const getIndividual = async (req, res, next) => {
  try {
  } catch (error) {
    next(error);
  }
};
