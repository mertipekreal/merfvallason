/**
 * SIMPLE CHAT - Minimal, kesin çalışır!
 * Sadece Claude AI
 */

import Anthropic from "@anthropic-ai/sdk";

const anthropic = process.env.ANTHROPIC_API_KEY
  ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  : null;

export async function simpleChat(message: string): Promise<string> {
  if (!anthropic) {
    throw new Error("ANTHROPIC_API_KEY bulunamadi!");
  }

  try {
    console.log(`💬 Chat: ${message.substring(0, 50)}...`);
    
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
      console.log(`✅ Response OK`);
      return content.text;
    }

    throw new Error("Unexpected response type");
  } catch (error: any) {
    console.error("❌ Error:", error.message);
    throw new Error(`Chat failed: ${error.message}`);
  }
}
