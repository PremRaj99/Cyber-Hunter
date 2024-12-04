import { verifyToken } from "../utils/verifyUser.js";
import express from "express"
import { createTag, deleteTag, getTags, updateTag } from "../controllers/tag.controller.js";

const Router = express.Router();

// define all routes

Router.post("/", verifyToken, createTag);
Router.put("/:tagId", verifyToken, updateTag)
Router.delete("/:tagId", verifyToken, deleteTag)
Router.get("/", getTags)

export default Router;