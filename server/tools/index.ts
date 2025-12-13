/**
 * Tool Calling System
 * AI can call these tools via commands like @gorsel, @ruya, @trend
 */

import { generateImage } from "./image-generator";
import { searchDreams } from "./dream-search";
import { analyzeTrends } from "./trend-analyzer";
import { analyzeSpotify } from "./spotify-analyzer";

export interface ToolDefinition {
  name: string;
  description: string;
  trigger: string[];
  parameters: {
    name: string;
    type: string;
    description: string;
    required: boolean;
  }[];
}

export interface ToolResult {
  success: boolean;
  data?: any;
  error?: string;
  toolName: string;
}

export interface ToolCallResult extends ToolResult {}

// Tool definitions
export const tools: Record<string, ToolDefinition> = {
  image_generator: {
    name: "generate_image",
    description: "Görsel oluştur (DALL-E 3)",
    trigger: ["@gorsel", "@image", "resim oluştur", "görsel yap"],
    parameters: [
      {
        name: "prompt",
        type: "string",
        description: "Görsel açıklaması",
        required: true
      }
    ]
  },
  
  dream_search: {
    name: "search_dreams",
    description: "Rüya veritabanında ara",
    trigger: ["@ruya", "@dream", "rüya ara"],
    parameters: [
      {
        name: "query",
        type: "string",
        description: "Rüya arama terimi",
        required: true
      }
    ]
  },
  
  trend_analysis: {
    name: "analyze_trends",
    description: "TikTok/Instagram trendlerini analiz et",
    trigger: ["@trend", "@tiktok", "trend nedir"],
    parameters: [
      {
        name: "platform",
        type: "string",
        description: "Platform (tiktok, instagram)",
        required: false
      }
    ]
  },
  
  spotify_analysis: {
    name: "analyze_spotify",
    description: "Spotify şarkı/sanatçı analizi",
    trigger: ["@spotify", "spotify", "şarkı analizi"],
    parameters: [
      {
        name: "query",
        type: "string",
        description: "Şarkı veya sanatçı adı",
        required: true
      }
    ]
  }
};

// Export tool definitions for Gemini
export const toolDefinitions = tools;

// Detect tool from message
export function detectTool(message: string): { toolName: string; params: any } | null {
  const lowerMessage = message.toLowerCase().trim();
  
  for (const [key, tool] of Object.entries(tools)) {
    for (const trigger of tool.trigger) {
      const triggerLower = trigger.toLowerCase();
      
      // Check if message starts with trigger
      if (lowerMessage.startsWith(triggerLower)) {
        // Extract query after trigger
        const query = message.substring(trigger.length).trim();
        
        // Use query or provide defaults based on tool
        const effectiveQuery = query || getDefaultQuery(tool.name);
        
        return {
          toolName: tool.name,
          params: { 
            prompt: effectiveQuery, 
            query: effectiveQuery, 
            platform: 'tiktok' 
          }
        };
      }
    }
  }
  
  return null;
}

// Helper function to provide default queries
function getDefaultQuery(toolName: string): string {
  switch (toolName) {
    case 'search_dreams':
      return 'son rüyalar'; // Default dream search
    case 'generate_image':
      return 'güzel bir manzara'; // Default image prompt
    case 'analyze_spotify':
      return 'popüler şarkılar'; // Default spotify query
    case 'analyze_trends':
      return 'viral içerikler'; // Default trend query
    default:
      return 'genel';
  }
}

// Alias for compatibility
export const detectToolFromMessage = detectTool;

// Validate tool
export function isValidTool(toolName: string): boolean {
  return Object.values(tools).some(tool => tool.name === toolName);
}

// Validate tool arguments
export function validateToolArgs(toolName: string, args: any): { valid: boolean; error?: string } {
  const tool = Object.values(tools).find(t => t.name === toolName);
  
  if (!tool) {
    return { valid: false, error: `Unknown tool: ${toolName}` };
  }
  
  // Check required parameters
  for (const param of tool.parameters) {
    if (param.required && !args[param.name]) {
      return { valid: false, error: `Missing required parameter: ${param.name}` };
    }
  }
  
  return { valid: true };
}

// Execute tool
export async function executeTool(toolName: string, params: any): Promise<ToolResult> {
  try {
    switch (toolName) {
      case "generate_image":
        const imageResult = await generateImage(params.prompt);
        if (imageResult.success) {
          return {
            success: true,
            data: { 
              message: "Görsel oluşturuldu!",
              imageUrl: imageResult.imageUrl,
              prompt: params.prompt
            },
            toolName
          };
        } else {
          return {
            success: false,
            error: imageResult.error,
            toolName
          };
        }
        
      case "search_dreams":
        const dreamResult = await searchDreams(params.query);
        if (dreamResult.success) {
          return {
            success: true,
            data: {
              message: `${dreamResult.count} rüya bulundu`,
              dreams: dreamResult.dreams,
              count: dreamResult.count
            },
            toolName
          };
        } else {
          return {
            success: false,
            error: dreamResult.error,
            toolName
          };
        }
        
      case "analyze_trends":
        const trendResult = await analyzeTrends(params.platform || 'tiktok');
        if (trendResult.success) {
          return {
            success: true,
            data: {
              summary: trendResult.summary,
              trends: trendResult.trends,
              count: trendResult.trends?.length || 0
            },
            toolName
          };
        } else {
          return {
            success: false,
            error: trendResult.error,
            toolName
          };
        }
        
      case "analyze_spotify":
        const spotifyResult = await analyzeSpotify(params.query || params.prompt);
        if (spotifyResult.success) {
          return {
            success: true,
            data: spotifyResult.data,
            toolName
          };
        } else {
          return {
            success: false,
            error: spotifyResult.error,
            toolName
          };
        }
        
      default:
        return {
          success: false,
          error: `Unknown tool: ${toolName}`,
          toolName
        };
    }
  } catch (error: any) {
    return {
      success: false,
      error: error.message,
      toolName
    };
  }
}
