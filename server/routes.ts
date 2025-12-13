import { type Express } from "express";
import { loadDomains } from "./domains";
import { requireAuth, requireAdmin } from "./auth";
import { chatService } from "./domains/core/services/chat-service";

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

  // Direct chat endpoint (for frontend compatibility)
  app.post("/api/chat/message", async (req, res) => {
    try {
      const { message, userId, context } = req.body;
      
      const result = await chatService.processCommand({
        message,
        context,
      });

      res.json({
        success: true,
        content: result.response,
        role: 'model',
        ...result,
      });
    } catch (error: any) {
      console.error('Chat message error:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to process chat message',
      });
    }
  });

  // Chat stream endpoint (SSE)
  app.post("/api/chat/stream", async (req, res) => {
    try {
      const { message, userId, context } = req.body;
      
      const result = await chatService.processCommand({
        message,
        context,
      });

      res.json({
        success: true,
        content: result.response,
        role: 'model',
        ...result,
      });
    } catch (error: any) {
      console.error('Chat stream error:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to process chat stream',
      });
    }
  });

  // Chat history endpoint
  app.get("/api/chat/history/:userId", async (req, res) => {
    res.status(200).json({
      success: true,
      history: []
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
        "/api/chat/message",
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

