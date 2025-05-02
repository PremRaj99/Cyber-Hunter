import mongoose from "mongoose";
import jwt from "jsonwebtoken";

// If updating existing schema, add teamId if not present
const userSchema = mongoose.Schema(
  {
    email: {
      type: String,
      require: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    emailVerified: {
      type: Boolean,
      default: false,
    },
    password: {
      type: String,
      require: true,
    },
    role: {
      type: String,
      default: "user",
      emum: ["user", "vendor", "admin"],
    },
    refreshToken: {
      type: String,
    },
    teamId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "TeamDetail",
      default: null,
    },

    // Add wallet-related fields
    walletAddress: {
      type: String,
      unique: true,
      sparse: true, // Allow multiple null values
      lowercase: true,
      trim: true,
    },
    walletConnected: {
      type: Boolean,
      default: false,
    },

    // Add 2FA fields if they don't already exist
    twoFactorEnabled: {
      type: Boolean,
      default: false,
    },
    twoFactorSecret: {
      type: String,
    },
    twoFactorTempSecret: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

userSchema.methods.generateAccessToken = function () {
  return jwt.sign(
    {
      _id: this._id,
      email: this.email,
      username: this.username,
      fullName: this.fullName,
      role: this.role,
    },
    process.env.ACCESS_TOKEN_SECRET,
    {
      expiresIn: process.env.ACCESS_TOKEN_EXPIRY,
    }
  );
};

userSchema.methods.generateRefreshToken = function () {
  return jwt.sign(
    {
      _id: this._id,
    },
    process.env.REFRESH_TOKEN_SECRET,
    {
      expiresIn: process.env.REFRESH_TOKEN_EXPIRY,
    }
  );
};

// Create or update model
const User = mongoose.models.User || mongoose.model("User", userSchema);

export default User;
