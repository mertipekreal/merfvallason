/**
 * AI Chat Service
 * Handles conversational AI interactions
 */

import Anthropic from "@anthropic-ai/sdk";
import { geminiAIService } from "./gemini-ai-service";

const anthropic = process.env.ANTHROPIC_API_KEY
  ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  : null;

interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

interface ChatCommandRequest {
  command?: string;
  message?: string;
  context?: string;
  history?: ChatMessage[];
}

export class ChatService {
  /**
   * Process chat command
   */
  async processCommand(request: ChatCommandRequest): Promise<{
    response: string;
    model: string;
    timestamp: string;
  }> {
    const { command, message, context, history = [] } = request;
    const userMessage = command || message || "";

    if (!userMessage) {
      throw new Error("No message provided");
    }

    // Determine which AI to use based on context
    const useGemini = this.shouldUseGemini(userMessage, context);
    
    try {
      if (useGemini && gemini) {
        return await this.processWithGemini(userMessage, context, history);
      } else if (anthropic) {
        return await this.processWithClaude(userMessage, context, history);
      } else {
        throw new Error("No AI service available. Please configure GOOGLE_AI_API_KEY or ANTHROPIC_API_KEY");
      }
    } catch (error: any) {
      console.error("Chat service error:", error);
      throw new Error(`Chat processing failed: ${error.message}`);
    }
  }

  /**
   * Decide which AI to use based on the query
   */
  private shouldUseGemini(message: string, context?: string): boolean {
    const lowerMessage = message.toLowerCase();
    const geminiKeywords = [
      "analiz", "trend", "veri", "istatistik", "rapor",
      "analyze", "trend", "data", "statistics", "report"
    ];
    
    return geminiKeywords.some(keyword => lowerMessage.includes(keyword));
  }

  /**
   * Process with Gemini AI
   */
  private async processWithGemini(
    message: string,
    context?: string,
    history: ChatMessage[] = []
  ): Promise<{ response: string; model: string; timestamp: string }> {
    if (!process.env.GOOGLE_AI_API_KEY) {
      throw new Error("Gemini AI not configured");
    }

    // Use the dedicated Gemini AI service
    const result = await geminiAIService.chat("default-user", message);

    return {
      response: result.message,
      model: "gemini-2.5-pro",
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Process with Claude AI
   */
  private async processWithClaude(
    message: string,
    context?: string,
    history: ChatMessage[] = []
  ): Promise<{ response: string; model: string; timestamp: string }> {
    if (!anthropic) {
      throw new Error("Claude AI not configured");
    }

    // Build system prompt
    let systemPrompt = "Sen DuyguMotor AI asistanısın. Türkçe ve İngilizce konuşabilirsin. Sosyal medya analizi, müzik trendleri, rüya yorumu ve görsel üretimi konularında uzmansın. Kullanıcılara yardımcı ol ve detaylı, anlamlı yanıtlar ver.";
    if (context) {
      systemPrompt += `\n\nBağlam: ${context}`;
    }

    // Build messages array
    const messages = [
      ...history.filter(msg => msg.role !== "system").map(msg => ({
        role: msg.role as "user" | "assistant",
        content: msg.content,
      })),
      {
        role: "user" as const,
        content: message,
      },
    ];

    const response = await anthropic.messages.create({
      model: "claude-3-5-haiku-20241022",
      max_tokens: 2048,
      system: systemPrompt,
      messages,
    });

    const textContent = response.content.find(block => block.type === "text");
    const responseText = textContent?.type === "text" ? textContent.text : "No response generated";

    return {
      response: responseText,
      model: "claude-3-5-haiku-20241022",
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Health check for AI services
   */
  async healthCheck(): Promise<{
    gemini: boolean;
    claude: boolean;
    status: string;
  }> {
    return {
      gemini: !!process.env.GOOGLE_AI_API_KEY,
      claude: !!anthropic && !!process.env.ANTHROPIC_API_KEY,
      status: process.env.GOOGLE_AI_API_KEY || anthropic ? "available" : "no_api_keys",
    };
  }
}

// Export singleton instance
export const chatService = new ChatService();


