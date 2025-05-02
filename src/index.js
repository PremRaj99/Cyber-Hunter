import dotenv from "dotenv";
import connectToDb from "./config/connectToDb.js";
import app from "./app.js";
import path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";
import http from "http";
import { Server } from "socket.io";
import { initializeSocketIO } from "./socket/socket.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config();

const port = process.env.PORT || 5000;

// Create HTTP server
const server = http.createServer(app);

// Initialize Socket.IO with the server
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    methods: ["GET", "POST"],
    credentials: true,
  },
});

// Setup Socket.IO with event handlers
initializeSocketIO(io);

await connectToDb();
server.listen(port, () => {
  console.log("Server is running on http://localhost:" + port);
  console.log("Socket.IO initialized and listening for connections");
});
