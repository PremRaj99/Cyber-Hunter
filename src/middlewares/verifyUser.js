import jwt from "jsonwebtoken";
import { errorHandler } from "../utils/error.js";

export const verifyJWT = (req, res, next) => {
  const token =
    req.cookies?.accessToken ||
    req.header("Authorization")?.replace("Bearer ", "");

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

export const verifyVendor = (req, res, next) => {
  if (req.user.role !== "vendor") {
    return next(errorHandler(400, "You are not allowed to proceed."));
  }
  next();
};

export const verifyUser = (req, res, next) => {
  if (req.user.role !== "user") {
    return next(errorHandler(400, "You are not allowed to proceed."));
  }
  next();
};
