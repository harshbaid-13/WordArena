/**
 * Socket.io configuration and middleware
 */

import jwt from "jsonwebtoken";

/**
 * Socket authentication middleware
 */
export function socketAuthMiddleware(socket, next) {
  const token = socket.handshake.auth.token;

  if (!token) {
    // Allow anonymous connections for spectators or guest play
    socket.user = null;
    return next();
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.user = decoded;
    next();
  } catch (error) {
    next(new Error("Authentication failed"));
  }
}

/**
 * Socket error handler
 */
export function socketErrorHandler(socket, error) {
  console.error(`Socket error for ${socket.id}:`, error.message);
  socket.emit("error", { message: error.message });
}

/**
 * Get socket configuration options
 */
export function getSocketConfig() {
  return {
    pingTimeout: 60000,
    pingInterval: 25000,
    transports: ["websocket", "polling"],
    allowUpgrades: true,
  };
}
