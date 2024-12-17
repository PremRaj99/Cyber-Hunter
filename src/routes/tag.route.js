import { verifyJWT } from "../middlewares/verifyUser.js";
import express from "express"
import { createTag, deleteTag, getTags, updateTag } from "../controllers/tag.controller.js";

const Router = express.Router();

// define all routes

Router.post("/", verifyJWT, createTag);
Router.put("/:tagId", verifyJWT, updateTag)
Router.delete("/:tagId", verifyJWT, deleteTag)
Router.get("/", getTags)

export default Router;