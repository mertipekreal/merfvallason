import { type Express } from "express";
import { loadDomains } from "./domains";
import { requireAuth, requireAdmin } from "./auth";

export function setupRoutes(app: Express) {
  console.log("🔌 Setting up API routes...");

  // Health check endpoint
  app.get("/api/health", (req, res) => {
    res.json({ 
      status: "ok", 
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || "development"
    });
  });

  // Load domain-based routes (core, market, creative, valuation)
  loadDomains(app).catch(error => {
    console.error("Failed to load domains:", error);
  });

  // 404 handler for API routes
  app.all("/api/*", (req, res) => {
    res.status(404).json({ 
      error: "Not Found",
      message: `Route ${req.method} ${req.path} not found`,
      availableEndpoints: [
        "/api/health",
        "/api/core/*",
        "/api/market-domain/*",
        "/api/creative-domain/*",
        "/api/valuation-domain/*"
      ]
    });
  });

  console.log("✅ API routes configured");
}

// Export middleware for use in other files
export { requireAuth, requireAdmin };

