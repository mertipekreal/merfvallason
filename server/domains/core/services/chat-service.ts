/**
 * AI Chat Service
 * Handles conversational AI interactions
 */

import { GoogleGenAI } from "@google/genai";
import Anthropic from "@anthropic-ai/sdk";

const gemini = process.env.GOOGLE_AI_API_KEY
  ? new GoogleGenAI({ apiKey: process.env.GOOGLE_AI_API_KEY })
  : null;

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
    if (!gemini) {
      throw new Error("Gemini AI not configured");
    }

    const model = gemini.getGenerativeModel({ model: "gemini-2.0-flash-exp" });

    // Build conversation history
    const conversationHistory = history.map(msg => ({
      role: msg.role === "user" ? "user" : "model",
      parts: [{ text: msg.content }],
    }));

    // Add system context if provided
    let systemPrompt = "Sen DuyguMotor AI asistanısın. Türkçe ve İngilizce konuşabilirsin. Sosyal medya analizi, müzik trendleri, rüya yorumu ve görsel üretimi konularında uzmansın.";
    if (context) {
      systemPrompt += `\n\nBağlam: ${context}`;
    }

    const chat = model.startChat({
      history: [
        {
          role: "user",
          parts: [{ text: systemPrompt }],
        },
        {
          role: "model",
          parts: [{ text: "Anladım, yardımcı olmaya hazırım!" }],
        },
        ...conversationHistory,
      ],
    });

    const result = await chat.sendMessage(message);
    const response = result.response.text();

    return {
      response,
      model: "gemini-2.0-flash-exp",
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
      gemini: !!gemini && !!process.env.GOOGLE_AI_API_KEY,
      claude: !!anthropic && !!process.env.ANTHROPIC_API_KEY,
      status: gemini || anthropic ? "available" : "no_api_keys",
    };
  }
}

// Export singleton instance
export const chatService = new ChatService();


