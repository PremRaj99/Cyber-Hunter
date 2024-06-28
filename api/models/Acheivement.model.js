import mongoose from "mongoose";

const acheivementSchema = new mongoose.Schema(
  {
    userId: {
        type: String,
        unique : true
    },
    teamId: {
        type: String,
        unique : true
    },
    acheivementName: {
        type: String,
    },
    acheivementDescription: {
        type: String,
    },
    acheivementThumbnail: {
        type: String,
    },
    tagId: {
        type: Array,
        default: [],
    },
    point: {
        type: Number,
        default: 0,
    },
    batchId: {
        type: Array,
        default: [],
    },
    type: {
        type: String,
    },
    level: {
        type: String,
    },
    status: {
        type: String,
        default: "pending",
    },
    position: {
        type: String,
        default: "participation",
    }
  },
  { timestamps: true }
);

const Acheivement = mongoose.model("Acheivement", acheivementSchema);

export default Acheivement;
