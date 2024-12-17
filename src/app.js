import express from "express";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import cors from "cors";
import { ApiResponse } from "./utils/ApiResponse.js";
import morgan from "morgan";
// import path from "path";


dotenv.config();

const app = express();

app.use(express.json({ limit: "5mb" }));
app.use(express.urlencoded({ extended: true, limit: "16kb" }));
app.use(cookieParser());
app.use(express.static("public"));
app.use(morgan("dev"));
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || "*",
    methods: ["GET", "POST", "PUT", "DELETE"],
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
  res.send("Server is on development mode");
});
// app.use(express.static(path.join(__dirname, "../client/dist")));

// app.get("*", (req, res) => {
//   res.sendFile(path.join(__dirname, "../client", "dist", "index.html"));
// });

app.use((err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  const message = err.message || "internal server error";
  console.error(err.stack);

  res.status(statusCode).json(ApiResponse(statusCode, null, message));
});

export default app;
