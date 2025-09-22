import "dotenv/config";
import express from "express";
import http from "http";
import cors from "cors";
import { Server } from "socket.io";

import { initializePrisma } from "./config/prisma.js";
import { initializeRedis } from "./config/redis.js";
import { setupSocketHandlers } from "./handlers/socketHandlers.js";
import WordService from "./services/WordService.js";

// Routes
import authRoutes from "./routes/auth.js";
import userRoutes from "./routes/user.js";
import gameRoutes from "./routes/game.js";

const app = express();
const server = http.createServer(app);

// Socket.io setup with CORS
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    methods: ["GET", "POST"],
    credentials: true,
  },
});

// Middleware
app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    credentials: true,
  })
);
app.use(express.json());

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// API Routes
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/game", gameRoutes);

// Initialize services and start server
async function startServer() {
  try {
    await initializePrisma();
    console.log("✓ Prisma connected");

    await initializeRedis();
    console.log("✓ Redis connected");

    await WordService.initialize();
    console.log(
      `✓ Loaded ${WordService.getAnswerCount()} answers and ${WordService.getValidGuessCount()} valid guesses`
    );

    setupSocketHandlers(io);
    console.log("✓ Socket handlers initialized");

    const PORT = process.env.PORT || 8000;
    server.listen(PORT, () => {
      console.log(`\n🎮 WordArena server running on port ${PORT}`);
      console.log(`   Health: http://localhost:${PORT}/health`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
}

startServer();

export { app, io };
