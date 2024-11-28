import mongoose from "mongoose";

const tagSchema = new mongoose.Schema(
  {
    content: {
        type: String,
        require: true,
    },
  },
  { timestamps: true }
);

const Tag = mongoose.model("Tag", tagSchema);

export default Tag;
