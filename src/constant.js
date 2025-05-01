import dotnev from "dotenv";
dotnev.config();

export const DB_NAME = "Cyber_Hunter_dummy";

export const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
export const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;

// GitHub OAuth settings
export const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID;
export const GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET;
export const GITHUB_CALLBACK_URL =
  process.env.GITHUB_CALLBACK_URL ||
  "http://localhost:3000/api/v1/auth/github/callback";
export const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:5173";
