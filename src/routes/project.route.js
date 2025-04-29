import express from "express";
import { verifyJWT } from "../middlewares/verifyUser.js";
import { upload } from "../middlewares/multer.middleware.js";
import {
  createProject,
  deleteProject,
  getProject,
  getProjects,
  updateProject,
  createTeamProject,
  getTeamProjects,
  updateTeamProject,
  deleteTeamProject,
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
// Router.post(
//   "/",
//   verifyJWT,
//   upload.fields([
//     {
//       name: "projectImage",
//       maxCount: 5,
//     },
//     {
//       name: "projectThumbnail",
//       maxCount: 1,
//     },
//   ]),
//   createProject
// );

// update project
Router.put(
  "/:projectId", // <-- Fix: use projectId instead of userId
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
Router.get("/", verifyJWT, getProjects);

// get project
Router.get("/:projectId", getProject);

// Team project routes - specifically for team projects
Router.post(
  "/team",
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
  createTeamProject
);

Router.get("/team/:teamId", verifyJWT, getTeamProjects);

Router.put(
  "/team/:projectId",
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
  updateTeamProject
);

Router.delete("/team/:projectId", verifyJWT, deleteTeamProject);

export default Router;
