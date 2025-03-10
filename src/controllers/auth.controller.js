import User from "../models/User.model.js";
import bcryptjs from "bcryptjs";
import { errorHandler } from "../utils/error.js";
import UserDetail from "../models/UserDetail.model.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import options from "../utils/cookieOptions.js";
import generateCrypto from "../utils/generateCryptoCode.js";
import { sendMail } from "../utils/mailHandler.js";
import EmailVerification from "../models/EmailVerification.model.js";
import Individual from "../models/Individual.model.js";

export const test = (req, res) => {
  res.json({
    message: "API is Running...",
  });
};

const generateAccessAndRefreshTokens = async (userId) => {
  try {
    const user = await User.findById(userId);
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();

    user.refreshToken = refreshToken;
    await user.save();
    return { accessToken, refreshToken };
  } catch (error) {
    throw errorHandler(
      500,
      "Something went wrong while generating refresh token"
    );
  }
};

export const login = async (req, res, next) => {
  const { email, password } = req.body;

  if (!email || !password || password === "") {
    return next(errorHandler(404, "All fields are required!"));
  }

  try {
    const validEmail = await User.findOne({ email: email });

    if (!validEmail) {
      return next(errorHandler(404, "User Not Found"));
    }
    const validPassword = bcryptjs.compareSync(password, validEmail.password);
    if (!validPassword) {
      return next(errorHandler(401, "Invalid Password"));
    }
    const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(
      validEmail._id
    );

    const { password: pass, ...rest } = validEmail._doc;
    const userDetail = await UserDetail.findOne({
      userId: validEmail._id,
    }).populate("interestId", "content -_id");

    const individual = await Individual.findOne({ userId: validEmail._id }).select("-_id -userId");

    if (!userDetail) {
      return res
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", refreshToken, options)
        .status(200)
        .json(
          ApiResponse(
            200,
            { ...rest, accessToken, refreshToken },
            "Login Successful"
          )
        );
    }
    const data = {
      ...rest,
      accessToken,
      refreshToken,
      name: userDetail.name,
      course: userDetail.course,
      session: userDetail.session,
      branch: userDetail.branch,
      profilePicture: userDetail.profilePicture,
      DOB: userDetail.DOB,
      phoneNumber: userDetail.phoneNumber,
      gender: userDetail.gender,
      teamId: userDetail.teamId,
      qId: userDetail.qId,
      interest: userDetail.interestId.map((int) => int.content),
      bio: individual?.description,
    };

    res
      .cookie("accessToken", accessToken, options)
      .cookie("refreshToken", refreshToken, options)
      .status(200)
      .json(ApiResponse(200, data, "Login Successful"));
  } catch (error) {
    next(error);
  }
};

export const signup = async (req, res, next) => {
  const { email, confirmPassword, password } = req.body;
  if (!email || !password || password === "" || !confirmPassword) {
    return next(errorHandler(404, "All fields are required!"));
  }
  if (confirmPassword !== password) {
    return next(errorHandler(404, "Password donot match!"));
  }
  try {
    const validEmail = await User.findOne({ email: email });
    if (validEmail) {
      return next(errorHandler(409, "Email already exists"));
    }
    const salt = bcryptjs.genSaltSync(10);
    const hashedPassword = bcryptjs.hashSync(password, salt);

    const user = new User({ email, password: hashedPassword });
    await user.save();

    const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(
      user._id
    );

    const { password: pass, refreshToken: ref, ...rest } = user._doc;
    res
      .cookie("accessToken", accessToken, options)
      .cookie("refreshToken", refreshToken, options)
      .status(200)
      .json(
        ApiResponse(
          200,
          { ...rest, accessToken, refreshToken },
          "Signup Successful"
        )
      );
  } catch (error) {
    next(error);
  }
};

export const logout = async (req, res, next) => {
  await User.findByIdAndUpdate(
    req.user._id,
    {
      $set: {
        refreshToken: undefined,
      },
    },
    {
      new: true,
    }
  );

  res
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .status(200)
    .json(ApiResponse(200, {}, "Logout Successful"));
};

export const refreshToken = async (req, res, next) => {
  const { refreshToken } = req.cookies;
  if (!refreshToken) {
    return next(errorHandler(401, "Unauthorized"));
  }
  try {
    const user = await User.findOne({ refreshToken });
    if (!user) {
      return next(errorHandler(401, "Unauthorized"));
    }
    const { accessToken, refreshToken: newRefreshToken } =
      await generateAccessAndRefreshTokens(user._id);

    res
      .cookie("accessToken", accessToken, options)
      .cookie("refreshToken", newRefreshToken, options)
      .status(200)
      .json(ApiResponse(200, { accessToken }, "Refresh Token Generated"));
  } catch (error) {
    next(error);
  }
};

export const sendEmailRequest = async (req, res, next) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    if (!user) {
      return next(errorHandler(404, "User Not Found"));
    }
    const token = generateCrypto(user._id, email);

    const html = `
        <!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>OTP Verification</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      margin: 0;
      padding: 0;
      background-color: #f4f4f4;
    }
    .container {
      max-width: 600px;
      margin: 20px auto;
      background: #ffffff;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
    }
    .header {
      background-color: #4CAF50;
      color: white;
      padding: 20px;
      text-align: center;
    }
    .content {
      padding: 20px;
      text-align: center;
    }
    .otp {
      font-size: 24px;
      font-weight: bold;
      color: #333;
      margin: 20px 0;
    }
    .footer {
      background: #f4f4f4;
      color: #555;
      font-size: 12px;
      text-align: center;
      padding: 10px;
    }
    .footer a {
      color: #4CAF50;
      text-decoration: none;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>OTP Verification</h1>
    </div>
    <div class="content">
      <p>Dear User,</p>
      <p>Use the OTP below to verify your email address:</p>
      <div class="otp">123456</div>
      <p>This OTP is valid for 10 minutes.</p>
      <p>If you didn’t request this, please ignore this email.</p>
    </div>
    <div class="footer">
      <p>Thank you for using our service.</p>
      <p><a href="https://www.example.com">Visit our website</a></p>
    </div>
  </div>
</body>
</html>

    `;

    sendMail(
      user.email,
      "Cyber Hunter Email Verification",
      "Verify your email",
      html
    );

    res.status(200).json(ApiResponse(200, {}, "OTP send to your email"));
  } catch (error) {
    next(error);
  }
};

export const verifyEmail = async (req, res, next) => {
  try {
    const { token } = req.params;
    const email = await EmailVerification.findOne({
      userId: req.user._id,
    });

    if (!email) {
      return next(errorHandler(404, "Email not found"));
    }

    if (email.token !== token) {
      return next(errorHandler(404, "Invalid Token"));
    }

    await User.findByIdAndUpdate(
      req.user._id,
      {
        $set: {
          emailVerified: true,
        },
      },
      {
        new: true,
      }
    );
    res.status(200).json(ApiResponse(200, {}, "Email Verified"));
  } catch (error) {
    next(error);
  }
};

export const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    if (!user) {
      return next(errorHandler(404, "User Not Found"));
    }
    res.status(200).json(ApiResponse(200, {}, "Password Reset Link Sent"));
  } catch (error) {
    next(error);
  }
};

export const resetPassword = async (req, res, next) => {
  try {
    const { email, password, confirmPassword } = req.body;
    if (!email || !password || password === "" || !confirmPassword) {
      return next(errorHandler(404, "All fields are required!"));
    }
    if (password !== confirmPassword) {
      return next(errorHandler(404, "Password donot match!"));
    }
    const user = await User.findOne({ email });
    if (!user) {
      return next(errorHandler(404, "User Not Found"));
    }
    const salt = bcryptjs.genSaltSync(10);
    const hashedPassword = bcryptjs.hashSync(password, salt);

    await User.findByIdAndUpdate(
      user._id,
      {
        $set: {
          password: hashedPassword,
        },
      },
      {
        new: true,
      }
    );

    res.status(200).json(ApiResponse(200, {}, "Password Reset Successful"));
  } catch (error) {
    next(error);
  }
};
