import { type Express } from "express";
import { loadDomains } from "./domains";
import { requireAuth, requireAdmin } from "./auth";
import { simpleChat } from "./simple-chat";

// In-memory chat history (per user)
const chatHistoryByUser: Map<string, Array<{ role: string; content: string; timestamp: string }>> = new Map();

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
      const { message, userId = 'default-user' } = req.body;
      
      // Get or create user history
      if (!chatHistoryByUser.has(userId)) {
        chatHistoryByUser.set(userId, []);
      }
      const userHistory = chatHistoryByUser.get(userId)!;
      
      // Add to history
      userHistory.push({ role: 'user', content: message, timestamp: new Date().toISOString() });
      
      const response = await simpleChat(message);

      // Add AI response to history
      userHistory.push({ role: 'model', content: response, timestamp: new Date().toISOString() });
      
      // Keep only last 50 messages
      if (userHistory.length > 50) {
        userHistory.splice(0, userHistory.length - 50);
      }

      res.json({
        success: true,
        content: response,
        role: 'model',
        model: 'claude',
        timestamp: new Date().toISOString(),
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
      const { message, userId = 'default-user' } = req.body;
      
      // Get or create user history
      if (!chatHistoryByUser.has(userId)) {
        chatHistoryByUser.set(userId, []);
      }
      const userHistory = chatHistoryByUser.get(userId)!;
      
      // Add to history
      userHistory.push({ role: 'user', content: message, timestamp: new Date().toISOString() });
      
      // Set SSE headers
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      // Get AI response
      const response = await simpleChat(message);

      // Add AI response to history
      userHistory.push({ role: 'model', content: response, timestamp: new Date().toISOString() });
      
      // Keep only last 50 messages
      if (userHistory.length > 50) {
        userHistory.splice(0, userHistory.length - 50);
      }

      // Send as SSE format
      res.write(`data: ${JSON.stringify({ type: 'content', data: response })}\n\n`);
      res.write(`data: ${JSON.stringify({ type: 'final', data: { message: response } })}\n\n`);
      res.write('data: [DONE]\n\n');
      res.end();
      
    } catch (error: any) {
      console.error('Chat stream error:', error);
      res.write(`data: ${JSON.stringify({ type: 'error', error: error.message })}\n\n`);
      res.end();
    }
  });

  // Chat history endpoint
  app.get("/api/chat/history/:userId", async (req, res) => {
    const userId = req.params.userId || 'default-user';
    const userHistory = chatHistoryByUser.get(userId) || [];
    
    res.status(200).json({
      success: true,
      history: userHistory.slice(-50) // Last 50 messages
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

