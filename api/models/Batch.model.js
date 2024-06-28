import mongoose from "mongoose";

const batchSchema = new mongoose.Schema(
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

const Batch = mongoose.model("Batch", batchSchema);

export default Batch;
