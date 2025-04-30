import mongoose from "mongoose";

const joinRequestSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    message: {
      type: String,
      default: "",
    },
    status: {
      type: String,
      enum: ["pending", "accepted", "rejected", "invited"],
      default: "pending",
    },
    requestedAt: {
      type: Date,
      default: Date.now,
    },
    respondedAt: {
      type: Date,
    },
    invitedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { _id: true }
);

// Update TeamDetail schema to include join requests if not already present
const teamDetailSchema = mongoose.Schema(
  {
    TeamCreaterId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    TeamName: {
      type: String,
      required: true,
      unique: true,
    },
    TeamLogo: {
      type: String,
      default:
        "https://static.vecteezy.com/system/resources/thumbnails/013/927/838/small_2x/company-and-team-illustration-in-minimal-style-png.png",
    },
    TeamDescription: {
      type: String,
    },
    TeamMembers: {
      type: [
        {
          userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
          role: { type: String, default: "Member" },
          status: { type: String, default: "Active" },
          points: { type: Number, default: 0 },
          skills: [String],
          social: {
            github: String,
            linkedin: String,
            twitter: String,
            instagram: String,
            dribbble: String,
          },
        },
      ],
      default: [],
      required: true,
      validate: {
        validator: function (array) {
          return array.length <= 5;
        },
        message: "TeamMembers array exceeds the limit of 5 members.",
      },
    },
    projectId: {
      type: [{ type: mongoose.Schema.Types.ObjectId, ref: "Project" }],
      default: [],
    },
    achievementId: {
      type: [{ type: mongoose.Schema.Types.ObjectId, ref: "Achievement" }],
      default: [],
    },
    points: {
      type: Number,
      default: 0,
    },
    techStack: {
      type: [String],
      default: [],
    },
    fieldOfExcellence: {
      type: [{ field: String, level: Number }],
      default: [],
    },
    interests: {
      type: [String],
      default: [],
    },
    tagId: {
      type: [{ type: mongoose.Schema.Types.ObjectId, ref: "Tag" }],
      default: [],
    },
    badgeId: {
      type: [{ type: mongoose.Schema.Types.ObjectId, ref: "Badge" }],
      default: [],
    },
    chatMessages: {
      type: [
        {
          userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
          message: String,
          timestamp: { type: Date, default: Date.now },
          reactions: [String],
          attachments: [String],
        },
      ],
      default: [],
    },
    channels: {
      type: [
        {
          name: String,
          description: String,
          isActive: { type: Boolean, default: true },
          createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        },
      ],
      default: [
        { name: "general", description: "General discussion", isActive: true },
      ],
    },
    // Add joinRequests field if not already present
    joinRequests: {
      type: [joinRequestSchema],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

// Create or update model
const TeamDetail =
  mongoose.models.TeamDetail || mongoose.model("TeamDetail", teamDetailSchema);

export default TeamDetail;
