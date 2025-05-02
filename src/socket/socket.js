import jwt from "jsonwebtoken";

// Map to store active connections: { userId: socketId }
const connectedUsers = new Map();

/**
 * Initialize Socket.IO with event handlers and middleware
 * @param {Server} io - Socket.IO server instance
 */
export const initializeSocketIO = (io) => {
  // Authentication middleware
  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) {
        return next(new Error("Authentication error: Token required"));
      }

      // Verify JWT token
      const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
      socket.userId = decoded._id;
      next();
    } catch (error) {
      console.error("Socket authentication error:", error);
      next(new Error("Authentication error: Invalid token"));
    }
  });

  io.on("connection", (socket) => {
    console.log(`New socket connection: ${socket.id}`);

    // Register user for receiving notifications
    socket.on("register", (userId) => {
      if (userId) {
        // Store the mapping between userId and socketId
        connectedUsers.set(userId, socket.id);
        console.log(`User registered: ${userId} -> ${socket.id}`);
        console.log(`Online users: ${connectedUsers.size}`);
      }
    });

    // Handle client disconnect
    socket.on("disconnect", () => {
      // Remove user from connected users map
      if (socket.userId) {
        connectedUsers.delete(socket.userId);
        console.log(`User disconnected: ${socket.userId}`);
        console.log(`Online users: ${connectedUsers.size}`);
      }
    });
  });

  console.log("Socket.IO initialized");
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
