import mongoose from "mongoose";

const commentSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      require: true,
    },
    content: {
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

const Comment = mongoose.model("Comment", commentSchema);

export default Comment;
