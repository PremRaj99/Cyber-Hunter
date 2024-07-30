import mongoose from "mongoose";

const techStackSchema = new mongoose.Schema(
  {
    content: {
        type: String,
        require: true,
    },
    logo: {
        type: String,
    },
  },
  { timestamps: true }
);

const TechStack = mongoose.model("TechStack", techStackSchema);

export default TechStack;
