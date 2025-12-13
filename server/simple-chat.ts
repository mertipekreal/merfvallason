/**
 * SIMPLE CHAT - With Tool Calling Support
 * Claude AI + Tool execution
 */

import Anthropic from "@anthropic-ai/sdk";
import { detectTool, executeTool } from "./tools";

const anthropic = process.env.ANTHROPIC_API_KEY
  ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  : null;

export async function simpleChat(message: string): Promise<string> {
  if (!anthropic) {
    throw new Error("ANTHROPIC_API_KEY bulunamadi!");
  }

  try {
    console.log(`💬 Chat: ${message.substring(0, 50)}...`);
    
    // Check if message contains a tool command
    const toolDetection = detectTool(message);
    
    if (toolDetection) {
      console.log(`🔧 Tool detected: ${toolDetection.toolName}`);
      const toolResult = await executeTool(toolDetection.toolName, toolDetection.params);
      
      if (toolResult.success) {
        // Let AI present the tool result
        const aiMessage = `Kullanıcı "${message}" dedi. Tool sonucu: ${JSON.stringify(toolResult.data)}. Bunu kullanıcıya Türkçe ve samimi bir şekilde sun.`;
        
        const response = await anthropic.messages.create({
          model: "claude-3-5-haiku-20241022",
          max_tokens: 1024,
          messages: [{
            role: "user",
            content: aiMessage
          }]
        });

        const content = response.content[0];
        if (content.type === "text") {
          return content.text;
        }
      } else {
        return `❌ Tool hatası: ${toolResult.error}`;
      }
    }
    
    // Regular chat (no tool)
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
