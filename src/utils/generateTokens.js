import User from "../models/User.model.js";
import { errorHandler } from "./error.js";

/**
 * Generate access and refresh tokens for a user
 * @param {string} userId - The user ID
 * @returns {Promise<Object>} - The access and refresh tokens
 */
const generateTokens = async (userId) => {
  try {
    const user = await User.findById(userId);
    if (!user) {
      throw errorHandler(404, "User not found");
    }

    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();

    user.refreshToken = refreshToken;
    await user.save();

    return { accessToken, refreshToken };
  } catch (error) {
    console.error("Error generating tokens:", error);
    throw errorHandler(500, "Something went wrong while generating tokens");
  }
};

export default generateTokens;
