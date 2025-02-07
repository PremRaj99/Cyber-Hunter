import Project from "../models/Project.model.js";
import TeamDetail from "../models/TeamDetail.model.js";
import { errorHandler } from "../utils/error.js";
import uploadOnCloudinary from "../utils/fileUpload.js";

export const createProject = async (req, res, next) => {
  try {
    const {
      projectName,
      projectDescription,
      gitHubLink,
      liveLink,
      techStack,
      language,
      teamId,
      tagId,
    } = req.body;

    if (!projectName || !gitHubLink) {
      return next(errorHandler(400, "Please fill all the required fields."));
    }

    const projectThumbnailLocalPath = req.files?.projectThumbnail?.[0]?.path;

    let projectThumbnailUrl;

    if (projectThumbnailLocalPath) {
      const projectThumbnail = await uploadOnCloudinary(
        projectThumbnailLocalPath
      );
      if (projectThumbnail) {
        projectThumbnailUrl = projectThumbnail.url;
      }
    }

    if (!projectThumbnailUrl) {
      next(errorHandler(400, "Please upload project thumbnail."));
    }

    const projectImageLocalPaths = req.files?.projectImage?.map(
      (file) => file.path
    );

    let projectImageUrl = [];

    if (projectImageLocalPaths) {
      projectImageUrl = await Promise.all(
        projectImageLocalPaths.map(async (path) => {
          const image = await uploadOnCloudinary(path);
          return image.url;
        })
      );
    }

    const projectImage = projectImageUrl;

    let newProject;

    if (teamId) {
      //  code of team project
      const validTeam = await TeamDetail.findById(teamId);

      newProject = new Project({
        teamId,
        projectName,
        projectDescription,
        projectImage,
        projectThumbnail: projectThumbnailUrl,
        gitHubLink,
        liveLink,
        techStack,
        language,
        tagId,
      });
    } else {
      // code of individual project
      newProject = new Project({
        userId: req.user._id,
        projectName,
        projectDescription,
        projectImage,
        projectThumbnail : projectThumbnailUrl,
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
    const { projectId } = req.params;
    const {
      projectName,
      projectDescription,
      gitHubLink,
      liveLink,
      techStack,
      language,
      teamId,
      tagId,
    } = req.body;

    const projectThumbnailLocalPath = req.files?.projectThumbnail?.[0]?.path;
    let projectThumbnailUrl;

    if (projectThumbnailLocalPath) {
      const projectThumbnail = await uploadOnCloudinary(projectThumbnailLocalPath);
      if (projectThumbnail) {
        projectThumbnailUrl = projectThumbnail.url;
      }
    }

    const projectImageLocalPaths = req.files?.projectImage?.map((file) => file.path);
    let projectImageUrl = [];

    if (projectImageLocalPaths) {
      projectImageUrl = await Promise.all(
        projectImageLocalPaths.map(async (path) => {
          const image = await uploadOnCloudinary(path);
          return image.url;
        })
      );
    }

    const updatedProject = await Project.findByIdAndUpdate(
      projectId,
      {
        projectName,
        projectDescription,
        projectImage: projectImageUrl.length ? projectImageUrl : undefined,
        projectThumbnail: projectThumbnailUrl ? projectThumbnailUrl : undefined,
        gitHubLink,
        liveLink,
        techStack,
        language,
        teamId,
        tagId,
      },
      { new: true }
    );

    if (!updatedProject) {
      return next(errorHandler(404, "Project not found"));
    }

    res.status(200).json("Project updated successfully");
  } catch (error) {
    next(error);
  }
};

export const deleteProject = async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const project = await Project.findByIdAndDelete(projectId);

    if (!project) {
      return next(errorHandler(404, "Project not found"));
    }

    res.status(200).json("Project deleted successfully");
  } catch (error) {
    next(error);
  }
};

export const getProjects = async (req, res, next) => {
  try {
    const projects = await Project.find({ userId: req.user._id });
    res.status(200).json(projects);
  } catch (error) {
    next(error);
  }
};

export const getProject = async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const project = await Project.findById(projectId);

    if (!project) {
      return next(errorHandler(404, "Project not found"));
    }

    res.status(200).json(project);
  } catch (error) {
    next(error);
  }
};
