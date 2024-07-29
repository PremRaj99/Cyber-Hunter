import User from "../models/User.model.js";
import bcryptjs from "bcryptjs";
import { errorHandler } from "../utils/error.js";
import jwt from "jsonwebtoken";
import generateTokenAndSetCookie from "../utils/generateToken.js";
import UserDetail from "../models/UserDetail.model.js";

export const test = (req, res) => {
  res.json({
    message: "API is Running...",
  });
};

export const login = async (req, res, next) => {
  const { email, password } = req.body;

  if (!email || !password || password === "") {
    return next(errorHandler(404, "All fields are required!"));
  }

  try {
    const validEmail = await User.findOne({ email: email });

    if (!validEmail) {
      return next(errorHandler(404, "User Not Found"));
    }
    const validPassword = bcryptjs.compareSync(
      password,
      validEmail.password
    );
    if (!validPassword) {
      return next(errorHandler(401, "Invalid Password"));
    }
    generateTokenAndSetCookie(validEmail._id, res, validEmail.role);

    const { password: pass, ...rest } = validEmail._doc;
    const userDetail = await UserDetail.findOne({ userId: req.user.id });

    if (!userDetail) {
      return res.status(200).json(rest);
    }
    const data = {
      ...rest,
      name: userDetail.name,
      course: userDetail.course,
      session: userDetail.session,
      branch: userDetail.branch,
      profilePicture: userDetail.profilePicture,
      DOB: userDetail.DOB,
      phoneNumber: userDetail.phoneNumber,
      gender: userDetail.gender,
      teamId: userDetail.teamId,
    };

    res.status(200).json(data);
  } catch (error) {
    next(error);
  }
};

export const signup = async (req, res, next) => {
  const { email, confirmPassword, password } = req.body;
  if (!email || !password || password === "" || !confirmPassword) {
    return next(errorHandler(404, "All fields are required!"));
  }
  if(confirmPassword !== password) {
    return next(errorHandler(404, "Password donot match!"));
  }
  try {
    const validEmail = await User.findOne({ email: email });
    if (validEmail) {
      return next(errorHandler(409, "Email already exists"));
    }
    const salt = bcryptjs.genSaltSync(10);
    const hashedPassword = bcryptjs.hashSync(password, salt);

    const user = new User({ email, password: hashedPassword });
    await user.save();

    generateTokenAndSetCookie(validEmail._id, res, validEmail.role);

    const { password: pass, ...rest } = user._doc;
    res.status(200).json(rest);
  } catch (error) {
    next(error);
  }
};

export const logout = async (req, res, next) => {
  res.clearCookie("access_token", { path: "/" });
  res.json({ message: "Logged Out Successfully!" });
};
