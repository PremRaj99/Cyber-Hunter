import Individual from "../models/Individual.model.js";
import Interest from "../models/Interest.model.js";
import User from "../models/User.model.js";
import UserDetail from "../models/UserDetail.model.js";
import { errorHandler } from "../utils/error.js";

export const createInterest = async (req, res, next) => {
  let { content } = req.body;
  try {
    content = content.charAt(0).toUpperCase() + content.toLowerCase().slice(1);

    const checkContent = await Interest.findOne({ content });

    if (checkContent) {
      return next(errorHandler(400, "Already have your interest. Use it..."));
    }
    const newInterest = new Interest({ content });
    const savedInterest = await newInterest.save();

    res.status(201).json({
      tagId: savedInterest._id,
      content: savedInterest.content,
    });

  } catch (error) {
    next(error);
  }
};
export const updateInterest = async (req, res, next) => {
  const { interestId } = req.params;
  let { newContent } = req.body;
  try {
    const user = await User.findById(req.user.id);
    if (user.role !== "admin" || user.role !== "moderator") {
      return next(errorHandler(400, "You are not allowed to update interest"));
    }

    newContent =
      newContent.charAt(0).toUpperCase() + newContent.toLowerCase().slice(1);
    if (!newContent) {
      return next(errorHandler(400, "fill required content."));
    }
    const checkContent = await Interest.findById(interestId);
    checkContent.content = newContent;
    await checkContent.save();

    res.status(200).json("Interest updated successfully");
  } catch (error) {
    next(error);
  }
};

export const deleteInterest = async (req, res, next) => {
  const { interestId } = req.params;
  try {
    const user = await User.findById(req.user.id);
    if (user.role !== "admin" || user.role !== "moderator") {
      return next(errorHandler(400, "You are not allowed to delete interest"));
    }

    // Find all userDetails that contain the interestId
    const userDetails = await UserDetail.find({ interestId: interestId });

    // Update each project to remove the interstId from the interestId array
    for (const userDetail of userDetails) {
      userDetail.interestId = userDetail.interestId.filter((tag) => tag.toString() !== interestId);
      await userDetail.save();
    }

    await Interest.findByIdAndDelete(interestId);

    res.status(200).json("Interest removed Successfully.");
  } catch (error) {
    next(error);
  }
};

export const getInterests = async (req, res, next) => {
  try {
    const searchQuery = req.query.q || "";

    const interests = await Interest.find({
      content: { $regex: searchQuery, $options: "i" },
    }).select("_id content");

    const data = interests.map((tag) => ({
      tagId: tag._id,
      content: tag.content,
    }));

    res.status(200).json(data);
  } catch (error) {
    next(error);
  }
};
