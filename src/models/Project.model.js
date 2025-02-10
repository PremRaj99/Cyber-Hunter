import mongoose from "mongoose";

const projectSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    teamId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Team",
    },
    projectName: {
      type: String,
      required: true,
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
      type: [mongoose.Schema.Types.ObjectId],
      ref: "Tag",
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
      type: [mongoose.Schema.Types.ObjectId],
      ref: "Comment",
      default: [],
    },
    like: {
      type: [mongoose.Schema.Types.ObjectId],
      ref: "User",
      default: [],
    },
    techStack: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "TechStack",
        default: [],
      },
    ],
    language: [
      { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: "Language", 
        default: [] 
      },
    ],
    badgeId: {
      type: [mongoose.Schema.Types.ObjectId],
      ref: "Badge",
      default: [],
    },
    status: {
      type: String,
      default: "pending",
      enum: ["pending", "active"],
    },
  },
  { timestamps: true }
);

const Project = mongoose.model("Project", projectSchema);

export default Project;
