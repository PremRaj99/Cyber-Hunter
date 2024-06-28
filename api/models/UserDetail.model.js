import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      require: true,
    },
    userId: {
      type: String,
      require: true,
      unique: true,
    },
    course: {
      type: String,
      require: true,
    },
    session: {
      type: String,
      require: true,
    },
    branch: {
      type: String,
      require: true,
    },
    DOB: {
      type: Date,
      require: true,
    },
    profilePicture: {
      type: String,
      default:
        "https://static-00.iconduck.com/assets.00/profile-circle-icon-512x512-zxne30hp.png",
    },
    Intrest: {
      type: Array,
      default: [],
    },
    phoneNumber: {
      type: Number,
      require: true,
      maxLength: 10,
    },
    TeamId: {
      type: String,
      default: null,
    },
  },
  { timestamps: true }
);

const UserDetail = mongoose.model("UserDetail", userSchema);

export default UserDetail;
