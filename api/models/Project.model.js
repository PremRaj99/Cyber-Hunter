import mongoose from "mongoose";

const projectSchema = new mongoose.Schema(
  {
    userId: {
        type: String,
        unique : true
    },
    teamId: {
        type: String,
        unique : true
    },
    projectName: {
        type: String,
    },
    projectDescription: {
        type: String,
    },
    projectThumbnail: {
        type: String,
    },
    projectIamge: {
        type: Array,
        default: [],
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
    batchId: {
        type: Array,
        default: [],
    },
    status: {
        type: String,
        default: "pending",
    },
  },
  { timestamps: true }
);

const Project = mongoose.model("Project", projectSchema);

export default Project;
