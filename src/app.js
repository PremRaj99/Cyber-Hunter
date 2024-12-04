import express from "express";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import cors from "cors";
import { ApiResponse } from "./utils/ApiResponse.js";

dotenv.config();

const app = express();

app.use(express.json({ limit: "16kb" }));
app.use(express.urlencoded({ extended: true, limit: "16kb" }));
app.use(cookieParser());
app.use(express.static("public"));
app.use(
  cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true,
  })
);

// import all router
import authRoutes from "./routes/auth.route.js";
import userRoutes from "./routes/user.route.js";
import projectRoutes from "./routes/project.route.js";
import tagRoutes from "./routes/tag.route.js";
import techStackRoutes from "./routes/techStack.route.js";
import languageRoutes from "./routes/language.rotue.js";
import interestRoutes from "./routes/interest.route.js";

// define routes
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/user", userRoutes);
app.use("/api/v1/project", projectRoutes);
app.use("/api/v1/tag", tagRoutes);
app.use("/api/v1/techStack", techStackRoutes);
app.use("/api/v1/language", languageRoutes);
app.use("/api/v1/interest", interestRoutes);

app.get("/", (req, res) => {
  res.send("Hello World");
});

app.use((err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  const message = err.message || "internal server error";

  res.status(statusCode).json(ApiResponse(statusCode, null, message));
});

export default app;
