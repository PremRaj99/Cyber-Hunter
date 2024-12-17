import mongoose from "mongoose";

const TeamDetailSchema = new mongoose.Schema(
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
      type: [{ type: mongoose.Schema.Types.Mixed }],
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
      unique: true,
    },
    achievementId: {
      type: [{ type: mongoose.Schema.Types.ObjectId, ref: "Achievement" }],
      default: [],
      unique: true,
    },
    point: {
      type: Number,
      default: 0,
    },
    tagId: {
      type: [{ type: mongoose.Schema.Types.ObjectId, ref: "Tag" }],
      default: [],
    },
    badgeId: {
      type: [{ type: mongoose.Schema.Types.ObjectId, ref: "Badge" }],
      default: [],
    },
  },
  { timestamps: true }
);

const TeamDetail = mongoose.model("TeamDetail", TeamDetailSchema);

export default TeamDetail;
