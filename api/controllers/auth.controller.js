import User from "../models/User.model.js";
import bcryptjs from "bcryptjs";

export const test = (req, res) => {
  res.json({
    message: "API is Running...",
  });
};

export const signin = async (req, res, next) => {
  const { username, password } = req.body;

  try {
    const validUsername = await User.find({ username: username });

    if (!validUsername) {
      return next(errorHandler(404, "User Not Found"));
    }
    const validPassword = await bcryptjs.compare(
      password,
      validUsername.password
    );
    if (!validPassword) {
      return next(errorHandler(401, "Invalid Password"));
    }
    const token = jwt.sign(
      { id: validUsername._id, role: validUsername.role },
      process.env.SECRET_KEY
    );

    const { password: pass, ...rest } = validUsername._doc;

    res.status(200).cookie(token).json(rest);
  } catch (error) {
    next(error);
  }
};
