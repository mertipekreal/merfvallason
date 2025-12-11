import Anthropic from "@anthropic-ai/sdk";
import pLimit from "p-limit";
import pRetry from "p-retry";

// Using Replit's AI Integrations service for Claude access
const anthropic = new Anthropic({
  apiKey: process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_ANTHROPIC_BASE_URL,
});

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface ChatResponse {
  message: string;
  insights: string[];
  actions: any[];
  emotionalState: {
    sentiment: number;
    energy: number;
    stress: number;
    clarity: number;
  };
  confidence: number;
}

// Store conversation history per user
const conversationHistory = new Map<string, ChatMessage[]>();

// Rate limiter for concurrent requests
const limit = pLimit(2);

function isRateLimitError(error: any): boolean {
  const errorMsg = error?.message || String(error);
  return (
    errorMsg.includes("429") ||
    errorMsg.includes("RATELIMIT_EXCEEDED") ||
    errorMsg.toLowerCase().includes("quota") ||
    errorMsg.toLowerCase().includes("rate limit")
  );
}

// System prompt for MERF AI personality
const MERF_SYSTEM_PROMPT = `Sen Merf, Türkiye'nin duygusal yapay zeka asistanısın.

GÖREV VE YETENEKLERİN:
- Sosyal medya trendlerini analiz et (TikTok, Instagram, Twitter, Spotify)
- Rüya yorumlama ve bilinçaltı analizi yap
- Görsel ve içerik oluştur
- Duygusal zeka ile kullanıcıya destek ol
- Türk kültürüne uygun içgörüler sun

ARAÇLAR:
- generate_image_dalle: Görsel üretimi ("resim oluştur", "görsel yap", "@gorsel" komutlarında)
- search_dreams: Rüya arama ("rüya ara", "@ruya" komutlarında)
- analyze_track: Şarkı analizi
- get_trends: Trend analizi ("@trend")
- create_video: Video oluşturma
- create_image: Görsel oluşturma

YANIT FORMAT:
Araç kullanılacağında şu formatta action öner:
{"tool_name": "generate_image_dalle", "parameters": {"prompt": "açıklama"}}

ÖNEMLİ KURALLAR:
1. Türkçe konuş, samimi ve sıcak ol
2. Kısa ve öz yanıtlar ver (2-3 cümle)
3. Yanıtlarda AI servis adları yazma (Claude, DALL-E, Runway vb.)
4. Doğrudan sonuç ver, teknik detay verme
5. "oluştur", "yap", "üret" görsel/içerik üretimi isteği demek`;

export class ClaudeAIService {
  private model = "claude-haiku-4-5";

  constructor() {
    console.log(`🤖 Claude AI initialized with model: ${this.model}`);
  }

  async chat(userId: string, message: string): Promise<ChatResponse> {
    // Get or initialize conversation history
    let history = conversationHistory.get(userId) || [];
    
    // Limit history to last 5 messages to avoid token limits
    if (history.length > 10) {
      history = history.slice(-10);
    }
    
    // Add user message
    history.push({ role: "user", content: message });

    try {
      const response = await limit(() =>
        pRetry(
          async () => {
            const result = await anthropic.messages.create({
              model: this.model,
              max_tokens: 1024,
              system: MERF_SYSTEM_PROMPT,
              messages: history.map(msg => ({
                role: msg.role,
                content: msg.content,
              })),
            });
            return result;
          },
          {
            retries: 3,
            minTimeout: 1000,
            maxTimeout: 8000,
            factor: 2,
            onFailedAttempt: (error: any) => {
              console.log(`Claude retry attempt ${error.attemptNumber} failed`);
            },
          }
        )
      );

      const content = response.content[0];
      if (content.type !== "text") {
        throw new Error("Unexpected response type");
      }

      const assistantMessage = content.text;

      // Add assistant response to history
      history.push({ role: "assistant", content: assistantMessage });
      conversationHistory.set(userId, history);

      // Parse actions from response
      const actions = this.extractActions(assistantMessage);
      
      // Analyze emotional state
      const emotionalState = this.analyzeEmotionalState(message, assistantMessage);
      
      // Generate insights
      const insights = this.generateInsights(message, assistantMessage);

      return {
        message: assistantMessage,
        insights,
        actions,
        emotionalState,
        confidence: 0.9,
      };
    } catch (error: any) {
      console.error("Claude chat error:", error.message);
      
      // Return a fallback response
      return {
        message: "Şu an biraz yoğunum, ama yardımcı olmaya hazırım! Birazdan tekrar dener misin?",
        insights: [],
        actions: [],
        emotionalState: {
          sentiment: 0,
          energy: 0.5,
          stress: 0.3,
          clarity: 0.7,
        },
        confidence: 0.5,
      };
    }
  }

  private extractActions(response: string): any[] {
    const actions: any[] = [];
    
    // Look for JSON tool calls in code blocks or inline
    const codeBlockPattern = /```json\s*(\{[^`]+\})\s*```/g;
    const inlinePattern = /\{[^{}]*"tool_name"\s*:\s*"[^"]+"\s*,\s*"parameters"\s*:\s*\{[^{}]+\}\s*\}/g;
    
    // First try code blocks
    let match;
    while ((match = codeBlockPattern.exec(response)) !== null) {
      try {
        const action = JSON.parse(match[1]);
        if (action.tool_name) {
          actions.push(action);
        }
      } catch (e) {
        // Not valid JSON, skip
      }
    }
    
    // Then try inline JSON if no code blocks found
    if (actions.length === 0) {
      const inlineMatches = response.match(inlinePattern);
      if (inlineMatches) {
        for (const jsonStr of inlineMatches) {
          try {
            const action = JSON.parse(jsonStr);
            if (action.tool_name) {
              actions.push(action);
            }
          } catch (e) {
            // Not valid JSON, skip
          }
        }
      }
    }

    return actions;
  }

  private analyzeEmotionalState(userMessage: string, response: string): {
    sentiment: number;
    energy: number;
    stress: number;
    clarity: number;
  } {
    const lowerMsg = userMessage.toLowerCase();
    
    // Simple emotional analysis
    let sentiment = 0;
    let energy = 0.5;
    let stress = 0.2;
    let clarity = 0.8;

    // Positive indicators
    if (lowerMsg.includes("teşekkür") || lowerMsg.includes("güzel") || lowerMsg.includes("harika")) {
      sentiment = 0.7;
      energy = 0.7;
    }

    // Negative indicators
    if (lowerMsg.includes("kötü") || lowerMsg.includes("üzgün") || lowerMsg.includes("sinir")) {
      sentiment = -0.5;
      stress = 0.6;
    }

    // Question indicators
    if (lowerMsg.includes("?") || lowerMsg.includes("nasıl") || lowerMsg.includes("ne")) {
      clarity = 0.7;
    }

    return { sentiment, energy, stress, clarity };
  }

  private generateInsights(userMessage: string, response: string): string[] {
    const insights: string[] = [];
    const lowerMsg = userMessage.toLowerCase();

    if (lowerMsg.includes("rüya")) {
      insights.push("Rüya analizi için veritabanımızda 3,491+ rüya kaydı mevcut");
    }

    if (lowerMsg.includes("trend") || lowerMsg.includes("tiktok")) {
      insights.push("Güncel trend verileri analiz edilebilir");
    }

    if (lowerMsg.includes("spotify") || lowerMsg.includes("müzik")) {
      insights.push("Spotify analizi ile şarkı önerileri alabilirsiniz");
    }

    if (lowerMsg.includes("resim") || lowerMsg.includes("görsel")) {
      insights.push("Yüksek kaliteli görseller oluşturabilirsiniz");
    }

    return insights;
  }

  clearHistory(userId: string): void {
    conversationHistory.delete(userId);
    console.log(`Cleared Claude history for user: ${userId}`);
  }

  getHistory(userId: string): ChatMessage[] {
    return conversationHistory.get(userId) || [];
  }
}

// Export singleton instance
export const claudeAI = new ClaudeAIService();
