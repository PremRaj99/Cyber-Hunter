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
