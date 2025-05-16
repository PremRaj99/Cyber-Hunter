import mongoose from "mongoose";

const leaderboardSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["individual", "team"],
      required: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: function () {
        return this.type === "individual";
      },
    },
    teamId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "TeamDetail",
      required: function () {
        return this.type === "team";
      },
    },
    points: {
      type: Number,
      default: 0,
    },
    rank: {
      type: Number,
      default: 0,
    },
    techStacks: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "TechStack",
      },
    ],
    languages: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Language",
      },
    ],
    tags: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Tag",
      },
    ],
    lastUpdated: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

// Index for faster queries on type and rank
leaderboardSchema.index({ type: 1, rank: 1 });
leaderboardSchema.index({ type: 1, points: -1 });

const Leaderboard = mongoose.model("Leaderboard", leaderboardSchema);

export default Leaderboard;
