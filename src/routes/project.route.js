import express from "express";
import { verifyJWT } from "../middlewares/verifyUser.js";
import {
  createProject,
  deleteProject,
  getProject,
  getProjects,
  updateProject,
} from "../controllers/project.controller.js";

const Router = express.Router();

// define router

// create project
Router.post(
  "/",
  verifyJWT,
  upload.fields([
    {
      name: "projectImage",
      maxCount: 5,
    },
    {
      name: "projectThumbnail",
      maxCount: 1,
    },
  ]),
  createProject
);

// update project
Router.put(
  "/:userId",
  verifyJWT,
  upload.fields([
    {
      name: "projectImage",
      maxCount: 5,
    },
    {
      name: "projectThumbnail",
      maxCount: 1,
    },
  ]),
  updateProject
);

// delete project
Router.delete("/:projectId", verifyJWT, deleteProject);

// get all projects
Router.get("/", getProjects);

// get project
Router.get("/:projectId", getProject);

export default Router;
