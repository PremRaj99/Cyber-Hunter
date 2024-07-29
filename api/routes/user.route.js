import express from "express";
import { verifyToken } from "../utils/verifyUser.js";
import { createUserDetail, deleteUser, getUser, updateUser } from "../controllers/user.controller.js";

const Router = express.Router();

// define router

Router.post("/create", verifyToken, createUserDetail)
Router.put("/update", verifyToken, updateUser)
Router.delete("/delete", verifyToken, deleteUser)
Router.get("/", getUser);

export default Router;