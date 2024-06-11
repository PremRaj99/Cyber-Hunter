import User from "../models/User.model.js";
import bcryptjs from "bcryptjs";
import { errorHandler } from "../utils/error.js";
import jwt from "jsonwebtoken";

export const test = (req, res) => {
  res.json({
    message: "API is Running...",
  });
};

export const signin = async (req, res, next) => {
  const { username, password } = req.body;

  if (!username || !password || username === "" || password === "") {
    return next(errorHandler(404, "All fields are required!"));
  }

  try {
    const validUsername = await User.findOne({ username: username });

    if (!validUsername) {
      return next(errorHandler(404, "User Not Found"));
    }
    const validPassword = bcryptjs.compareSync(
      password,
      validUsername.password
    );
    if (!validPassword) {
      return next(errorHandler(401, "Invalid Password"));
    }
    const token = jwt.sign(
      { id: validUsername._id, role: validUsername.role },
      process.env.JWT_SECRET
    );

    const { password: pass, ...rest } = validUsername._doc;

    res
      .status(200)
      .cookie("access_token", token, {
        httpOnly: true,
      })
      .json(rest);
  } catch (error) {
    next(error);
  }
};
