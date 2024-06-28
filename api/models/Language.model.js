import mongoose from "mongoose";

const languageSchema = new mongoose.Schema(
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
    status: {
        type: String,
        default: "pending",
    }
  },
  { timestamps: true }
);

const Language = mongoose.model("Language", languageSchema);

export default Comment;
