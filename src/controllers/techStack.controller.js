import Project from "../models/Project.model.js";
import TechStack from "../models/TechStack.model.js";
import User from "../models/User.model.js";
import { errorHandler } from "../utils/error.js";

export const createTechStack = async (req, res, next) => {
  let { content, logo } = req.body;
  try {
    content = content.charAt(0).toUpperCase() + content.toLowerCase().slice(1);

    const checkContent = await TechStack.findOne({ content });

    if (checkContent) {
      return next(errorHandler(400, "Already have your Tech Stack. Use it..."));
    }
    const newTechStack = new TechStack({ content, logo });
    const savedTechStack = await newTechStack.save();

    res.status(201).json({
      tagId: savedTechStack._id,
      logo: savedTechStack.logo,
      content: savedTechStack.content,
    });
  } catch (error) {
    next(error);
  }
};
export const updateTechStack = async (req, res, next) => {
  const { techStackId } = req.params;
  let { content, logo } = req.body;
  try {
    const user = await User.findById(req.user._id);
    if (user.role !== "admin" || user.role !== "moderator") {
      return next(
        errorHandler(400, "You are not allowed to update Tech Stack")
      );
    }

    content = content.charAt(0).toUpperCase() + content.toLowerCase().slice(1);
    if (!content) {
      return next(errorHandler(400, "fill required content."));
    }
    const checkContent = await TechStack.findById(techStackId);
    checkContent.content = content;
    checkContent.logo = logo;
    await checkContent.save();

    res.status(200).json("Tech Stack updated successfully");
  } catch (error) {
    next(error);
  }
};

export const deleteTechStack = async (req, res, next) => {
  const { techStackId } = req.params;
  try {
    const user = await User.findById(req.user._id);
    if (user.role !== "admin" || user.role !== "moderator") {
      return next(errorHandler(400, "You are not allowed to delete TechStack"));
    }

    // Find all projects that contain the techStackId
    const projects = await Project.find({ techStack: techStackId });

    // Update each project to remove the techStackId from the techStack array
    for (const project of projects) {
      project.techStack = project.techStack.filter(
        (tag) => tag.toString() !== techStackId
      );
      await project.save();
    }

    await TechStack.findByIdAndDelete(techStackId);

    res.status(200).json("Tech Stack removed Successfully.");
  } catch (error) {
    next(error);
  }
};

export const getTechStacks = async (req, res, next) => {
  try {
    const searchQuery = req.query.q || "";

    const techStacks = await TechStack.find({
      content: { $regex: searchQuery, $options: "i" },
    }).select("_id content");

    const data = techStacks.map((techStack) => ({
      tagId: techStack._id,
      content: techStack.content,
    }));

    res.status(200).json(data);
  } catch (error) {
    next(error);
  }
};

export const getMyTechStacks = async (req, res, next) => {
  try {
    const { userId } = req.params;

    const projcts = await Project.find({ userId }).populate("techStack", "content");
    const techStacks = projcts.map((project) => project.techStack);

    res.status(200).json(techStacks);
  } catch (error) {
    next(error);
  }
};
