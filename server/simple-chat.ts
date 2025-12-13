/**
 * SIMPLE CHAT - Minimal, çalışır garanti!
 * Karmaşık servisler yok, direkt AI API çağrısı
 */

import Anthropic from "@anthropic-ai/sdk";
import { GoogleGenerativeAI } from "@google/generative-ai";

// Initialize AI services
const anthropic = process.env.ANTHROPIC_API_KEY
  ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  : null;

const genAI = process.env.GOOGLE_AI_API_KEY
  ? new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY)
  : null;

export async function simpleChat(message: string): Promise<string> {
  // Try Claude first
  if (anthropic) {
    try {
      const response = await anthropic.messages.create({
        model: "claude-3-5-haiku-20241022",
        max_tokens: 1024,
        messages: [{
          role: "user",
          content: message
        }]
      });

      const content = response.content[0];
      if (content.type === "text") {
        return content.text;
      }
    } catch (error: any) {
      console.error("Claude error:", error.message);
    }
  }

  // Try Gemini as fallback
  if (genAI) {
    try {
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      const result = await model.generateContent(message);
      return result.response.text();
    } catch (error: any) {
      console.error("Gemini error:", error.message);
    }
  }

  throw new Error("No AI service available");
}

