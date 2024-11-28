import mongoose from "mongoose";

const projectSchema = new mongoose.Schema(
  {
    userId: {
        type: String,
    },
    teamId: {
        type: String,
    },
    projectName: {
        type: String,
        required: true
    },
    projectImage: {
        type: Array,
        default: [],
    },
    gitHubLink: {
        type: String,
        required: true,
    },
    liveLink: {
        type: String,
    },
    projectDescription: {
        type: String, 
    },
    projectThumbnail: {
        type: String,
        required: true,
    },
    tagId: {
        type: Array,
        default: [],
    },
    rating: {
        type: Number,
        default: 0,
    },
    point: {
        type: Number,
        default: 0,
    },
    totalPoint: {
        type: Number,
        default: 0,
    },
    commentId: {
        type: Array,
        default: [],
    },
    like: {
        type: Array,
        default: [],
    },
    techStack: {
        type: Array,
        default: [],
    },
    language: {
        type: Array,
        default: [],
    },
    badgeId: {
        type: Array,
        default: [],
    },
    status: {
        type: String,
        default: "pending",
        enum: ["pending", "active"]
    },
  },
  { timestamps: true }
);

const Project = mongoose.model("Project", projectSchema);

export default Project;
