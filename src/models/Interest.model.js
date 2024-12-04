import mongoose from "mongoose";

const InterestSchema = new mongoose.Schema(
  {
    content: {
        type: String,
        require: true,
    },
  },
  { timestamps: true }
);

const Interest = mongoose.model("Interest", InterestSchema);

export default Interest;
