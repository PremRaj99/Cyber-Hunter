import Language from "../models/Language.model.js";
import Project from "../models/Project.model.js";
import User from "../models/User.model.js";
import { errorHandler } from "../utils/error.js";

export const createLanguage = async (req, res, next) => {
  let { content, logo } = req.body;
  try {
    content = content.charAt(0).toUpperCase() + content.toLowerCase().slice(1);

    const checkContent = await Language.findOne({ content });

    if (checkContent) {
      return next(errorHandler(400, "Already have your language. Use it..."));
    }
    const newLanguage = new Language({ content, logo });
    const savedLanguage = await newLanguage.save();

    res.status(201).json({
      tagId: savedLanguage._id,
      logo: savedLanguage.logo,
      content: savedLanguage.content,
    });

  } catch (error) {
    next(error);
  }
};
export const updateLanguage = async (req, res, next) => {
  const { languageId } = req.params;
  let { content, logo } = req.body;
  try {
    const user = await User.findById(req.user._id);
    if (user.role !== "admin" || user.role !== "moderator") {
      return next(errorHandler(400, "You are not allowed to update Language"));
    }

    content =
      content.charAt(0).toUpperCase() + content.toLowerCase().slice(1);
    if (!content) {
      return next(errorHandler(400, "fill required content."));
    }
    const checkContent = await Language.findById(languageId);
    checkContent.content = content;
    checkContent.logo = logo;
    await checkContent.save();

    res.status(200).json("Language updated successfully");
  } catch (error) {
    next(error);
  }
};

export const deleteLanguage = async (req, res, next) => {
  const { languageId } = req.params;
  try {
    const user = await User.findById(req.user._id);
    if (user.role !== "admin" || user.role !== "moderator") {
      return next(errorHandler(400, "You are not allowed to delete language"));
    }

    // Find all projects that contain the languageId
    const projects = await Project.find({ language: languageId });

    // Update each project to remove the languageId from the language array
    for (const project of projects) {
      project.language = project.language.filter((tag) => tag.toString() !== languageId);
      await project.save();
    }

    await Language.findByIdAndDelete(languageId);

    res.status(200).json("Language removed Successfully.");
  } catch (error) {
    next(error);
  }
};

export const getLanguages = async (req, res, next) => {
  try {
    const searchQuery = req.query.q || "";

    const languages = await Language.find({
      content: { $regex: searchQuery, $options: "i" },
    }).select("_id content");

    const data = languages.map((language) => ({
      tagId: language._id,
      content: language.content,
    }));

    res.status(200).json(data);
  } catch (error) {
    next(error);
  }
};
