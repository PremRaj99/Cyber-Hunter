import mongoose from "mongoose";

const languageSchema = new mongoose.Schema(
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

const Language = mongoose.model("Language", languageSchema);

export default Language;
