import Individual from "../models/Individual.model.js";
import Project from "../models/Project.model.js";
import TechStack from "../models/TechStack.model.js";
import Language from "../models/Language.model.js";
import User from "../models/User.model.js";
import UserDetail from "../models/UserDetail.model.js";
import { errorHandler } from "../utils/error.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import options from "../utils/cookieOptions.js";
import uploadOnCloudinary from "../utils/fileUpload.js";
import Interest from "../models/Interest.model.js";
import asyncHandler from "../utils/asyncHandler.js";
import mongoose from "mongoose";
import ApiError from "../utils/ApiError.js";

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
      section,
      phoneNumber,
      gender,
      bio,
    } = req.body;
    const { _id: userId } = req.user;
    if (
      !name ||
      !qId ||
      !course ||
      !session ||
      !section ||
      !branch ||
      !DOB ||
      !phoneNumber ||
      !gender ||
      !bio
    ) {
      return next(errorHandler(400, "Please fill all the required fields"));
    }
    const isUserDetailexist = await UserDetail.findOne({
      $or: [{ userId }, { qId }],
    });
    if (isUserDetailexist) {
      return next(errorHandler(400, "Your Details already exists."));
    }

    const profilePictureLocalPath = req.files?.profilePicture?.[0]?.path;

    let profilePictureUrl;

    if (profilePictureLocalPath) {
      const profilePicture = await uploadOnCloudinary(profilePictureLocalPath);
      if (profilePicture) {
        profilePictureUrl = profilePicture.url;
      }
    }

    if (!profilePictureUrl) {
      profilePictureUrl =
        "https://avatar.iran.liara.run/username?username=" +
        name.split(" ").join("+");
    }

    const newUserDetail = new UserDetail({
      name,
      qId,
      userId,
      course,
      session,
      section,
      branch,
      DOB,
      profilePicture: profilePictureUrl,
      interestId,
      phoneNumber: Number(phoneNumber),
      gender,
    });
    const userDetaildata = await newUserDetail.save();

    const individual = await Individual.findOne({ userId });

    if (!individual) {
      const newIndividual = new Individual({
        userId,
        description: bio,
      });
      await newIndividual.save();
    } else {
      individual.description = bio;
      await individual.save();
    }

    // get interest for its id
    const interest = await Interest.find({ _id: { $in: interestId } }).select(
      "content -_id"
    );

    const validUser = await User.findById(userId);
    const { accessToken, refreshToken } =
      await generateAccessAndRefreshTokens(userId);

    const { password: pass, ...rest } = validUser._doc;

    const data = {
      ...rest,
      accessToken,
      refreshToken,
      name: userDetaildata.name,
      qId: userDetaildata.qId,
      course: userDetaildata.course,
      session: userDetaildata.session,
      branch: userDetaildata.branch,
      profilePicture: userDetaildata.profilePicture,
      DOB: userDetaildata.DOB,
      phoneNumber: userDetaildata.phoneNumber,
      bio: individual?.description || "",
      gender: userDetaildata.gender,
      teamId: userDetaildata.teamId,
      interest: interest.map((int) => int.content),
    };

    res
      .status(200)
      .cookie("accessToken", accessToken, options)
      .cookie("refreshToken", refreshToken, options)
      .json(ApiResponse(200, data, "User Detail created successfully."));
  } catch (error) {
    next(error);
  }
};

export const updateUser = async (req, res) => {
  try {
    const { userId } = req.params;

    // Debug logs
    console.log("Updating user with ID:", userId);
    console.log("Request body:", req.body);

    // Try to find the user first
    const user = await User.findById(userId);

    if (!user) {
      console.log(`User with ID ${userId} not found`);
      return res.status(404).json({
        statusCode: 404,
        data: null,
        message: "User not found",
        success: false,
      });
    }

    // Check if UserDetail exists for this user
    let userDetail = await UserDetail.findOne({ userId: userId });

    // If no UserDetail exists, create a minimal one
    if (!userDetail) {
      console.log(`Creating new UserDetail for user ${userId}`);
      userDetail = new UserDetail({
        userId: userId,
        name: user.name || req.body.name || "User",
      });
      await userDetail.save();
    }

    // Process the update
    const profilePictureLocalPath = req.files?.profilePicture?.[0]?.path;

    let profilePictureUrl;

    if (profilePictureLocalPath) {
      const profilePicture = await uploadOnCloudinary(profilePictureLocalPath);
      if (profilePicture) {
        profilePictureUrl = profilePicture.url;
      }
    }

    // Update User model fields
    if (req.body.name) user.name = req.body.name;
    if (req.body.email) user.email = req.body.email;
    if (profilePictureUrl) user.profilePicture = profilePictureUrl;

    // Handle teamId specifically (allow null)
    if (req.body.teamId !== undefined) {
      if (req.body.teamId === null) {
        user.teamId = undefined; // Set to undefined to remove the field
      } else {
        user.teamId = req.body.teamId;
      }
    }

    await user.save();

    // Update UserDetail fields if they exist
    if (userDetail) {
      if (req.body.name) userDetail.name = req.body.name;
      if (req.body.qId) userDetail.qId = req.body.qId;
      if (req.body.course) userDetail.course = req.body.course;
      if (req.body.session) userDetail.session = req.body.session;
      if (req.body.branch) userDetail.branch = req.body.branch;
      if (req.body.DOB) userDetail.DOB = req.body.DOB;
      if (profilePictureUrl) userDetail.profilePicture = profilePictureUrl;
      if (req.body.interestId) userDetail.interestId = req.body.interestId;
      if (req.body.phoneNumber) userDetail.phoneNumber = req.body.phoneNumber;
      if (req.body.teamId !== undefined) {
        if (req.body.teamId === null) {
          userDetail.teamId = undefined; // Set to undefined to remove the field
        } else {
          userDetail.teamId = req.body.teamId;
        }
      }

      await userDetail.save();
    }

    // Return updated user
    return res.status(200).json({
      statusCode: 200,
      data: {
        ...user.toObject(),
        ...(userDetail ? userDetail.toObject() : {}),
      },
      message: "User updated successfully",
      success: true,
    });
  } catch (error) {
    console.error("Error in updateUser:", error);
    return res.status(500).json({
      statusCode: 500,
      data: null,
      message: error.message || "Internal server error",
      success: false,
    });
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
    // Improved validation for userId parameter
    if (
      !userId ||
      userId === "undefined" ||
      !mongoose.Types.ObjectId.isValid(userId)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid user ID provided",
        statusCode: 400,
      });
    }

    // First find the user to make sure it exists
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
        statusCode: 404,
      });
    }

    // Get UserDetail for this user
    const userDetail = await UserDetail.findOne({ userId });

    // Get Individual data if it exists
    const individual = await Individual.findOne({ userId });

    if (!individual) {
      return res.status(404).json({
        success: false,
        message: "Individual profile not found",
        statusCode: 404,
      });
    }

    const projects = await Project.find({
      status: "active",
      _id: { $in: individual.projectId || [] },
    });

    const techStackIds = projects.map((project) => project.techStack).flat();
    const languageIds = projects.map((project) => project.language).flat();

    const techStack = await TechStack.find({
      _id: { $in: techStackIds.filter((id) => id) }, // Filter out any undefined/null values
    });

    const language = await Language.find({
      _id: { $in: languageIds.filter((id) => id) }, // Filter out any undefined/null values
    });

    const individualRank = await Individual.find()
      .sort({ point: -1 })
      .select("userId")
      .lean();

    const userIds = individualRank.map((ind) => ind.userId.toString());
    const rank = userIds.indexOf(userId.toString()) + 1;

    const data = {
      ...(userDetail ? userDetail.toObject() : {}),
      description: individual?.description || "",
      point: individual?.point || 0,
      rank: rank || 0,
      techStack: techStack || [],
      language: language || [],
      projects: projects || [],
    };

    res.status(200).json(data);
  } catch (error) {
    console.error("Error in getUser:", error);
    next(error);
  }
};

export const getUsers = async (req, res, next) => {
  try {
    const users = await User.find().select("-password");
    res
      .status(200)
      .json(ApiResponse(200, users, "Users fetched successfully."));
  } catch (error) {
    next(error);
  }
};

// Add the search users function
export const searchUsers = async (req, res, next) => {
  try {
    const { q } = req.query;

    if (!q || q.trim().length < 2) {
      return res
        .status(200)
        .json(
          ApiResponse(
            200,
            [],
            "Please provide at least 2 characters for search"
          )
        );
    }

    // Search for users by name or email
    const userDetails = await UserDetail.find({
      $or: [
        { name: { $regex: q, $options: "i" } }, // Case-insensitive name search
        { qId: { $regex: q, $options: "i" } }, // Case-insensitive QID search
      ],
    })
      .select("name qId profilePicture userId")
      .populate({
        path: "userId",
        select: "email teamId",
      })
      .limit(10); // Limit to 10 results for performance

    // Format the results to include user details and email
    const formattedResults = userDetails.map((user) => ({
      _id: user.userId._id,
      name: user.name,
      qId: user.qId,
      email: user.userId.email,
      profilePicture: user.profilePicture,
      hasTeam: Boolean(user.userId.teamId),
    }));

    res
      .status(200)
      .json(ApiResponse(200, formattedResults, "Users search results"));
  } catch (error) {
    next(error);
  }
};

// Get current user (me)
export const getCurrentUser = asyncHandler(async (req, res, next) => {
  try {
    // Ensure user ID exists in req.user
    if (!req.user || !req.user._id) {
      throw new ApiError(401, "Authentication required");
    }

    const userId = req.user._id;
    console.log("Fetching current user with ID:", userId);

    // Get user data
    const user = await User.findById(userId).select("-password");
    if (!user) {
      throw new ApiError(404, "User not found");
    }

    // Get user details - don't fail if not found
    const userDetail = await UserDetail.findOne({ userId }).select("-__v");

    // Get individual data if it exists
    const individual = await Individual.findOne({ userId }).select("-__v");

    // Combine the data
    const userData = {
      ...user.toObject(),
      ...(userDetail ? userDetail.toObject() : {}),
      name: user.name || (userDetail && userDetail.name) || "User", // Fixed syntax error here
      bio: individual?.description || "",
      individualId: individual?._id || null,
    };

    return res
      .status(200)
      .json(new ApiResponse(200, userData, "User data fetched successfully"));
  } catch (error) {
    console.error("Error in getCurrentUser:", error);
    return next(error);
  }
});

// Add new controller function for updating current user
export const updateCurrentUser = asyncHandler(async (req, res, next) => {
  try {
    if (!req.user || !req.user._id) {
      throw new ApiError(401, "Authentication required");
    }

    const userId = req.user._id;
    console.log("Updating current user:", userId);
    console.log("Update data:", req.body);

    // Find the user
    const user = await User.findById(userId);
    if (!user) {
      throw new ApiError(404, "User not found");
    }

    // Update user fields
    if (req.body.name) user.name = req.body.name;
    if (req.body.email) user.email = req.body.email;

    // Handle team ID specifically
    if (req.body.hasOwnProperty("teamId")) {
      user.teamId = req.body.teamId || undefined;
    }

    await user.save();

    // Update UserDetail if it exists
    const userDetail = await UserDetail.findOne({ userId });
    if (userDetail) {
      if (req.body.name) userDetail.name = req.body.name;
      if (req.body.hasOwnProperty("teamId")) {
        userDetail.teamId = req.body.teamId || undefined;
      }

      await userDetail.save();
    }

    // Return the updated user
    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          { ...user.toObject(), ...(userDetail ? userDetail.toObject() : {}) },
          "User updated successfully"
        )
      );
  } catch (error) {
    console.error("Error updating current user:", error);
    next(error);
  }
});
