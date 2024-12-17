import express from "express";
import { verifyJWT } from "../middlewares/verifyUser.js";
import {
  createUserDetail,
  deleteUser,
  getUser,
  getUsers,
  updateUser,
} from "../controllers/user.controller.js";
import { upload } from "../middlewares/multer.middleware.js";

const Router = express.Router();

// define router

// create user detail
Router.post(
  "/",
  verifyJWT,
  upload.fields([
    {
      name: "profilePicture",
      maxCount: 1,
    },
  ]),
  createUserDetail
);

// update user detail
Router.put(
  "/:userId",
  verifyJWT,
  upload.fields([
    {
      name: "profilePicture",
      maxCount: 1,
    },
  ]),
  updateUser
);

// delete user detail
Router.delete("/:userId", verifyJWT, deleteUser);

// get all users
Router.get("/", getUsers);

// get user detail
Router.get("/:userId", getUser);

export default Router;
