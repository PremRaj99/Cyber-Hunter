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
import "./models/Acheivement.model.js";
import passport from "passport"; // Import passport here
import session from "express-session"; // Import session here
import setupPassport from "./config/passport.js"; // Import passport setup

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config();

const app = express();

app.use(express.json({ limit: "5mb" }));
app.use(express.urlencoded({ extended: true, limit: "16kb" }));
app.use(cookieParser());
app.use(morgan("dev"));

// CORS configuration
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || "http://localhost:5173",
    methods: ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// Add a special handler for OPTIONS preflight requests
app.options("*", (req, res) => {
  res.header(
    "Access-Control-Allow-Origin",
    process.env.CORS_ORIGIN || "http://localhost:5173"
  );
  res.header(
    "Access-Control-Allow-Methods",
    "GET, POST, PATCH, PUT, DELETE, OPTIONS"
  );
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.header("Access-Control-Allow-Credentials", "true");
  res.status(204).send();
});

// Setup session before passport initialization
app.use(
  session({
    secret: process.env.SESSION_SECRET || "cyber-hunter-secret",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    },
  })
);

// Initialize Passport
app.use(passport.initialize());
app.use(passport.session());

// Setup Passport strategies
setupPassport();

// import all router
import authRoutes from "./routes/auth.route.js";
import userRoutes from "./routes/user.route.js";
import projectRoutes from "./routes/project.route.js";
import tagRoutes from "./routes/tag.route.js";
import techStackRoutes from "./routes/techStack.route.js";
import languageRoutes from "./routes/language.rotue.js";
import interestRoutes from "./routes/interest.route.js";
import individualRoutes from "./routes/individual.route.js";
import teamRouter from "./routes/team.routes.js";
import githubAuthRoutes from "./routes/githubAuth.route.js";
import walletAuthRoutes from "./routes/walletAuth.route.js";
import notificationRouter from "./routes/notification.route.js"; // Add notification routes
import newsletterRoutes from "./routes/newsletter.route.js"; // Add newsletter routes
import supportRouter from "./routes/support.route.js"; // Import support routes
import notificationRoutes from "./routes/notification.route.js"; // Add this to your existing route imports

// Debug middleware to log all requests
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// define routes
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/auth", githubAuthRoutes);
app.use("/api/v1/wallet", walletAuthRoutes);
app.use("/api/v1/user", userRoutes);
app.use("/api/v1/project", projectRoutes);
app.use("/api/v1/tag", tagRoutes);
app.use("/api/v1/techStack", techStackRoutes);
app.use("/api/v1/language", languageRoutes);
app.use("/api/v1/interest", interestRoutes);
app.use("/api/v1/individual", individualRoutes);
app.use("/api/v1/team", teamRouter);
app.use("/api/v1/notifications", notificationRouter);
app.use("/api/v1/newsletter", newsletterRoutes);
app.use("/api/v1/support", supportRouter);
app.use("/api/v1/notifications", notificationRoutes); // Add this to your route setup section
// Apply device tracking after authentication middleware
app.use(trackDevice);

app.use("/api/v1/security", securityRouter);

// Route to check GitHub configuration
app.get("/api/v1/auth/github-status", (req, res) => {
  const info = {
    passportInitialized: !!passport._strategies.github,
    clientId: process.env.GITHUB_CLIENT_ID ? "Configured" : "Missing",
    clientSecret: process.env.GITHUB_CLIENT_SECRET ? "Configured" : "Missing",
    callbackUrl: process.env.GITHUB_CALLBACK_URL || "Not configured",
  };

  res.json(new ApiResponse(200, info, "GitHub OAuth configuration status"));
});

// Serve static files from the React app
app.use(express.static(path.join(__dirname, "../../client/dist")));

// The "catchall" handler: for any request that doesn't
// match one above, send back React's index.html file.
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "../../client/dist/index.html"));
});

// Improved error handler
app.use((err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  const message = err.message || "internal server error";
  console.error("API Error:", err.stack);

  // Send proper API response
  res.status(statusCode).json(new ApiResponse(statusCode, null, message));
});

export default app;
