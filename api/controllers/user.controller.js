import Interest from "../models/Interest.model.js";
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
      profilePicture,
      interestId,
      phoneNumber,
    } = req.body;
    const { id: userId } = req.user;
    if (!name || !qId || !course || !session || !branch || !DOB || !phoneNumber) {
      return next(errorHandler(400, "Please fill all the required fields"));
    }
    const isUserDetailexist = new UserDetail.findOne({ userId });
    if (isUserDetailexist) {
      return next(errorHandler(400, "Your Details already exists."));
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
    });
    const userDetaildata = await newUserDetail.save();

    const validUsername = await User.findById(userId);
    generateTokenAndSetCookie(validUsername._id, res, validUsername.role);

    const { password: pass, ...rest } = validUsername._doc;

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
  } catch (error) {
    next(error);
  }
};
export const getUser = async (req, res, next) => {
  try {
  } catch (error) {
    next(error);
  }
};
