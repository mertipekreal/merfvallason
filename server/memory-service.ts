/**
 * DuyguMotor v3.0 - Long-Term Memory Service
 * Advanced memory system with vector search and memory consolidation
 */

import { getDb } from "./db";
import { memories, conversations, type Memory, type InsertMemory, type MemoryType, type MemoryImportance } from "@shared/schema";
import { eq, desc, sql, and, or, ilike } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import { huggingfaceService } from "./huggingface-service";

interface EntityExtraction {
  people: string[];
  places: string[];
  topics: string[];
  emotions: string[];
  events: string[];
}

interface MemorySearchOptions {
  userId: string;
  query: string;
  limit?: number;
  memoryTypes?: MemoryType[];
  minImportance?: number;
  includeDecayed?: boolean;
}

interface MemorySearchResult {
  memory: Memory;
  relevanceScore: number;
  matchType: 'vector' | 'text' | 'entity' | 'hybrid';
  context: string;
}

interface MemoryConsolidationResult {
  consolidatedCount: number;
  newMemories: Memory[];
  removedDuplicates: number;
}

const log = (msg: string) => console.log(`[Memory] ${msg}`);

class MemoryService {
  private entityPatterns = {
    emotions: [
      // Turkish emotions
      'mutlu', 'üzgün', 'kızgın', 'korkmuş', 'şaşkın', 'endişeli', 'heyecanlı',
      'sakin', 'stresli', 'yorgun', 'enerjik', 'huzurlu', 'kaygılı', 'umutlu',
      'hayal kırıklığı', 'minnetar', 'gurur', 'utanç', 'suçluluk', 'özlem',
      // English emotions
      'happy', 'sad', 'angry', 'scared', 'surprised', 'anxious', 'excited',
      'calm', 'stressed', 'tired', 'energetic', 'peaceful', 'worried', 'hopeful'
    ],
    topicKeywords: [
      // Turkish topics
      'rüya', 'analiz', 'müzik', 'video', 'trend', 'sosyal medya', 'tiktok',
      'instagram', 'spotify', 'şarkı', 'playlist', 'dejavu', 'bilinçaltı',
      'kader', 'gelecek', 'geçmiş', 'anı', 'hafıza', 'duygu', 'his',
      // English topics
      'dream', 'analysis', 'music', 'video', 'trend', 'social media',
      'song', 'playlist', 'subconscious', 'fate', 'future', 'past', 'memory'
    ]
  };

  /**
   * Extract entities from text content
   */
  extractEntities(content: string): EntityExtraction {
    const lowercaseContent = content.toLowerCase();
    const words = content.split(/\s+/);

    const emotions = this.entityPatterns.emotions.filter(e => 
      lowercaseContent.includes(e.toLowerCase())
    );

    const topics = this.entityPatterns.topicKeywords.filter(t => 
      lowercaseContent.includes(t.toLowerCase())
    );

    // Extract potential names (capitalized words not at sentence start)
    const people: string[] = [];
    const places: string[] = [];
    const events: string[] = [];

    for (let i = 1; i < words.length; i++) {
      const word = words[i];
      if (word.length > 2 && /^[A-ZÇĞİÖŞÜ][a-zçğıöşü]+$/.test(word)) {
        people.push(word);
      }
    }

    return {
      people: Array.from(new Set(people)).slice(0, 10),
      places: Array.from(new Set(places)).slice(0, 10),
      topics: Array.from(new Set(topics)).slice(0, 20),
      emotions: Array.from(new Set(emotions)).slice(0, 10),
      events: Array.from(new Set(events)).slice(0, 10)
    };
  }

  /**
   * Determine memory importance based on content analysis
   */
  assessImportance(content: string, entities: EntityExtraction): { importance: MemoryImportance; score: number } {
    let score = 0.5;
    
    // Longer content is often more important
    const wordCount = content.split(/\s+/).length;
    if (wordCount > 100) score += 0.1;
    if (wordCount > 200) score += 0.1;
    
    // More entities suggest more meaningful content
    const entityCount = Object.values(entities).flat().length;
    score += Math.min(entityCount * 0.02, 0.2);
    
    // Strong emotions are memorable
    const strongEmotions = ['korkmuş', 'heyecanlı', 'şaşkın', 'scared', 'excited', 'surprised'];
    if (entities.emotions.some(e => strongEmotions.includes(e.toLowerCase()))) {
      score += 0.15;
    }
    
    // Clamp score
    score = Math.min(Math.max(score, 0), 1);
    
    let importance: MemoryImportance;
    if (score >= 0.8) importance = 'critical';
    else if (score >= 0.6) importance = 'high';
    else if (score >= 0.4) importance = 'medium';
    else importance = 'low';
    
    return { importance, score };
  }

  /**
   * Determine memory type based on content
   */
  classifyMemoryType(content: string, context?: string): MemoryType {
    const lowercaseContent = content.toLowerCase();
    
    // Emotional memory - strong feelings
    const emotionalIndicators = ['hissettim', 'duydum', 'üzüldüm', 'sevindim', 'korktum', 
                                  'felt', 'feel', 'emotion', 'feeling'];
    if (emotionalIndicators.some(i => lowercaseContent.includes(i))) {
      return 'emotional';
    }
    
    // Procedural memory - how-to knowledge
    const proceduralIndicators = ['nasıl', 'adım', 'yöntem', 'prosedür', 
                                   'how to', 'step', 'method', 'process'];
    if (proceduralIndicators.some(i => lowercaseContent.includes(i))) {
      return 'procedural';
    }
    
    // Semantic memory - facts and knowledge
    const semanticIndicators = ['bilgi', 'veri', 'istatistik', 'sonuç',
                                 'data', 'statistic', 'result', 'fact'];
    if (semanticIndicators.some(i => lowercaseContent.includes(i))) {
      return 'semantic';
    }
    
    // Default to episodic (personal experiences)
    return 'episodic';
  }

  /**
   * Create a new memory from conversation
   */
  async createMemory(
    userId: string,
    content: string,
    options?: {
      sessionId?: string;
      memoryType?: MemoryType;
      summary?: string;
      metadata?: Record<string, any>;
    }
  ): Promise<Memory> {
    log(`Creating memory for user ${userId}`);

    const entities = this.extractEntities(content);
    const { importance, score } = this.assessImportance(content, entities);
    const memoryType = options?.memoryType || this.classifyMemoryType(content);

    // Generate embedding for vector search
    let embedding: number[] | null = null;
    try {
      embedding = await huggingfaceService.generateEmbedding(content);
    } catch (err) {
      log(`Embedding generation failed: ${err}`);
    }

    const db = getDb()!;
    
    const [memory] = await db.insert(memories).values({
      id: uuidv4(),
      userId,
      sessionId: options?.sessionId || null,
      memoryType: memoryType as MemoryType,
      content,
      summary: options?.summary || this.generateSummary(content),
      embedding,
      entities,
      importance,
      importanceScore: score,
      accessCount: 0,
      decayFactor: 1.0,
      connections: {
        relatedMemories: [],
        relatedDreams: [],
        relatedConversations: []
      },
      metadata: options?.metadata || {}
    }).returning();

    log(`Memory created: ${memory.id} (type: ${memoryType}, importance: ${importance})`);
    return memory;
  }

  /**
   * Generate a brief summary of content
   */
  private generateSummary(content: string, maxLength: number = 100): string {
    // Simple extractive summary - first sentence or truncate
    const firstSentence = content.split(/[.!?]/)[0];
    if (firstSentence.length <= maxLength) {
      return firstSentence.trim();
    }
    return content.substring(0, maxLength - 3).trim() + '...';
  }

  /**
   * Search memories using hybrid approach (vector + text + entities)
   */
  async searchMemories(options: MemorySearchOptions): Promise<MemorySearchResult[]> {
    log(`Searching memories for user ${options.userId}: "${options.query}"`);

    const limit = options.limit || 10;
    const results: MemorySearchResult[] = [];

    // Get query embedding
    let queryEmbedding: number[] | null = null;
    try {
      queryEmbedding = await huggingfaceService.generateEmbedding(options.query);
    } catch (err) {
      log(`Query embedding failed: ${err}`);
    }

    // Build base conditions
    const baseConditions = [eq(memories.userId, options.userId)];
    
    if (options.memoryTypes && options.memoryTypes.length > 0) {
      baseConditions.push(
        sql`${memories.memoryType} = ANY(${options.memoryTypes})`
      );
    }
    
    if (options.minImportance) {
      baseConditions.push(
        sql`${memories.importanceScore} >= ${options.minImportance}`
      );
    }
    
    if (!options.includeDecayed) {
      baseConditions.push(
        sql`${memories.decayFactor} > 0.3`
      );
    }

    const db = getDb()!;
    
    // Text search
    const textResults = await db.select()
      .from(memories)
      .where(and(
        ...baseConditions,
        or(
          ilike(memories.content, `%${options.query}%`),
          ilike(memories.summary, `%${options.query}%`)
        )
      ))
      .orderBy(desc(memories.importanceScore))
      .limit(limit);

    for (const memory of textResults) {
      results.push({
        memory,
        relevanceScore: 0.7,
        matchType: 'text',
        context: memory.summary || memory.content.substring(0, 100)
      });
    }

    // Entity search
    const queryEntities = this.extractEntities(options.query);
    const entityKeywords = [...queryEntities.topics, ...queryEntities.emotions];
    
    if (entityKeywords.length > 0) {
      // Search for memories with matching entities
      const allMemories = await db.select()
        .from(memories)
        .where(and(...baseConditions))
        .orderBy(desc(memories.importanceScore))
        .limit(limit * 2);
      
      for (const memory of allMemories) {
        if (!results.find(r => r.memory.id === memory.id)) {
          const memoryEntities = memory.entities as EntityExtraction;
          const memoryKeywords = [
            ...(memoryEntities?.topics || []),
            ...(memoryEntities?.emotions || [])
          ];
          
          const overlap = entityKeywords.filter(k => 
            memoryKeywords.some(mk => mk.toLowerCase() === k.toLowerCase())
          );
          
          if (overlap.length > 0) {
            results.push({
              memory,
              relevanceScore: 0.5 + (overlap.length * 0.1),
              matchType: 'entity',
              context: `Matching: ${overlap.join(', ')}`
            });
          }
        }
      }
    }

    // Vector search (if embedding available)
    if (queryEmbedding) {
      const allMemories = await db.select()
        .from(memories)
        .where(and(
          ...baseConditions,
          sql`${memories.embedding} IS NOT NULL`
        ))
        .limit(limit * 3);
      
      for (const memory of allMemories) {
        if (!results.find(r => r.memory.id === memory.id) && memory.embedding) {
          const similarity = this.cosineSimilarity(queryEmbedding, memory.embedding);
          if (similarity > 0.5) {
            results.push({
              memory,
              relevanceScore: similarity,
              matchType: 'vector',
              context: memory.summary || memory.content.substring(0, 100)
            });
          }
        }
      }
    }

    // Update access count for retrieved memories
    for (const result of results) {
      await db.update(memories)
        .set({ 
          accessCount: sql`${memories.accessCount} + 1`,
          lastAccessed: new Date()
        })
        .where(eq(memories.id, result.memory.id));
    }

    // Sort by relevance and return
    return results
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .slice(0, limit);
  }

  /**
   * Calculate cosine similarity between two vectors
   */
  private cosineSimilarity(a: number[], b: number[]): number {
    if (!a || !b || a.length !== b.length) return 0;
    
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    
    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    
    if (normA === 0 || normB === 0) return 0;
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  /**
   * Get user's recent memories
   */
  async getRecentMemories(userId: string, limit: number = 10): Promise<Memory[]> {
    const db = getDb()!;
    return await db.select()
      .from(memories)
      .where(eq(memories.userId, userId))
      .orderBy(desc(memories.createdAt))
      .limit(limit);
  }

  /**
   * Get user's most important memories
   */
  async getImportantMemories(userId: string, limit: number = 10): Promise<Memory[]> {
    const db = getDb()!;
    return await db.select()
      .from(memories)
      .where(and(
        eq(memories.userId, userId),
        sql`${memories.decayFactor} > 0.5`
      ))
      .orderBy(desc(memories.importanceScore))
      .limit(limit);
  }

  /**
   * Consolidate memories - merge similar memories and remove duplicates
   */
  async consolidateMemories(userId: string): Promise<MemoryConsolidationResult> {
    log(`Consolidating memories for user ${userId}`);
    
    const db = getDb()!;
    const userMemories = await db.select()
      .from(memories)
      .where(eq(memories.userId, userId))
      .orderBy(desc(memories.createdAt));
    
    const removedIds: string[] = [];
    const newMemories: Memory[] = [];
    
    // Simple duplicate detection based on content similarity
    const seen = new Map<string, Memory>();
    
    for (const memory of userMemories) {
      const contentKey = memory.content.toLowerCase().substring(0, 100);
      
      if (seen.has(contentKey)) {
        // Mark for removal if very similar
        removedIds.push(memory.id);
      } else {
        seen.set(contentKey, memory);
      }
    }
    
    // Remove duplicates
    if (removedIds.length > 0) {
      await db.delete(memories)
        .where(sql`${memories.id} = ANY(${removedIds})`);
    }
    
    log(`Consolidation complete: ${removedIds.length} duplicates removed`);
    
    return {
      consolidatedCount: userMemories.length - removedIds.length,
      newMemories,
      removedDuplicates: removedIds.length
    };
  }

  /**
   * Apply memory decay - older, less accessed memories fade
   */
  async applyMemoryDecay(userId: string): Promise<number> {
    const now = new Date();
    const dayInMs = 24 * 60 * 60 * 1000;
    
    const db = getDb()!;
    const userMemories = await db.select()
      .from(memories)
      .where(eq(memories.userId, userId));
    
    let decayedCount = 0;
    
    for (const memory of userMemories) {
      const lastAccessDate = memory.lastAccessed || memory.createdAt || now;
      const lastAccess = new Date(lastAccessDate);
      const daysSinceAccess = (now.getTime() - lastAccess.getTime()) / dayInMs;
      
      // Decay based on time and importance
      // High importance memories decay slower
      const baseDecay = 0.01;
      const importanceMultiplier = 1 - (memory.importanceScore || 0.5);
      const accessBonus = Math.min((memory.accessCount || 0) * 0.05, 0.5);
      
      const decayAmount = baseDecay * importanceMultiplier * (1 - accessBonus) * daysSinceAccess;
      const newDecayFactor = Math.max((memory.decayFactor || 1) - decayAmount, 0);
      
      if (newDecayFactor !== memory.decayFactor) {
        await db.update(memories)
          .set({ decayFactor: newDecayFactor })
          .where(eq(memories.id, memory.id));
        decayedCount++;
      }
    }
    
    log(`Applied decay to ${decayedCount} memories`);
    return decayedCount;
  }

  /**
   * Extract memories from conversation history
   */
  async extractFromConversation(userId: string, sessionId: string): Promise<Memory[]> {
    log(`Extracting memories from conversation ${sessionId}`);
    
    const db = getDb()!;
    // Get conversation messages
    const messages = await db.select()
      .from(conversations)
      .where(and(
        eq(conversations.userId, userId),
        eq(conversations.sessionId, sessionId)
      ))
      .orderBy(conversations.createdAt);
    
    const extractedMemories: Memory[] = [];
    
    // Combine user messages for context
    const userMessages = messages
      .filter(m => m.role === 'user')
      .map(m => m.content)
      .join('\n');
    
    if (userMessages.length > 50) {
      const memory = await this.createMemory(userId, userMessages, {
        sessionId,
        memoryType: 'episodic',
        metadata: {
          source: 'conversation',
          messageCount: messages.length
        }
      });
      extractedMemories.push(memory);
    }
    
    return extractedMemories;
  }

  /**
   * Get memory statistics for a user
   */
  async getMemoryStats(userId: string): Promise<{
    totalMemories: number;
    byType: Record<string, number>;
    byImportance: Record<string, number>;
    avgDecayFactor: number;
    mostAccessedTopics: string[];
  }> {
    const db = getDb()!;
    const userMemories = await db.select()
      .from(memories)
      .where(eq(memories.userId, userId));
    
    const byType: Record<string, number> = {};
    const byImportance: Record<string, number> = {};
    const topicCounts: Record<string, number> = {};
    let totalDecay = 0;
    
    for (const memory of userMemories) {
      // Count by type
      byType[memory.memoryType] = (byType[memory.memoryType] || 0) + 1;
      
      // Count by importance
      byImportance[memory.importance || 'medium'] = 
        (byImportance[memory.importance || 'medium'] || 0) + 1;
      
      // Track topics
      const entities = memory.entities as EntityExtraction;
      for (const topic of entities?.topics || []) {
        topicCounts[topic] = (topicCounts[topic] || 0) + (memory.accessCount || 1);
      }
      
      totalDecay += memory.decayFactor || 1;
    }
    
    const mostAccessedTopics = Object.entries(topicCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([topic]) => topic);
    
    return {
      totalMemories: userMemories.length,
      byType,
      byImportance,
      avgDecayFactor: userMemories.length > 0 ? totalDecay / userMemories.length : 1,
      mostAccessedTopics
    };
  }
}

export const memoryService = new MemoryService();
