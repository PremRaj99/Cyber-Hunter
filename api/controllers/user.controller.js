import Individual from "../models/Individual.model.js";
import Project from "../models/Project.model.js";
import TechStack from "../models/TechStack.model.js";
import Language from "../models/Language.model.js";
import User from "../models/User.model.js";
import UserDetail from "../models/UserDetail.model.js";
import { errorHandler } from "../utils/error.js";
import generateTokenAndSetCookie from "../utils/generateToken.js";

export const createUserDetail = async (req, res, next) => {
  try {
    const {
      name,
      qId,
      course,
      session,
      branch,
      DOB,
      interestId,
      phoneNumber,
      gender,
    } = req.body;
    let { profilePicture } = req.body;
    const { id: userId } = req.user;
    if (
      !name ||
      !qId ||
      !course ||
      !session ||
      !branch ||
      !DOB ||
      !phoneNumber ||
      !gender
    ) {
      return next(errorHandler(400, "Please fill all the required fields"));
    }
    const isUserDetailexist = new UserDetail.findOne({ userId });
    if (isUserDetailexist) {
      return next(errorHandler(400, "Your Details already exists."));
    }
    if (!profilePicture) {
      profilePicture =
        "https://avatar.iran.liara.run/username?username=" +
        name.split(" ") +
        join("+");
    }

    const newUserDetail = new UserDetail({
      name,
      qId,
      userId,
      course,
      session,
      branch,
      DOB,
      profilePicture,
      interestId,
      phoneNumber: Number(phoneNumber),
      gender,
    });
    const userDetaildata = await newUserDetail.save();

    const validUser = await User.findById(userId);
    generateTokenAndSetCookie(validUser._id, res, validUser.role);

    const { password: pass, ...rest } = validUser._doc;

    const data = {
      ...rest,
      name: userDetaildata.name,
      course: userDetaildata.course,
      session: userDetaildata.session,
      branch: userDetaildata.branch,
      profilePicture: userDetaildata.profilePicture,
      DOB: userDetaildata.DOB,
      phoneNumber: userDetaildata.phoneNumber,
      gender: userDetaildata.gender,
      teamId: userDetaildata.teamId,
    };

    res.status(200).json(data);
  } catch (error) {
    next(error);
  }
};
export const updateUser = async (req, res, next) => {
  try {
  } catch (error) {
    next(error);
  }
};
export const deleteUser = async (req, res, next) => {
  try {
    const { userId } = req.params;

    await Project.findOneAndDelete({ userId });
    await UserDetail.findOneAndDelete({ userId });
    await User.findByIdAndDelete(userId);

    res.status(200).json("Your account has been deleted successfully.");
  } catch (error) {
    next(error);
  }
};
export const getUser = async (req, res, next) => {
  const { userId } = req.params;
  try {
    const userDetail = await UserDetail.findOne({ userId });
    const individual = await Individual.findOne({ userId });

    if (!individual) {
      return res.status(404).json({ message: "Individual not found" });
    }
    const projects = await Project.find({
      status: "active",
      _id: { $in: individual.projectId },
    });

    const techStackIds = projects.map((project) => project.techStack).flat();
    const languageIds = projects.map((project) => project.language).flat();

    const techStack = await TechStack.find({ _id: { $in: techStackIds } });
    const language = await Language.find({ _id: { $in: languageIds } });

    // const individualRank = await Individual.find()
    //   .sort({ point: -1 })
    //   .select("userId");

    // const userIds = individualRank.map((ind) => ind.userId);
    // const rank = userIds.indexOf(userId) + 1;
    // const rank = individualRank.indexOf(userId) + 1;

    const individualRank = await Individual.find()
      .sort({ point: -1 })
      .select("userId")
      .lean();
    const userIds = individualRank.map((ind) => ind.userId.toString());
    const rank = userIds.indexOf(userId.toString()) + 1;

    const data = {
      ...userDetail.toObject(),
      description: individual.description,
      point: individual.point,
      rank,
      techStack,
      language,
      projects,
    };

    res.status(200).json(data);
  } catch (error) {
    next(error);
  }
};

export const getUsers = async (req, res, next) => {
  try {
  } catch (error) {
    next(error);
  }
};
