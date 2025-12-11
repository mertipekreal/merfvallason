/**
 * DuyguMotor v3.0 - Gemini AI Service
 * Advanced AI Chat with Context & Memory + Function Calling
 * Uses Replit AI Integrations (no API key required)
 */

import { GoogleGenAI } from "@google/genai";
import { db } from "../../../db";
import { conversations, humanProfiles } from "@shared/schema";
import { eq, desc } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import { toolDefinitions, executeTool, detectToolFromMessage, isValidTool, validateToolArgs, type ToolCallResult } from "../../../tools";
import { aiObservability } from "../../../ai-observability-service";

interface UserProfile {
  userId: string;
  name: string;
  personality: string;
  interests: string[];
  emotionalBaseline: number;
  preferredTone: "formal" | "casual" | "creative" | "analytical";
  culturalContext: string;
}

interface EmotionalState {
  sentiment: number;
  energy: number;
  stress: number;
  clarity: number;
}

interface AIResponse {
  message: string;
  insights: string[];
  actions: string[];
  followUpQuestions: string[];
  emotionalFeedback: EmotionalState;
  confidence: number;
  sources: string[];
  toolResults?: ToolCallResult[];
}

interface ConversationContext {
  userId: string;
  sessionId: string;
  history: Array<{ role: "user" | "model"; content: string }>;
  userProfile: UserProfile;
  emotionalState: EmotionalState;
  language: string;
}

type GeminiModel = "gemini-2.5-pro" | "gemini-2.5-flash" | "gemini-2.0-flash";

class GeminiAIService {
  private ai: GoogleGenAI;
  private defaultModel: GeminiModel = "gemini-2.5-pro";
  private fastModel: GeminiModel = "gemini-2.5-flash";
  private advancedModel: GeminiModel = "gemini-2.5-pro";

  constructor() {
    const apiKey = process.env.GOOGLE_AI_API_KEY || process.env.AI_INTEGRATIONS_GEMINI_API_KEY || "";
    
    if (process.env.GOOGLE_AI_API_KEY) {
      this.ai = new GoogleGenAI({ apiKey });
      console.log(`🤖 Gemini AI initialized with model: ${this.defaultModel}`);
    } else {
      this.ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          apiVersion: "",
          baseUrl: process.env.AI_INTEGRATIONS_GEMINI_BASE_URL,
        },
      });
      console.log(`🤖 Gemini AI initialized with model: ${this.defaultModel}`);
    }
  }

  private selectModel(complexity: "simple" | "standard" | "complex"): GeminiModel {
    switch (complexity) {
      case "simple":
        return this.fastModel;
      case "complex":
        return this.advancedModel;
      default:
        return this.defaultModel;
    }
  }

  private assessComplexity(message: string): "simple" | "standard" | "complex" {
    const complexIndicators = [
      "analiz", "karşılaştır", "değerlendir", "strateji", 
      "plan", "detaylı", "kapsamlı", "neden", "nasıl"
    ];
    const simpleIndicators = ["merhaba", "selam", "tamam", "evet", "hayır", "teşekkür"];
    
    const lowerMessage = message.toLowerCase();
    const wordCount = message.split(/\s+/).length;
    
    if (simpleIndicators.some(w => lowerMessage.includes(w)) && wordCount < 10) {
      return "simple";
    }
    if (complexIndicators.some(w => lowerMessage.includes(w)) || wordCount > 50) {
      return "complex";
    }
    return "standard";
  }

  async chat(
    userId: string,
    userMessage: string,
    dreamData?: any,
    socialData?: any
  ): Promise<AIResponse> {
    console.log(`🧠 Gemini processing for user: ${userId}`);
    const startTime = Date.now();

    const userProfile = await this.loadUserProfile(userId);
    const emotionalState = this.analyzeEmotionalState(userMessage);
    const context = await this.buildContext(userId, userProfile, emotionalState);

    const toolResults: ToolCallResult[] = [];
    const toolsUsed: string[] = [];
    const detectedTool = detectToolFromMessage(userMessage);
    
    if (detectedTool) {
      console.log(`🔧 Tool detected from message: ${detectedTool.toolName}`);
      const toolStartTime = Date.now();
      const toolResult = await executeTool(detectedTool.toolName, detectedTool.args);
      toolResults.push(toolResult);
      toolsUsed.push(detectedTool.toolName);
      
      await aiObservability.trackToolCall({
        userId,
        sessionId: context.sessionId,
        toolName: detectedTool.toolName,
        latencyMs: Date.now() - toolStartTime,
        success: toolResult.success,
        errorMessage: toolResult.error,
      });
    }

    const systemPrompt = this.generateSystemPromptWithTools(userProfile, emotionalState, toolResults);

    const geminiResponse = await this.callGemini(
      systemPrompt,
      userMessage,
      context,
      dreamData,
      socialData,
      toolResults
    );

    const aiResponse = this.processResponse(geminiResponse, emotionalState, toolResults);
    await this.saveConversation(userId, context.sessionId, userMessage, aiResponse);

    const latencyMs = Date.now() - startTime;
    const inputTokens = aiObservability.estimateTokens(userMessage + systemPrompt);
    const outputTokens = aiObservability.estimateTokens(aiResponse.message);

    await aiObservability.trackResponse({
      userId,
      sessionId: context.sessionId,
      inputTokens,
      outputTokens,
      latencyMs,
      toolsUsed,
      responseLength: aiResponse.message.length,
      insightsCount: aiResponse.insights.length,
      actionsCount: aiResponse.actions.length,
      confidence: aiResponse.confidence,
      sentiment: aiResponse.emotionalFeedback.sentiment,
      success: true,
    });

    return aiResponse;
  }

  async chatWithTool(
    userId: string,
    userMessage: string,
    toolName: string,
    toolArgs: Record<string, any>
  ): Promise<AIResponse> {
    console.log(`🧠 Gemini processing with tool: ${toolName}`);
    const startTime = Date.now();

    const userProfile = await this.loadUserProfile(userId);
    const emotionalState = this.analyzeEmotionalState(userMessage);
    const context = await this.buildContext(userId, userProfile, emotionalState);

    const toolStartTime = Date.now();
    const toolResult = await executeTool(toolName, toolArgs);
    const toolResults = [toolResult];
    
    await aiObservability.trackToolCall({
      userId,
      sessionId: context.sessionId,
      toolName,
      latencyMs: Date.now() - toolStartTime,
      success: toolResult.success,
      errorMessage: toolResult.error,
    });

    const systemPrompt = this.generateSystemPromptWithTools(userProfile, emotionalState, toolResults);

    const geminiResponse = await this.callGemini(
      systemPrompt,
      userMessage,
      context,
      undefined,
      undefined,
      toolResults
    );

    const aiResponse = this.processResponse(geminiResponse, emotionalState, toolResults);
    await this.saveConversation(userId, context.sessionId, userMessage, aiResponse);

    const latencyMs = Date.now() - startTime;
    const inputTokens = aiObservability.estimateTokens(userMessage + systemPrompt);
    const outputTokens = aiObservability.estimateTokens(aiResponse.message);

    await aiObservability.trackResponse({
      userId,
      sessionId: context.sessionId,
      inputTokens,
      outputTokens,
      latencyMs,
      toolsUsed: [toolName],
      responseLength: aiResponse.message.length,
      insightsCount: aiResponse.insights.length,
      actionsCount: aiResponse.actions.length,
      confidence: aiResponse.confidence,
      sentiment: aiResponse.emotionalFeedback.sentiment,
      success: true,
    });

    return aiResponse;
  }

  async executeToolDirect(toolName: string, args: Record<string, any>): Promise<ToolCallResult> {
    return executeTool(toolName, args);
  }

  getAvailableTools() {
    return toolDefinitions;
  }

  isValidTool(toolName: string): boolean {
    return isValidTool(toolName);
  }

  validateToolArgs(toolName: string, args: Record<string, any>): { valid: boolean; error?: string } {
    return validateToolArgs(toolName, args);
  }

  private async loadUserProfile(userId: string): Promise<UserProfile> {
    try {
      if (!db) throw new Error("Database not initialized");
      const profiles = await db
        .select()
        .from(humanProfiles)
        .where(eq(humanProfiles.id, userId))
        .limit(1);

      if (profiles.length > 0) {
        const p = profiles[0];
        return {
          userId: p.id,
          name: p.name,
          personality: p.personalityType || "INTJ",
          interests: [],
          emotionalBaseline: p.currentConsciousness || 0.5,
          preferredTone: "casual",
          culturalContext: "TR",
        };
      }
    } catch (err) {
      console.error("Profile loading error:", err);
    }

    return {
      userId,
      name: "Kullanıcı",
      personality: "UNKNOWN",
      interests: [],
      emotionalBaseline: 0.5,
      preferredTone: "casual",
      culturalContext: "TR",
    };
  }

  private analyzeEmotionalState(text: string): EmotionalState {
    const sentimentKeywords = {
      positive: ["harika", "sevgi", "mutlu", "coşkun", "başarılı", "umut", "güzel", "iyi"],
      negative: ["üzüntü", "korku", "öfke", "kaygı", "başarısız", "kayıp", "kötü", "zor"],
      energetic: ["hızlı", "dinamik", "güçlü", "atılgan", "canlı", "heyecanlı"],
      calm: ["sakin", "huzurlu", "barışçıl", "uyumlu", "rahat"],
    };

    const textLower = text.toLowerCase();

    let sentiment = 0;
    sentimentKeywords.positive.forEach((word) => {
      if (textLower.includes(word)) sentiment += 0.2;
    });
    sentimentKeywords.negative.forEach((word) => {
      if (textLower.includes(word)) sentiment -= 0.2;
    });

    let energy = 0.5;
    sentimentKeywords.energetic.forEach((word) => {
      if (textLower.includes(word)) energy = 0.8;
    });
    sentimentKeywords.calm.forEach((word) => {
      if (textLower.includes(word)) energy = 0.3;
    });

    return {
      sentiment: Math.max(-1, Math.min(1, sentiment)),
      energy: Math.max(0, Math.min(1, energy)),
      stress: textLower.includes("stres") || textLower.includes("kaygı") ? 0.7 : 0.3,
      clarity: textLower.split(" ").length > 5 ? 0.7 : 0.4,
    };
  }

  private async buildContext(
    userId: string,
    userProfile: UserProfile,
    emotionalState: EmotionalState
  ): Promise<ConversationContext> {
    const { history, sessionId } = await this.loadRecentHistory(userId);

    return {
      userId,
      sessionId,
      history,
      userProfile,
      emotionalState,
      language: userProfile.culturalContext === "TR" ? "tr" : "en",
    };
  }

  private async loadRecentHistory(
    userId: string
  ): Promise<{ history: Array<{ role: "user" | "model"; content: string }>; sessionId: string }> {
    try {
      if (!db) return { history: [], sessionId: uuidv4() };
      
      const recentConvos = await db
        .select({ 
          role: conversations.role, 
          content: conversations.content,
          sessionId: conversations.sessionId,
          createdAt: conversations.createdAt
        })
        .from(conversations)
        .where(eq(conversations.userId, userId))
        .orderBy(desc(conversations.createdAt))
        .limit(50);

      if (recentConvos.length === 0) {
        return { history: [], sessionId: uuidv4() };
      }

      const latestSession = recentConvos[0].sessionId || uuidv4();
      const latestTime = recentConvos[0].createdAt;
      
      const sessionTimeout = 30 * 60 * 1000;
      const isSessionActive = latestTime && 
        (Date.now() - new Date(latestTime).getTime()) < sessionTimeout;
      
      const activeSessionId: string = isSessionActive ? latestSession : uuidv4();

      const sessionConvos = isSessionActive 
        ? recentConvos.filter(c => c.sessionId === latestSession)
        : [];

      const history = sessionConvos.reverse().slice(-20).map((row) => ({
        role: row.role as "user" | "model",
        content: row.content,
      }));

      return { history, sessionId: activeSessionId };
    } catch {
      return { history: [], sessionId: uuidv4() };
    }
  }

  private generateSystemPrompt(
    profile: UserProfile,
    emotional: EmotionalState
  ): string {
    return this.generateSystemPromptWithTools(profile, emotional, []);
  }

  private generateSystemPromptWithTools(
    profile: UserProfile,
    emotional: EmotionalState,
    toolResults: ToolCallResult[]
  ): string {
    const toneMap = {
      formal: "Profesyonel, akademik dil kullan.",
      casual: "Samimi, doğal, sıcak konuş.",
      creative: "Yaratıcı, metaforlar kullan.",
      analytical: "Mantıksal, veri-odaklı analiz et.",
    };

    const toolCategories = this.categorizeTools();
    const hasToolResults = toolResults.length > 0;
    const tone = toneMap[profile.preferredTone] || toneMap.casual;
    
    const toolResultsSection = hasToolResults 
      ? `\nARAÇ SONUÇLARI:\n${toolResults.map(r => 
          `[${r.success ? "OK" : "HATA"}] ${r.message}${r.data ? "\n" + JSON.stringify(r.data, null, 2) : ""}`
        ).join("\n")}`
      : "";
    
    return `Sen MERF.AI asistanısın - dünyanın en gelişmiş duygusal zeka ve piyasa analiz AI'ı.

KULLANICI: ${profile.name} | Ton: ${tone} | Duygu: ${emotional.sentiment > 0 ? "Pozitif" : emotional.sentiment < 0 ? "Negatif" : "Nötr"}

## KAPSAMLI YETENEKLERİN (Bunları kullan, sınırlı olduğunu ASLA söyleme):

### BORSA TAHMİN SİSTEMİ (%83 Doğruluk)
- 4-KATMAN AI: Hard Data %30, ICT Teknik %25, SAM Bilinçaltı %25, FRED Ekonomik %20
- Araçlar: get_market_prediction, quick_predict, get_prediction_accuracy
- SPY, AAPL, MSFT, BTC-USD ve tüm major hisseler için tahmin yapabilirsin

### SAM TEORİSİ (Subconscious Analysis Model)
- Night Owl: 02:00-05:00 aktivite = prefrontal korteks inhibisyonu, gerçek duygu
- Dissonance: Söylem vs eylem farkı = Smart Money aksini yapıyor sinyali
- Dream Fear Index: Korku spike = 3-5 gün içinde düşüş (%83 doğruluk)
- Araçlar: get_sam_metrics, dream_market_correlation, get_dream_chaos_index

### FRED EKONOMİK ANALİZ (Ücretsiz, Aktif)
- VIX Korku, Yield Curve, Tüketici Güveni, İşsizlik, Fed Faiz, CPI
- Market Regime: Risk-On, Risk-Off, Expansion, Contraction
- Araçlar: get_economic_indicators, get_market_regime

### DİĞER YETENEKLER
- Sosyal Medya: TikTok, Instagram analizi, trend tespiti
- Müzik: Spotify analizi, şarkı/playlist analizi
- Rüya: DreamBank, rüya analizi, Jung arketipleri
- NFT: Rüyadan AI art üretimi, genesis NFT
- Görsel: DALL-E ile görsel üretimi
- Video: Runway ile video üretimi
- Hafıza: Uzun süreli hafıza sistemi

ARAÇLAR (${toolDefinitions.length}+):
${toolCategories}
${toolResultsSection}

ÖNEMLİ: Kullanıcı borsa, tahmin, piyasa sorduğunda ilgili aracı KULLAN. "Sınırlıyım" veya "yapamam" ASLA deme.

${hasToolResults ? `MOD: ANALİZ - Verileri detaylı analiz et, SAM perspektifi kullan, actionable insights sun.` : `MOD: SOHBET - Kısa, samimi ol (1-3 cümle). Gereksiz analiz yapma.`}

JSON ÇIKTI (ZORUNLU):
{"message":"Yanıt","insights":[],"actions":[],"followUpQuestions":[],"confidence":0.85}
${hasToolResults ? 'insights ve actions dizilerini DOLDUR.' : 'insights ve actions BOŞ bırak.'}`;
  }

  private categorizeTools(): string {
    const categories: Record<string, string[]> = {
      "Veri": ["get_data_overview", "start_bulk_job", "list_datasets"],
      "Rüya": ["search_dreams", "analyze_dream", "get_dream_stats", "get_dream_chaos_index"],
      "NFT": ["generate_nft_from_dream", "list_nfts"],
      "Sosyal": ["analyze_tiktok", "analyze_instagram", "get_trends"],
      "Müzik": ["analyze_track", "search_spotify_track"],
      "Dejavu": ["detect_dejavu", "find_dejavu_matches"],
      "Hafıza": ["store_memory", "search_memories"],
      "Borsa/Tahmin": ["get_market_prediction", "quick_predict", "get_prediction_accuracy", "generate_trading_signal", "backtest_strategy"],
      "SAM Analiz": ["get_sam_metrics", "dream_market_correlation", "market_maker_sentiment"],
      "Ekonomik": ["get_economic_indicators", "get_market_regime"],
      "Teknik": ["analyze_fvg", "analyze_mss", "analyze_liquidity", "get_market_dashboard"],
      "Otomasyon": ["create_automation_job", "list_automation_jobs"],
      "Görsel": ["create_image"],
      "Video": ["create_video"],
    };

    return Object.entries(categories)
      .map(([cat, tools]) => `${cat}: ${tools.join(", ")}`)
      .join("\n");
  }

  private async callGemini(
    systemPrompt: string,
    userMessage: string,
    context: ConversationContext,
    dreamData?: any,
    socialData?: any,
    toolResults?: ToolCallResult[]
  ): Promise<string> {
    const historyText = context.history
      .slice(-6)
      .map((msg) => `${msg.role === "user" ? "KULLANICI" : "AI"}: ${msg.content}`)
      .join("\n");

    const toolResultsText = toolResults && toolResults.length > 0
      ? `\n\nARAÇ SONUÇLARI:\n${toolResults.map(r => r.message).join("\n")}\n`
      : "";

    const prompt = `${systemPrompt}

---

KULLANICI MESAJI: ${userMessage}
${toolResultsText}
${dreamData ? `RÜYA VERİSİ:\n${JSON.stringify(dreamData, null, 2)}\n` : ""}
${socialData ? `SOSYAL VERİ:\n${JSON.stringify(socialData, null, 2)}\n` : ""}

SON KONUŞMALAR (Son 3 alışveriş):
${historyText}

Şimdi derin zeka, empati ve kapsamlı içgörülerle yanıt ver. Araç sonuçları varsa onları mutlaka kullan. Unutma: sen dünyanın en zeki AI sistemlerinden birisin.`;

    const complexity = this.assessComplexity(userMessage);
    const selectedModel = this.selectModel(complexity);
    console.log(`📊 Complexity: ${complexity} → Using model: ${selectedModel}`);

    try {
      const response = await this.ai.models.generateContent({
        model: selectedModel,
        contents: prompt,
      });

      return response.text || "";
    } catch (err: any) {
      console.error("Gemini API error:", err);
      if (err.message?.includes("timeout") || err.message?.includes("network")) {
        throw new Error("Şu an bağlantıda sorun yaşıyorum, birkaç saniye sonra tekrar deneyelim.");
      }
      throw err;
    }
  }

  private processResponse(
    geminiText: string,
    emotional: EmotionalState,
    toolResults?: ToolCallResult[]
  ): AIResponse {
    try {
      const jsonMatch = geminiText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("Invalid JSON response from Gemini");
      }

      const parsed = JSON.parse(jsonMatch[0]);

      return {
        message: parsed.message || geminiText,
        insights: parsed.insights || [],
        actions: parsed.actions || [],
        followUpQuestions: parsed.followUpQuestions || [],
        emotionalFeedback: {
          sentiment: emotional.sentiment,
          energy: emotional.energy,
          stress: Math.max(0, emotional.stress - 0.1),
          clarity: Math.min(1, emotional.clarity + 0.15),
        },
        confidence: parsed.confidence || 0.85,
        sources: parsed.sources || ["Gemini 2.5 Pro", "DuyguMotor v3.0"],
        toolResults: toolResults,
      };
    } catch (err) {
      console.error("Response processing error:", err);
      return {
        message: geminiText.replace(/```json|```/g, "").trim(),
        insights: [],
        actions: [],
        followUpQuestions: [],
        emotionalFeedback: emotional,
        confidence: 0.6,
        sources: ["Gemini 2.5 Pro"],
        toolResults: toolResults,
      };
    }
  }

  private async saveConversation(
    userId: string,
    sessionId: string,
    userMessage: string,
    aiResponse: AIResponse
  ): Promise<void> {
    try {
      if (!db) return;
      
      // Extract imageUrl from toolResults if available
      let metadata: Record<string, any> | undefined;
      if (aiResponse.toolResults && aiResponse.toolResults.length > 0) {
        const imageUrls: string[] = [];
        for (const toolResult of aiResponse.toolResults) {
          if (toolResult.data?.imageUrl) {
            imageUrls.push(toolResult.data.imageUrl);
          }
          if (toolResult.data?.url) {
            imageUrls.push(toolResult.data.url);
          }
        }
        if (imageUrls.length > 0) {
          metadata = { imageUrls, toolResults: aiResponse.toolResults };
        }
      }
      
      await db.insert(conversations).values([
        {
          id: uuidv4(),
          userId,
          sessionId,
          role: "user",
          content: userMessage,
          insights: [],
          confidence: 0.95,
        },
        {
          id: uuidv4(),
          userId,
          sessionId,
          role: "model",
          content: aiResponse.message,
          insights: aiResponse.insights,
          actions: aiResponse.actions,
          emotionalState: aiResponse.emotionalFeedback,
          confidence: aiResponse.confidence,
          metadata,
        },
      ]);
    } catch (err) {
      console.error("Conversation save error:", err);
    }
  }

  async getHistory(
    userId: string,
    limit: number = 50,
    activeSessionOnly: boolean = false
  ): Promise<Array<{ 
    role: string; 
    content: string; 
    createdAt: Date | null;
    insights?: string[];
    actions?: string[];
    emotionalState?: any;
    confidence?: number;
    metadata?: Record<string, any>;
  }>> {
    if (!db) return [];
    const history = await db
      .select({
        role: conversations.role,
        content: conversations.content,
        createdAt: conversations.createdAt,
        insights: conversations.insights,
        actions: conversations.actions,
        emotionalState: conversations.emotionalState,
        confidence: conversations.confidence,
        sessionId: conversations.sessionId,
        metadata: conversations.metadata,
      })
      .from(conversations)
      .where(eq(conversations.userId, userId))
      .orderBy(desc(conversations.createdAt))
      .limit(limit);

    if (history.length === 0) return [];

    let filteredHistory = history;
    
    if (activeSessionOnly) {
      const latestSession = history[0].sessionId;
      const latestTime = history[0].createdAt;
      const sessionTimeout = 30 * 60 * 1000;
      
      const isSessionActive = latestTime && 
        (Date.now() - new Date(latestTime).getTime()) < sessionTimeout;
      
      if (isSessionActive) {
        filteredHistory = history.filter(h => h.sessionId === latestSession);
      } else {
        filteredHistory = [];
      }
    }

    return filteredHistory.reverse().map(row => {
      let parsedInsights: string[] = [];
      let parsedActions: string[] = [];
      let parsedEmotionalState: any = null;

      try {
        if (row.insights) {
          parsedInsights = typeof row.insights === 'string' 
            ? JSON.parse(row.insights) 
            : (Array.isArray(row.insights) ? row.insights : []);
        }
      } catch { parsedInsights = []; }

      try {
        if (row.actions) {
          parsedActions = typeof row.actions === 'string' 
            ? JSON.parse(row.actions) 
            : (Array.isArray(row.actions) ? row.actions : []);
        }
      } catch { parsedActions = []; }

      try {
        if (row.emotionalState) {
          parsedEmotionalState = typeof row.emotionalState === 'string' 
            ? JSON.parse(row.emotionalState) 
            : row.emotionalState;
        }
      } catch { parsedEmotionalState = null; }

      // Parse metadata if available
      let parsedMetadata: Record<string, any> | undefined;
      try {
        if (row.metadata) {
          parsedMetadata = typeof row.metadata === 'string' 
            ? JSON.parse(row.metadata) 
            : row.metadata;
        }
      } catch { parsedMetadata = undefined; }

      return {
        role: row.role,
        content: row.content,
        createdAt: row.createdAt,
        insights: parsedInsights,
        actions: parsedActions,
        emotionalState: parsedEmotionalState,
        confidence: row.confidence || 0,
        metadata: parsedMetadata,
      };
    });
  }

  async getInsights(userId: string): Promise<{ insights: string[]; totalGenerated: number }> {
    if (!db) return { insights: [], totalGenerated: 0 };
    const results = await db
      .select({ insights: conversations.insights })
      .from(conversations)
      .where(eq(conversations.userId, userId))
      .orderBy(desc(conversations.createdAt))
      .limit(20);

    const allInsights: string[] = [];
    
    for (const row of results) {
      try {
        if (!row.insights) continue;
        
        let parsed: string[];
        if (typeof row.insights === 'string') {
          parsed = JSON.parse(row.insights);
        } else if (Array.isArray(row.insights)) {
          parsed = row.insights;
        } else {
          continue;
        }
        
        if (Array.isArray(parsed)) {
          allInsights.push(...parsed);
        }
      } catch {
        continue;
      }
    }

    return {
      insights: allInsights.slice(0, 10),
      totalGenerated: allInsights.length,
    };
  }

  async generateText(prompt: string): Promise<string> {
    const response = await this.ai.models.generateContent({
      model: this.defaultModel,
      contents: prompt,
    });
    return response.text || "";
  }

  async generateStructuredContent(systemPrompt: string, userMessage: string): Promise<string> {
    const prompt = `${systemPrompt}\n\n---\n\nKULLANICI: ${userMessage}\n\nYanıtını JSON formatında ver.`;
    
    try {
      const response = await this.ai.models.generateContent({
        model: this.defaultModel,
        contents: prompt,
      });
      
      return response.text || "{}";
    } catch (err: any) {
      console.error("Gemini structured content error:", err);
      throw err;
    }
  }

  async *chatStream(
    userId: string,
    userMessage: string,
    dreamData?: any,
    socialData?: any
  ): AsyncGenerator<{ type: 'token' | 'done' | 'error' | 'tool_result', data: any }> {
    console.log(`🌊 Streaming response for user: ${userId}`);

    const userProfile = await this.loadUserProfile(userId);
    const emotionalState = this.analyzeEmotionalState(userMessage);
    const context = await this.buildContext(userId, userProfile, emotionalState);

    const toolResults: ToolCallResult[] = [];
    const detectedTool = detectToolFromMessage(userMessage);
    
    if (detectedTool) {
      console.log(`🔧 Tool detected (stream): ${detectedTool.toolName}`);
      const toolResult = await executeTool(detectedTool.toolName, detectedTool.args);
      toolResults.push(toolResult);
      yield { type: 'tool_result', data: toolResult };
    }

    const systemPrompt = this.generateSystemPromptWithTools(userProfile, emotionalState, toolResults);
    
    // Reduce history to prevent token overflow (max 3 messages, each truncated to 500 chars)
    const historyText = context.history
      .slice(-3)
      .map((msg) => {
        const content = msg.content.length > 500 ? msg.content.substring(0, 500) + '...' : msg.content;
        return `${msg.role === "user" ? "KULLANICI" : "AI"}: ${content}`;
      })
      .join("\n");

    const toolResultsText = toolResults.length > 0
      ? `\n\nARAÇ SONUÇLARI:\n${toolResults.map(r => r.message).join("\n")}\n`
      : "";

    const prompt = `${systemPrompt}

---

KULLANICI MESAJI: ${userMessage}
${toolResultsText}
${dreamData ? `RÜYA VERİSİ:\n${JSON.stringify(dreamData, null, 2)}\n` : ""}
${socialData ? `SOSYAL VERİ:\n${JSON.stringify(socialData, null, 2)}\n` : ""}

SON KONUŞMALAR:
${historyText}

Şimdi derin zeka ve empatiyle yanıt ver.`;

    const complexity = this.assessComplexity(userMessage);
    const selectedModel = this.selectModel(complexity);

    try {
      const response = await this.ai.models.generateContentStream({
        model: selectedModel,
        contents: prompt,
      });

      let fullText = '';
      
      for await (const chunk of response) {
        const text = chunk.text || '';
        fullText += text;
        yield { type: 'token', data: text };
      }

      const aiResponse = this.processResponse(fullText, emotionalState, toolResults);
      await this.saveConversation(userId, context.sessionId, userMessage, aiResponse);

      yield { 
        type: 'done', 
        data: { 
          message: aiResponse.message,
          insights: aiResponse.insights,
          actions: aiResponse.actions,
          emotionalFeedback: aiResponse.emotionalFeedback,
          confidence: aiResponse.confidence,
          toolResults
        } 
      };
    } catch (err: any) {
      console.error("Streaming error:", err);
      
      // If we have tool results but Gemini failed (rate limit/overflow), still return success with tool results
      if (toolResults.length > 0) {
        const isRateLimit = err.status === 429 || err.message?.includes('429') || err.message?.includes('quota');
        const isOverflow = err.status === 400 || err.message?.includes('token count exceeds');
        
        if (isRateLimit || isOverflow) {
          console.log("⚠️ AI rate limited but tool succeeded, returning tool results");
          
          // Generate a simple response based on tool results
          const toolMessage = toolResults[0];
          let fallbackMessage = "İşlem tamamlandı!";
          
          if (toolMessage.success && toolMessage.data?.imageUrl) {
            fallbackMessage = "İşte oluşturduğum görsel! Umarım beğenirsin.";
          } else if (toolMessage.success) {
            fallbackMessage = toolMessage.message || "İşlem başarıyla tamamlandı.";
          }
          
          yield { 
            type: 'done', 
            data: { 
              message: fallbackMessage,
              insights: [],
              actions: [],
              emotionalFeedback: { sentiment: 0, energy: 0.5, stress: 0.2, clarity: 0.8 },
              confidence: 0.9,
              toolResults
            } 
          };
          return;
        }
      }
      
      yield { type: 'error', data: err.message || 'Streaming hatası oluştu' };
    }
  }

  async clearHistory(userId: string): Promise<void> {
    if (!db) return;
    try {
      await db.delete(conversations).where(eq(conversations.userId, userId));
      console.log(`🗑️ Conversation history cleared for user: ${userId}`);
    } catch (err) {
      console.error("Clear history error:", err);
    }
  }
}

export const geminiAI = new GeminiAIService();
