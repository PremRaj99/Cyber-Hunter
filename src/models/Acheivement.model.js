import mongoose from "mongoose";

const achievementSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      unique: true,
    },
    teamId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Team",
      unique: true,
    },
    acheivementName: {
      type: String,
    },
    acheivementDescription: {
      type: String,
    },
    acheivementThumbnail: {
      type: String,
    },
    tagId: {
      type: [mongoose.Schema.Types.ObjectId],
      ref: "Tag",
      default: [],
    },
    point: {
      type: Number,
      default: 0,
    },
    badgeId: {
      type: [mongoose.Schema.Types.ObjectId],
      ref: "Badge",
      default: [],
    },
    type: {
      type: String,
    },
    level: {
      type: String,
    },
    status: {
      type: String,
      default: "pending",
    },
    position: {
      type: String,
      default: "participation",
    },
  },
  { timestamps: true }
);

// Register as "Achievement" (correct spelling)
const Achievement = mongoose.model("Achievement", achievementSchema);
export default Achievement;
