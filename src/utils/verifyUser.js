import jwt from "jsonwebtoken";
import { errorHandler } from "./error.js";

export const verifyToken = (req, res, next) => {
  const token =
    req.cookie?.accessToken ||
    req.header("Authorization")?.replace("Beader ", "");

  if (!token) {
    return next(errorHandler(401, "Unauthorized"));
  }
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, user) => {
    if (err) {
      return next(errorHandler(401, "Unauthorized"));
    }

    req.user = user;
    next();
  });
};

export const verifyAdmin = (req, res, next) => {
  if (req.user.role !== "admin") {
    return next(errorHandler(400, "You are not allowed to proceed."));
  }
  next();
};

export const verifyModerator = (req, res, next) => {
  if (req.user.role !== "moderator") {
    return next(errorHandler(400, "You are not allowed to proceed."));
  }
  next();
};
