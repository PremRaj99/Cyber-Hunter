import Project from "../models/Project.model.js";
import TeamDetail from "../models/TeamDetail.model.js";
import { errorHandler } from "../utils/error.js";

export const createProject = async (req, res, next) => {
  try {
    const {
      projectName,
      projectDescription,
      projectThumbnail,
      projectImage,
      gitHubLink,
      liveLink,
      techStack,
      language,
      teamId,
      tagId,
    } = req.body;

    if (!projectName || !gitHubLink || !projectThumbnail) {
      return next(errorHandler(400, "Please fill all the required fields."));
    }

    let newProject;

    if (teamId) {
      //  code of team project
      const validTeam = await TeamDetail.findById(teamId);

      newProject = new Project({
        teamId,
        projectName,
        projectDescription,
        projectImage,
        projectThumbnail,
        gitHubLink,
        liveLink,
        techStack,
        language,
        tagId,
      });
    } else {
      // code of individual project
      newProject = new Project({
        userId: req.user.id,
        projectName,
        projectDescription,
        projectImage,
        projectThumbnail,
        gitHubLink,
        liveLink,
        techStack,
        language,
        tagId,
      });
    }

    await newProject.save();

    res.status(200).json("New project saved successfully");
  } catch (error) {
    next(error);
  }
};

export const updateProject = async (req, res, next) => {
  try {
  } catch (error) {
    next(error);
  }
};

export const deleteProject = async (req, res, next) => {
  try {
  } catch (error) {
    next(error);
  }
};

export const getProjects = async (req, res, next) => {
  try {
  } catch (error) {
    next(error);
  }
};

export const getProject = async (req, res, next) => {
  try {
  } catch (error) {
    next(error);
  }
};
