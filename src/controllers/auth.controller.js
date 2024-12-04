import User from "../models/User.model.js";
import bcryptjs from "bcryptjs";
import { errorHandler } from "../utils/error.js";
import UserDetail from "../models/UserDetail.model.js";
import { ApiResponse } from "../utils/ApiResponse.js";

export const test = (req, res) => {
  res.json({
    message: "API is Running...",
  });
};

const generateAccessAndRefreshTokens = async (userId) => {
  try {
    const user = await User.findById(userId);
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();

    user.refreshToken = refreshToken;
    await user.save();
    return { accessToken, refreshToken };
  } catch (error) {
    throw errorHandler(
      500,
      "Something went wrong while generating refresh token"
    );
  }
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
    const validPassword = bcryptjs.compareSync(password, validEmail.password);
    if (!validPassword) {
      return next(errorHandler(401, "Invalid Password"));
    }
    const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(
      validEmail._id
    );

    const { password: pass, ...rest } = validEmail._doc;
    const userDetail = await UserDetail.findOne({ userId: validEmail._id });

    if (!userDetail) {
      return res
        .status(200)
        .cookie("accessToken", accessToken)
        .cookie("refreshToken", refreshToken)
        .json(
          ApiResponse(
            200,
            { ...rest, accessToken, refreshToken },
            "Login Successful"
          )
        );
    }
    const data = {
      ...rest,
      accessToken,
      refreshToken,
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

    res
      .status(200)
      .cookie("accessToken", accessToken)
      .cookie("refreshToken", refreshToken)
      .json(ApiResponse(200, data, "Login Successful"));
  } catch (error) {
    next(error);
  }
};

export const signup = async (req, res, next) => {
  const { email, confirmPassword, password } = req.body;
  if (!email || !password || password === "" || !confirmPassword) {
    return next(errorHandler(404, "All fields are required!"));
  }
  if (confirmPassword !== password) {
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

    const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(
      user._id
    );

    const { password: pass, refreshToken: ref, ...rest } = user._doc;
    res
      .status(200)
      .cookie("accessToken", accessToken)
      .cookie("refreshToken", refreshToken)
      .json(
        ApiResponse(
          200,
          { ...rest, accessToken, refreshToken },
          "Signup Successful"
        )
      );
  } catch (error) {
    next(error);
  }
};

export const logout = async (req, res, next) => {
  await User.findByIdAndUpdate(
    req.user._id,
    {
      $set: {
        refreshToken: undefined,
      },
    },
    {
      new: true,
    }
  );

  const options = {
    httpOnly: true,
    secure: true,
  };
  res
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(ApiResponse(200, {}, "Logout Successful"));
};

export const refreshToken = async (req, res, next) => {
  const { refreshToken } = req.cookies;
  if (!refreshToken) {
    return next(errorHandler(401, "Unauthorized"));
  }
  try {
    const user = await User.findOne({ refreshToken });
    if (!user) {
      return next(errorHandler(401, "Unauthorized"));
    }
    const { accessToken, refreshToken: newRefreshToken } =
      await generateAccessAndRefreshTokens(user._id);
    res
      .status(200)
      .cookie("accessToken", accessToken)
      .cookie("refreshToken", newRefreshToken)
      .json(ApiResponse(200, { accessToken }, "Refresh Token Generated"));
  } catch (error) {
    next(error);
  }
};
