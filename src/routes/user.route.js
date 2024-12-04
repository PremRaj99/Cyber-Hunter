import express from "express";
import { verifyToken } from "../utils/verifyUser.js";
import { createUserDetail, deleteUser, getUser, getUsers, updateUser } from "../controllers/user.controller.js";

const Router = express.Router();

// define router

Router.post("/", verifyToken, createUserDetail)
Router.put("/:userId", verifyToken, updateUser)
Router.delete("/:userId", verifyToken, deleteUser)
Router.get("/", getUsers);
Router.get("/:userId", getUser);

export default Router;