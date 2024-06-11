import mongoose from "mongoose";

const tagSchema = new mongoose.Schema(
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
  },
  { timestamps: true }
);

const Tag = mongoose.model("Tag", tagSchema);

export default Teg;
