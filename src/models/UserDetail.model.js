import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      require: true,
    },
    qId: {
      type: String,
      require: true,
      unique: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
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
    section: {
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
    interestId: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Interest",
        default: [],
      },
    ],
    phoneNumber: {
      type: Number,
      validate: {
        validator: function (v) {
          return /^[0-9]{10}$/.test(v);
        },
        message: "Invalid Phone Number",
      },
      required: true
    },
    phoneNumberVerified: {
      type: Boolean,
      default: false,
    },
    gender: {
      type: String,
      required: true,
      enum: ["male", "female", "others"]
    },
    teamId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Team",
      default: null,
    },
  },
  { timestamps: true }
);

const UserDetail = mongoose.model("UserDetail", userSchema);

export default UserDetail;
