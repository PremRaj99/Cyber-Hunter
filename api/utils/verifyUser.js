import jwt from "jsonwebtoken";
import { errorHandler } from "./error.js";
import User from "../models/User.model.js";

export const verifyToken = (req, res, next) => {
  const token = req.cookies.access_token;
  if (!token) {
    return next(errorHandler(401, "Unauthorized"));
  }
  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return next(errorHandler(401, "Unauthorized"));
    }
    const verifyUser = User.findById(user.id)
      .then(() => {
        req.user = user;
        next();
      })
      .catch((err) => {
        return next(errorHandler(401, "Unauthorized"));
      });
  });
};
