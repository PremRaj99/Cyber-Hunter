import { errorHandler } from "../utils/error.js";

export const verifyAdmin = async (req, res, next) => {
  try {
    if (!req.user) {
      return next(errorHandler(401, "Authentication required"));
    }

    if (!req.user.isAdmin) {
      return next(errorHandler(403, "Admin access required"));
    }

    next();
  } catch (error) {
    next(error);
  }
};
