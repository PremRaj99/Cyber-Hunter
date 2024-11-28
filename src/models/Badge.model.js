import mongoose from "mongoose";

const badgeSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      require: true,
    },
    content: {
        type: String,
        require: true,
    },
    description: {
        type: String,
        require: true,
    },
    category: {
        type: String,
        require: true,
    },
    logo: {
        type: String,
        require: true,
    },
    like: {
        type: Array,
        default: [],
    },
  },
  { timestamps: true }
);

const Badge = mongoose.model("Badge", badgeSchema);

export default Badge;
