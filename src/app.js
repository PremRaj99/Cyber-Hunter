import express from "express";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import cors from "cors";
import { ApiResponse } from "./utils/ApiResponse.js";
import morgan from "morgan";
import path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";
import securityRouter from "./routes/security.route.js";
import { trackDevice } from "./middlewares/deviceTracker.js";
import teamRouter from "./routes/team.routes.js";
import "./models/Acheivement.model.js"; // <-- Ensure this import is present

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config();

const app = express();

app.use(express.json({ limit: "5mb" }));
app.use(express.urlencoded({ extended: true, limit: "16kb" }));
app.use(cookieParser());
app.use(morgan("dev"));

// Configure CORS for production
// app.use(
//   cors({
//     origin: process.env.CORS_ORIGIN || "*",
//     methods: ["GET", "POST", "PUT", "DELETE"],
//     credentials: true,
//   })
// );

app.use(cors());

// import all router
import authRoutes from "./routes/auth.route.js";
import userRoutes from "./routes/user.route.js";
import projectRoutes from "./routes/project.route.js";
import tagRoutes from "./routes/tag.route.js";
import techStackRoutes from "./routes/techStack.route.js";
import languageRoutes from "./routes/language.rotue.js";
import interestRoutes from "./routes/interest.route.js";
import individualRoutes from "./routes/individual.route.js";

// define routes
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/user", userRoutes);
app.use("/api/v1/project", projectRoutes);
app.use("/api/v1/tag", tagRoutes);
app.use("/api/v1/techStack", techStackRoutes);
app.use("/api/v1/language", languageRoutes);
app.use("/api/v1/interest", interestRoutes);
app.use("/api/v1/individual", individualRoutes);
app.use("/api/v1/team", teamRouter);

// Apply device tracking after authentication middleware
app.use(trackDevice);

app.use("/api/v1/security", securityRouter);

// Serve static files from the React app
app.use(express.static(path.join(__dirname, "../../client/dist")));

// The "catchall" handler: for any request that doesn't
// match one above, send back React's index.html file.
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "../../client/dist/index.html"));
});

app.use((err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  const message = err.message || "internal server error";
  console.error(err.stack);

  res.status(statusCode).json(ApiResponse(statusCode, null, message));
});

export default app;
