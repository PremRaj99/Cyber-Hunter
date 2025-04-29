import Project from "../models/Project.model.js";
import TeamDetail from "../models/TeamDetail.model.js";
import UserDetail from "../models/UserDetail.model.js";
import Individual from "../models/Individual.model.js";
import { errorHandler } from "../utils/error.js";
import uploadOnCloudinary from "../utils/fileUpload.js";
import mongoose from "mongoose";

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
        projectThumbnail: projectThumbnailUrl,
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
      const projectThumbnail = await uploadOnCloudinary(
        projectThumbnailLocalPath
      );
      if (projectThumbnail) {
        projectThumbnailUrl = projectThumbnail.url;
      }
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
    const project = await Project.findById(projectId).populate([
      {
        path: "tagId",
        select: "content",
      },
      {
        path: "techStack",
        select: "content",
      },
      {
        path: "language",
        select: "content",
      },
    ]);

    const userDetail = await UserDetail.findOne({
      userId: project.userId,
    }).populate("interestId", "content");

    if (!project) {
      return next(errorHandler(404, "Project not found"));
    }

    res.status(200).json({ project, userDetail });
  } catch (error) {
    next(error);
  }
};

/**
 * Create a team project
 * @route POST /api/v1/project/team
 */
export const createTeamProject = async (req, res, next) => {
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

    if (!projectName || !gitHubLink || !teamId) {
      return next(
        errorHandler(
          400,
          "Please fill all the required fields including teamId."
        )
      );
    }

    // Validate the team exists
    const team = await TeamDetail.findById(teamId);
    if (!team) {
      return next(errorHandler(404, "Team not found"));
    }

    // Check if user is a team member or creator
    const isTeamMember = team.TeamMembers.some(
      (member) => member.userId.toString() === req.user._id.toString()
    );

    const isTeamCreator =
      team.TeamCreaterId.toString() === req.user._id.toString();

    if (!isTeamMember && !isTeamCreator) {
      return next(
        errorHandler(
          403,
          "You are not authorized to create projects for this team"
        )
      );
    }

    // Process thumbnail
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
      return next(errorHandler(400, "Please upload project thumbnail."));
    }

    // Process project images
    const projectImageLocalPaths = req.files?.projectImage?.map(
      (file) => file.path
    );

    let projectImageUrl = [];

    if (projectImageLocalPaths && projectImageLocalPaths.length > 0) {
      const uploadResults = await Promise.all(
        projectImageLocalPaths.map(async (path) => {
          return await uploadOnCloudinary(path);
        })
      );

      // Filter out null results and extract URLs
      projectImageUrl = uploadResults
        .filter((result) => result !== null)
        .map((result) => result.url);
    }

    // Create the team project
    const newProject = new Project({
      teamId,
      projectName,
      projectDescription,
      projectImage: projectImageUrl,
      projectThumbnail: projectThumbnailUrl,
      gitHubLink,
      liveLink,
      techStack,
      language,
      tagId,
      status: isTeamCreator ? "active" : "pending",
    });

    const savedProject = await newProject.save();

    // Update the team's project list
    await TeamDetail.findByIdAndUpdate(
      teamId,
      { $push: { projectId: savedProject._id } },
      { new: true }
    );

    res.status(200).json({
      success: true,
      message: "Team project saved successfully",
      data: savedProject._id,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all projects for a specific team
 * @route GET /api/v1/project/team/:teamId
 */
export const getTeamProjects = async (req, res, next) => {
  try {
    const { teamId } = req.params;

    // Check if teamId is valid
    if (!teamId || teamId === "null" || teamId === "undefined") {
      return res.status(400).json({
        success: false,
        message: "Invalid team ID provided",
      });
    }

    // Check if the teamId is a valid ObjectId
    if (!mongoose.Types.ObjectId.isValid(teamId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid team ID format",
      });
    }

    // Validate team exists
    const team = await TeamDetail.findById(teamId);
    if (!team) {
      return next(errorHandler(404, "Team not found"));
    }

    // Check if user is authorized to see team projects
    const isMember = team.TeamMembers.some(
      (member) => member.userId.toString() === req.user._id.toString()
    );

    const isTeamCreator =
      team.TeamCreaterId.toString() === req.user._id.toString();

    if (!isMember && !isTeamCreator) {
      return next(
        errorHandler(403, "You are not authorized to view this team's projects")
      );
    }

    // Fetch projects for this team with populated data
    const projects = await Project.find({ teamId })
      .populate([
        {
          path: "tagId",
          select: "content",
        },
        {
          path: "techStack",
          select: "content",
        },
        {
          path: "language",
          select: "content",
        },
      ])
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: projects,
      message: "Team projects fetched successfully",
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update a team project
 * @route PUT /api/v1/project/team/:projectId
 */
export const updateTeamProject = async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const {
      projectName,
      projectDescription,
      gitHubLink,
      liveLink,
      techStack,
      language,
      tagId,
    } = req.body;

    // First find the project to confirm it's a team project
    const project = await Project.findById(projectId);
    if (!project) {
      return next(errorHandler(404, "Project not found"));
    }

    if (!project.teamId) {
      return next(errorHandler(400, "This is not a team project"));
    }

    // Check authorization
    const team = await TeamDetail.findById(project.teamId);
    if (!team) {
      return next(errorHandler(404, "Team not found"));
    }

    const isTeamCreator =
      team.TeamCreaterId.toString() === req.user._id.toString();
    if (!isTeamCreator) {
      return next(
        errorHandler(403, "Only team creator can update team projects")
      );
    }

    // Process uploads
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

    // Update the project
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
        tagId,
      },
      { new: true }
    );

    res.status(200).json({
      success: true,
      message: "Team project updated successfully",
      data: updatedProject,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete a team project
 * @route DELETE /api/v1/project/team/:projectId
 */
export const deleteTeamProject = async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const project = await Project.findById(projectId);

    if (!project) {
      return next(errorHandler(404, "Project not found"));
    }

    if (!project.teamId) {
      return next(errorHandler(400, "This is not a team project"));
    }

    // Check authorization
    const team = await TeamDetail.findById(project.teamId);
    if (!team) {
      return next(errorHandler(404, "Team not found"));
    }

    const isTeamCreator =
      team.TeamCreaterId.toString() === req.user._id.toString();
    if (!isTeamCreator) {
      return next(
        errorHandler(403, "Only team creator can delete team projects")
      );
    }

    // Remove project from team's project list
    await TeamDetail.findByIdAndUpdate(project.teamId, {
      $pull: { projectId: projectId },
    });

    // Delete the project
    await Project.findByIdAndDelete(projectId);

    res.status(200).json({
      success: true,
      message: "Team project deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};
