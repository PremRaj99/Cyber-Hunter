import dotenv from "dotenv";
dotenv.config();

const options = {
  httpOnly: true,
  sameSite: "None",
  secure: process.env.NODE_ENV === "production",
};

export default options;