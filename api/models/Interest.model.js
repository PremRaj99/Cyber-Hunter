import mongoose from "mongoose";

const InterestSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      require: true,
    },
    interestName: {
        type: String,
        require: true,
    },
  },
  { timestamps: true }
);

const Interest = mongoose.model("Interest", InterestSchema);

export default Interest;
