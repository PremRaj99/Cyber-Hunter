import jwt from "jsonwebtoken";

// Map to store active connections: { userId: socketId }
const connectedUsers = new Map();

/**
 * Initialize Socket.IO with event handlers and middleware
 * @param {Server} io - Socket.IO server instance
 */
export const initializeSocketIO = (io) => {
  // Add authentication middleware
  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth.token;

      if (!token) {
        return next(new Error("Authentication error: Token required"));
      }

      // Verify the token
      jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
        if (err) {
          return next(new Error("Authentication error: Invalid token"));
        }

        // Store user information on the socket
        socket.user = decoded;
        next();
      });
    } catch (error) {
      console.error("Socket authentication error:", error);
      next(
        new Error("Authentication error: " + (error.message || "Unknown error"))
      );
    }
  });

  console.log("Socket.IO service initialized");

  io.on("connection", (socket) => {
    console.log(
      `New socket connected: ${socket.id}, User: ${socket.user?._id || "Unknown"}`
    );

    socket.on("register", (userId) => {
      // Verify the userId matches the authenticated user
      if (socket.user && socket.user._id === userId) {
        // Store the mapping between userId and socketId
        connectedUsers.set(userId, socket.id);
        socket.userId = userId; // Store on socket for easy lookup on disconnect
        console.log(`User registered: ${userId} -> ${socket.id}`);
        console.log(`Online users: ${connectedUsers.size}`);

        // Acknowledge the registration
        socket.emit("registered", { success: true });
      } else {
        console.log(
          `Registration failed: User ID mismatch or unauthorized for socket ${socket.id}`
        );
        socket.emit("registered", {
          success: false,
          error: "Unauthorized registration attempt",
        });
      }
    });

    // Handle client disconnect
    socket.on("disconnect", () => {
      // Remove user from connected users map
      if (socket.userId) {
        connectedUsers.delete(socket.userId);
        console.log(`User disconnected: ${socket.userId}`);
        console.log(`Online users: ${connectedUsers.size}`);
      } else {
        console.log(`Socket disconnected without registration: ${socket.id}`);
      }
    });

    // Handle errors
    socket.on("error", (err) => {
      console.error(`Socket error for ${socket.id}:`, err);
    });
  });
};

/**
 * Send notification to a specific user
 * @param {Server} io - Socket.IO server instance
 * @param {string} userId - User ID to send notification to
 * @param {Object} notification - Notification data
 */
export const sendNotificationToUser = (io, userId, notification) => {
  try {
    const socketId = connectedUsers.get(userId);

    if (socketId) {
      console.log(
        `Sending notification to user ${userId} via socket ${socketId}`
      );
      io.to(socketId).emit("notification", notification);
      return true;
    }

    console.log(`User ${userId} is not connected`);
    return false;
  } catch (error) {
    console.error(`Error sending notification to user ${userId}:`, error);
    return false;
  }
};

/**
 * Send notification to all online users
 * @param {Server} io - Socket.IO server instance
 * @param {Object} notification - Notification data
 */
export const sendNotificationToAll = (io, notification) => {
  try {
    io.emit("notification", notification);
    return true;
  } catch (error) {
    console.error("Error broadcasting notification:", error);
    return false;
  }
};

/**
 * Send notification to a team
 * @param {Server} io - Socket.IO server instance
 * @param {Array<string>} userIds - Array of user IDs
 * @param {Object} notification - Notification data
 */
export const sendNotificationToTeam = (io, userIds, notification) => {
  try {
    const sentCount = userIds.reduce((count, userId) => {
      const socketId = connectedUsers.get(userId);
      if (socketId) {
        io.to(socketId).emit("notification", notification);
        return count + 1;
      }
      return count;
    }, 0);

    console.log(
      `Sent team notification to ${sentCount}/${userIds.length} online users`
    );
    return sentCount;
  } catch (error) {
    console.error("Error sending team notification:", error);
    return 0;
  }
};
