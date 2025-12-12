// ============================================================================
// 🚨 SENTRY MUST BE IMPORTED FIRST! (Before any other imports)
// ============================================================================
console.log("🔍 [SENTRY] Starting Sentry initialization...");
console.log("🔍 [SENTRY] SENTRY_DSN exists?", !!process.env.SENTRY_DSN);
console.log("🔍 [SENTRY] SENTRY_DSN value:", process.env.SENTRY_DSN ? `${process.env.SENTRY_DSN.substring(0, 20)}...` : "NOT SET");

let Sentry: any = null;
let nodeProfilingIntegration: any = null;

try {
  console.log("🔍 [SENTRY] Attempting to import @sentry/node...");
  Sentry = require("@sentry/node");
  console.log("✅ [SENTRY] @sentry/node imported successfully");
  
  console.log("🔍 [SENTRY] Attempting to import @sentry/profiling-node...");
  nodeProfilingIntegration = require("@sentry/profiling-node").nodeProfilingIntegration;
  console.log("✅ [SENTRY] @sentry/profiling-node imported successfully");
  
  // Initialize Sentry IMMEDIATELY
  if (process.env.SENTRY_DSN) {
    console.log("🔍 [SENTRY] Initializing Sentry with DSN...");
    Sentry.init({
      dsn: process.env.SENTRY_DSN,
      environment: process.env.NODE_ENV || "development",
      tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
      profilesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
      integrations: [
        nodeProfilingIntegration(),
      ],
      // Performance Monitoring
      beforeSend(event: any, hint: any) {
        // Add custom context
        if (hint.originalException instanceof Error) {
          event.contexts = {
            ...event.contexts,
            app: {
              name: "DuyguMotor",
              version: "1.0.0",
            },
          };
        }
        return event;
      },
    });
    console.log("✅ Sentry initialized successfully!");
  } else {
    console.warn("⚠️  SENTRY_DSN not found - Error tracking disabled");
  }
} catch (error: any) {
  console.error("❌ [SENTRY] Failed to initialize Sentry:", error.message);
  console.error("❌ [SENTRY] Error stack:", error.stack);
  // Continue without Sentry - don't crash the app
}

import { logger } from './utils/logger';
export const log = logger;

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

// Sentry request handler MUST be the first middleware
if (process.env.SENTRY_DSN && Sentry) {
  try {
    app.use(Sentry.Handlers.requestHandler());
    app.use(Sentry.Handlers.tracingHandler());
    console.log("✅ Sentry request handlers attached");
  } catch (error: any) {
    console.error("❌ Failed to attach Sentry handlers:", error.message);
  }
}
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
      checkPeriod: 86400000,
    }),
    cookie: {
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
      maxAge: 1000 * 60 * 60 * 24 * 7,
    },
  })
);

// ⚡ CRITICAL: Health check FIRST (for Railway deployment)
app.get("/api/health", (_req, res) => {
  res.json({ 
    status: "ok", 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "development"
  });
});

// Setup authentication
try {
  setupAuth(app);
  console.log("✅ Auth setup complete");
} catch (err) {
  console.error("❌ Auth setup failed:", err);
}

// Setup Bull Board
try {
  setupBullBoard(app);
  console.log("✅ Bull Board setup complete");
} catch (err) {
  console.error("❌ Bull Board setup failed:", err);
}

// Setup API routes
try {
  setupRoutes(app);
  console.log("✅ Routes setup complete");
} catch (err) {
  console.error("❌ Routes setup failed:", err);
}

// Test endpoint for Sentry
app.get("/api/sentry-test", (_req, res) => {
  throw new Error("🧪 Sentry Test Error - If you see this in Sentry, it's working!");
});

// Sentry error handler MUST be before other error handlers
if (process.env.SENTRY_DSN && Sentry) {
  try {
    app.use(Sentry.Handlers.errorHandler());
    console.log("✅ Sentry error handler attached");
  } catch (error: any) {
    console.error("❌ Failed to attach Sentry error handler:", error.message);
  }
}

// Error handling middleware
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error("Error:", err);
  
  // Send to Sentry if configured
  if (process.env.SENTRY_DSN && Sentry) {
    try {
      Sentry.captureException(err);
    } catch (sentryError: any) {
      console.error("❌ Failed to send error to Sentry:", sentryError.message);
    }
  }
  
  res.status(500).json({ 
    error: "Internal server error", 
    message: process.env.NODE_ENV === "development" ? err.message : undefined 
  });
});

// Setup and start server
async function startServer() {
  console.log("🔄 Starting server...");
  console.log(`📊 Environment: ${process.env.NODE_ENV || "development"}`);
  console.log(`🔌 Port: ${PORT}`);
  console.log(`💾 Database: ${db ? "Connected" : "Not configured"}`);
  
  try {
    if (process.env.NODE_ENV === "development") {
      console.log("🔧 Setting up Vite...");
      await setupVite(server, app);
    } else {
      console.log("📦 Setting up static file serving...");
      const { serveStatic } = await import("./static");
      serveStatic(app);
      console.log("✅ Static files configured");
    }

    server.listen(PORT, "0.0.0.0", () => {
      console.log(`\n🎉 SERVER READY!`);
      console.log(`🚀 Server running on http://0.0.0.0:${PORT}`);
      console.log(`🏥 Health check: http://0.0.0.0:${PORT}/api/health\n`);
    });
  } catch (err) {
    console.error("❌ FATAL ERROR during server startup:", err);
    throw err;
  }
}

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

startServer().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});

