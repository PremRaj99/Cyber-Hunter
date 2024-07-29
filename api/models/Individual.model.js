import mongoose from "mongoose";

const individualSchema = new mongoose.Schema(
  {
    UserId: {
        type: String,
        require: true,
        unique: true,
      },
      description: {
          type: String,
      },
      projectId: {
          type: Array,
          default: [],
          unique: true,
      },
      achievementId: {
          type: Array,
          default: [],
          unique: true,
      },
      point: {
          type: Number,
          default: 0,
      },
      tagId: {
          type: Array,
          default: [],
      },
      badgeId: {
          type: Array,
          default: [],
      }
  },
  { timestamps: true }
);

const Individual = mongoose.model("Individual", individualSchema);

export default Individual;
