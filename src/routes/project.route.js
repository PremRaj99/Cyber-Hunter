import express from "express";
import { verifyToken } from "../utils/verifyUser.js";
import { createProject, deleteProject, getProject, getProjects, updateProject } from "../controllers/project.controller.js";

const Router = express.Router();

// define router

Router.post("/", verifyToken, createProject)
Router.put("/:userId", verifyToken, updateProject)
Router.delete("/:projectId", verifyToken, deleteProject)
Router.get("/", getProjects);
Router.get("/:projectId", getProject);

export default Router;