import express, { type Request, type Response, type NextFunction } from "express";
import { createServer } from "http";
import { setupVite } from "./vite";
import { setupRoutes } from "./routes";
import { setupAuth } from "./auth";
import { db } from "./db";
import { setupBullBoard } from "./bull-board";
import session from "express-session";
import createMemoryStore from "memorystore";

const app = express();
const server = createServer(app);
const PORT = parseInt(process.env.PORT || "5000");

// Middleware
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// Session configuration
const MemoryStore = createMemoryStore(session);
app.use(
  session({
    secret: process.env.SESSION_SECRET || "duygumotor-secret-key",
    resave: false,
    saveUninitialized: false,
    store: new MemoryStore({
      checkPeriod: 86400000, // 24 hours
    }),
    cookie: {
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
      maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
    },
  })
);

// Setup authentication
setupAuth(app);

// Setup Bull Board (Queue Monitoring)
setupBullBoard(app);

// Setup API routes
setupRoutes(app);

// Error handling middleware
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error("Error:", err);
  res.status(500).json({ 
    error: "Internal server error", 
    message: process.env.NODE_ENV === "development" ? err.message : undefined 
  });
});

// Setup Vite in development or static serving in production
if (process.env.NODE_ENV === "development") {
  await setupVite(server, app);
} else {
  // Production static file serving
  const { serveStatic } = await import("./static");
  serveStatic(app);
}

// Start server
server.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server running on http://0.0.0.0:${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || "development"}`);
  console.log(`💾 Database: ${db ? "Connected" : "Not configured"}`);
});

// Graceful shutdown
process.on("SIGTERM", () => {
  console.log("SIGTERM signal received: closing HTTP server");
  server.close(() => {
    console.log("HTTP server closed");
    process.exit(0);
  });
});

process.on("SIGINT", () => {
  console.log("SIGINT signal received: closing HTTP server");
  server.close(() => {
    console.log("HTTP server closed");
    process.exit(0);
  });
});

