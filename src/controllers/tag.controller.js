import Project from "../models/Project.model.js";
import Tag from "../models/Tag.model.js";
import User from "../models/User.model.js";
import { errorHandler } from "../utils/error.js";

export const createTag = async (req, res, next) => {
  let { content } = req.body;
  try {
    content = content.charAt(0).toUpperCase() + content.toLowerCase().slice(1);

    const checkContent = await Tag.findOne({ content });

    if (checkContent) {
      return next(errorHandler(400, "Already have your tag. Use it..."));
    }
    const newTag = new Tag({ content });
    const savedTag = await newTag.save();

    res.status(201).json({
      tagId: savedTag._id,
      content: savedTag.content,
    });

  } catch (error) {
    next(error);
  }
};
export const updateTag = async (req, res, next) => {
  const { tagId } = req.params;
  let { newContent } = req.body;
  try {
    const user = await User.findById(req.user._id);
    if (user.role !== "admin" || user.role !== "moderator") {
      return next(errorHandler(400, "You are not allowed to update tags"));
    }

    newContent =
      newContent.charAt(0).toUpperCase() + newContent.toLowerCase().slice(1);
    if (!newContent) {
      return next(errorHandler(400, "fill required tag."));
    }
    const checkContent = await Tag.findById(tagId);
    checkContent.content = newContent;
    await checkContent.save();

    res.status(200).json("Tag updated successfully");
  } catch (error) {
    next(error);
  }
};

export const deleteTag = async (req, res, next) => {
  const { tagId } = req.params;
  try {
    const user = await User.findById(req.user._id);
    if (user.role !== "admin" || user.role !== "moderator") {
      return next(errorHandler(400, "You are not allowed to delete tags"));
    }

    // Find all projects that contain the tagId
    const projects = await Project.find({ tagId: tagId });

    // Update each project to remove the tagId from the tagId array
    for (const project of projects) {
      project.tagId = project.tagId.filter((tag) => tag.toString() !== tagId);
      await project.save();
    }

    await Tag.findByIdAndDelete(tagId);

    res.status(200).json("Tag removed Successfully.");
  } catch (error) {
    next(error);
  }
};

export const getTags = async (req, res, next) => {
  try {
    const searchQuery = req.query.q || "";

    const tags = await Tag.find({
      content: { $regex: searchQuery, $options: "i" },
    }).select("_id content");

    const data = tags.map((tag) => ({
      tagId: tag._id,
      content: tag.content,
    }));

    res.status(200).json(data);
  } catch (error) {
    next(error);
  }
};
