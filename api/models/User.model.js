import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    username: {
      type: Number,
      require: true,
      unique: true,
      max: 8,
    },
    email: {
      type: String,
      require: true,
      unique: true,
    },
    password: {
      type: String,
      require: true,
    },
    role: {
      type: String,
    }
  },
  { timestamps: true }
);

const User = mongoose.model("User", userSchema);

export default User;
