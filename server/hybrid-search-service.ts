/**
 * DuyguMotor v3.0 - Hybrid Search Service
 * Combines PostgreSQL Full-Text Search with Vector Similarity Search
 * for enhanced semantic + keyword matching
 */

import { db } from "./db";
import { dreams, conversations, socialVideos } from "@shared/schema";
import { sql, desc, or, ilike, and, gte } from "drizzle-orm";
import * as huggingfaceService from "./huggingface-service";

export interface HybridSearchResult {
  id: string;
  title: string;
  description: string;
  score: number;
  textScore: number;
  vectorScore: number;
  source: 'dream' | 'video' | 'conversation';
  metadata?: Record<string, any>;
}

export interface SearchOptions {
  limit?: number;
  minScore?: number;
  textWeight?: number;
  vectorWeight?: number;
  sources?: ('dream' | 'video' | 'conversation')[];
  dateFrom?: Date;
  userId?: string;
}

const DEFAULT_OPTIONS: Required<SearchOptions> = {
  limit: 20,
  minScore: 0.1,
  textWeight: 0.4,
  vectorWeight: 0.6,
  sources: ['dream'],
  dateFrom: new Date(0),
  userId: '',
};

/**
 * Perform Full-Text Search on PostgreSQL
 * Uses Turkish language configuration for better results
 */
async function fullTextSearch(
  query: string,
  source: 'dream' | 'video' | 'conversation',
  limit: number = 50
): Promise<{ id: string; score: number; data: any }[]> {
  try {
    if (!db) return [];

    // Escape special characters and prepare query
    const sanitizedQuery = query
      .replace(/[&|!():<>]/g, ' ')
      .trim()
      .split(/\s+/)
      .filter(word => word.length > 1)
      .map(word => `${word}:*`)
      .join(' | ');

    if (!sanitizedQuery) return [];

    if (source === 'dream') {
      // Full-text search on dreams using plainto_tsquery for simplicity
      const results = await db.execute(sql`
        SELECT 
          id,
          title,
          description,
          emotion,
          location,
          themes,
          objects,
          source as dream_source,
          intensity,
          created_at,
          ts_rank(
            setweight(to_tsvector('simple', COALESCE(title, '')), 'A') ||
            setweight(to_tsvector('simple', COALESCE(description, '')), 'B') ||
            setweight(to_tsvector('simple', COALESCE(emotion, '')), 'C') ||
            setweight(to_tsvector('simple', COALESCE(location, '')), 'D'),
            plainto_tsquery('simple', ${query})
          ) as rank
        FROM dreams
        WHERE 
          to_tsvector('simple', COALESCE(title, '') || ' ' || COALESCE(description, '') || ' ' || COALESCE(emotion, '') || ' ' || COALESCE(location, ''))
          @@ plainto_tsquery('simple', ${query})
        ORDER BY rank DESC
        LIMIT ${limit}
      `);

      return (results.rows as any[]).map(row => ({
        id: row.id,
        score: parseFloat(row.rank) || 0,
        data: {
          title: row.title,
          description: row.description,
          emotion: row.emotion,
          location: row.location,
          themes: row.themes,
          objects: row.objects,
          source: row.dream_source,
          intensity: row.intensity,
          createdAt: row.created_at,
        },
      }));
    }

    if (source === 'video') {
      const results = await db.execute(sql`
        SELECT 
          id,
          title,
          description,
          platform,
          hashtags,
          view_count,
          like_count,
          created_at,
          ts_rank(
            setweight(to_tsvector('simple', COALESCE(title, '')), 'A') ||
            setweight(to_tsvector('simple', COALESCE(description, '')), 'B'),
            plainto_tsquery('simple', ${query})
          ) as rank
        FROM social_videos
        WHERE 
          to_tsvector('simple', COALESCE(title, '') || ' ' || COALESCE(description, ''))
          @@ plainto_tsquery('simple', ${query})
        ORDER BY rank DESC
        LIMIT ${limit}
      `);

      return (results.rows as any[]).map(row => ({
        id: row.id,
        score: parseFloat(row.rank) || 0,
        data: {
          title: row.title,
          description: row.description,
          platform: row.platform,
          hashtags: row.hashtags,
          viewCount: row.view_count,
          likeCount: row.like_count,
          createdAt: row.created_at,
        },
      }));
    }

    if (source === 'conversation') {
      const results = await db.execute(sql`
        SELECT 
          id,
          session_id,
          user_message,
          assistant_response,
          created_at,
          ts_rank(
            setweight(to_tsvector('simple', COALESCE(user_message, '')), 'A') ||
            setweight(to_tsvector('simple', COALESCE(assistant_response, '')), 'B'),
            plainto_tsquery('simple', ${query})
          ) as rank
        FROM conversations
        WHERE 
          to_tsvector('simple', COALESCE(user_message, '') || ' ' || COALESCE(assistant_response, ''))
          @@ plainto_tsquery('simple', ${query})
        ORDER BY rank DESC
        LIMIT ${limit}
      `);

      return (results.rows as any[]).map(row => ({
        id: row.id,
        score: parseFloat(row.rank) || 0,
        data: {
          sessionId: row.session_id,
          userMessage: row.user_message,
          assistantResponse: row.assistant_response,
          createdAt: row.created_at,
        },
      }));
    }

    return [];
  } catch (error) {
    console.error('[HybridSearch] Full-text search error:', error);
    return [];
  }
}

/**
 * Perform Vector Similarity Search
 * Uses Hugging Face embeddings and cosine similarity
 */
async function vectorSearch(
  query: string,
  source: 'dream' | 'video' | 'conversation',
  limit: number = 50
): Promise<{ id: string; score: number; data: any }[]> {
  try {
    if (!db) return [];

    // Generate embedding for the query
    const queryEmbedding = await huggingfaceService.generateEmbedding(query);
    if (!queryEmbedding.length) return [];

    if (source === 'dream') {
      // Get dreams with embeddings
      const dreamsWithEmbeddings = await db
        .select({
          id: dreams.id,
          title: dreams.title,
          description: dreams.description,
          emotion: dreams.emotion,
          location: dreams.location,
          themes: dreams.themes,
          objects: dreams.objects,
          source: dreams.source,
          intensity: dreams.intensity,
          embedding: dreams.embedding,
          createdAt: dreams.createdAt,
        })
        .from(dreams)
        .where(sql`embedding IS NOT NULL`)
        .limit(500); // Get more candidates for vector search

      // Calculate cosine similarity
      const scoredResults = dreamsWithEmbeddings
        .filter(d => d.embedding && Array.isArray(d.embedding))
        .map(dream => ({
          id: dream.id,
          score: huggingfaceService.cosineSimilarity(queryEmbedding, dream.embedding as number[]),
          data: {
            title: dream.title,
            description: dream.description,
            emotion: dream.emotion,
            location: dream.location,
            themes: dream.themes,
            objects: dream.objects,
            source: dream.source,
            intensity: dream.intensity,
            createdAt: dream.createdAt,
          },
        }))
        .filter(r => r.score > 0.1)
        .sort((a, b) => b.score - a.score)
        .slice(0, limit);

      return scoredResults;
    }

    // For videos and conversations, we would need to add embedding columns
    // For now, return empty (can be extended later)
    return [];
  } catch (error) {
    console.error('[HybridSearch] Vector search error:', error);
    return [];
  }
}

/**
 * Simple keyword fallback search using ILIKE
 */
async function fallbackSearch(
  query: string,
  source: 'dream' | 'video' | 'conversation',
  limit: number = 50
): Promise<{ id: string; score: number; data: any }[]> {
  try {
    if (!db) return [];
    const pattern = `%${query}%`;

    if (source === 'dream') {
      const results = await db
        .select()
        .from(dreams)
        .where(or(
          ilike(dreams.title, pattern),
          ilike(dreams.description, pattern),
          ilike(dreams.emotion, pattern),
          ilike(dreams.location, pattern)
        ))
        .orderBy(desc(dreams.createdAt))
        .limit(limit);

      return results.map((d, index) => ({
        id: d.id,
        score: 1 - (index / limit), // Simple ranking by position
        data: {
          title: d.title,
          description: d.description,
          emotion: d.emotion,
          location: d.location,
          themes: d.themes,
          objects: d.objects,
          source: d.source,
          intensity: d.intensity,
          createdAt: d.createdAt,
        },
      }));
    }

    return [];
  } catch (error) {
    console.error('[HybridSearch] Fallback search error:', error);
    return [];
  }
}

/**
 * Merge and rank results from different search methods
 * Uses Reciprocal Rank Fusion (RRF) algorithm
 */
function mergeResults(
  textResults: { id: string; score: number; data: any }[],
  vectorResults: { id: string; score: number; data: any }[],
  textWeight: number,
  vectorWeight: number
): { id: string; score: number; textScore: number; vectorScore: number; data: any }[] {
  const merged = new Map<string, {
    textScore: number;
    vectorScore: number;
    textRank: number;
    vectorRank: number;
    data: any;
  }>();

  // Process text results
  textResults.forEach((result, index) => {
    merged.set(result.id, {
      textScore: result.score,
      vectorScore: 0,
      textRank: index + 1,
      vectorRank: 9999,
      data: result.data,
    });
  });

  // Process vector results
  vectorResults.forEach((result, index) => {
    const existing = merged.get(result.id);
    if (existing) {
      existing.vectorScore = result.score;
      existing.vectorRank = index + 1;
    } else {
      merged.set(result.id, {
        textScore: 0,
        vectorScore: result.score,
        textRank: 9999,
        vectorRank: index + 1,
        data: result.data,
      });
    }
  });

  // Calculate RRF score
  const k = 60; // RRF constant
  const results = Array.from(merged.entries()).map(([id, data]) => {
    // Normalize scores
    const normalizedTextScore = data.textRank < 9999 ? data.textScore : 0;
    const normalizedVectorScore = data.vectorRank < 9999 ? data.vectorScore : 0;

    // RRF formula with weights
    const rrfScore = 
      textWeight * (1 / (k + data.textRank)) +
      vectorWeight * (1 / (k + data.vectorRank));

    // Combine with raw scores for better ranking
    const combinedScore = 
      (textWeight * normalizedTextScore + vectorWeight * normalizedVectorScore) * 0.5 +
      rrfScore * 100;

    return {
      id,
      score: combinedScore,
      textScore: normalizedTextScore,
      vectorScore: normalizedVectorScore,
      data: data.data,
    };
  });

  return results.sort((a, b) => b.score - a.score);
}

/**
 * Main Hybrid Search function
 * Combines Full-Text Search and Vector Similarity Search
 */
export async function hybridSearch(
  query: string,
  options: SearchOptions = {}
): Promise<HybridSearchResult[]> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const allResults: HybridSearchResult[] = [];

  console.log(`[HybridSearch] Searching for: "${query}" with options:`, {
    sources: opts.sources,
    textWeight: opts.textWeight,
    vectorWeight: opts.vectorWeight,
  });

  for (const source of opts.sources) {
    try {
      // Perform both searches in parallel
      const [textResults, vectorResults] = await Promise.all([
        fullTextSearch(query, source, opts.limit * 2),
        vectorSearch(query, source, opts.limit * 2),
      ]);

      console.log(`[HybridSearch] ${source}: ${textResults.length} text, ${vectorResults.length} vector results`);

      // If no results from either, try fallback
      if (textResults.length === 0 && vectorResults.length === 0) {
        const fallbackResults = await fallbackSearch(query, source, opts.limit);
        console.log(`[HybridSearch] ${source}: ${fallbackResults.length} fallback results`);
        
        fallbackResults.slice(0, opts.limit).forEach(result => {
          allResults.push({
            id: result.id,
            title: result.data.title || '',
            description: result.data.description || '',
            score: result.score,
            textScore: result.score,
            vectorScore: 0,
            source,
            metadata: result.data,
          });
        });
        continue;
      }

      // Merge results using RRF
      const merged = mergeResults(
        textResults,
        vectorResults,
        opts.textWeight,
        opts.vectorWeight
      );

      // Convert to final format
      merged
        .filter(r => r.score >= opts.minScore)
        .slice(0, opts.limit)
        .forEach(result => {
          allResults.push({
            id: result.id,
            title: result.data.title || '',
            description: result.data.description || '',
            score: result.score,
            textScore: result.textScore,
            vectorScore: result.vectorScore,
            source,
            metadata: result.data,
          });
        });
    } catch (error) {
      console.error(`[HybridSearch] Error searching ${source}:`, error);
    }
  }

  // Sort all results by combined score
  return allResults
    .sort((a, b) => b.score - a.score)
    .slice(0, opts.limit);
}

/**
 * Semantic search specifically for dreams
 * Optimized for dream content
 */
export async function searchDreamsHybrid(
  query: string,
  options: Partial<SearchOptions> = {}
): Promise<HybridSearchResult[]> {
  return hybridSearch(query, {
    ...options,
    sources: ['dream'],
  });
}

/**
 * Search with automatic query expansion
 * Adds related Turkish terms for better recall
 */
export async function searchWithExpansion(
  query: string,
  options: SearchOptions = {}
): Promise<HybridSearchResult[]> {
  // Turkish emotion synonyms for query expansion
  const emotionExpansions: Record<string, string[]> = {
    'korku': ['endişe', 'kaygı', 'panik', 'dehşet'],
    'mutluluk': ['sevinç', 'neşe', 'huzur', 'keyif'],
    'üzüntü': ['hüzün', 'keder', 'melankoli', 'yas'],
    'öfke': ['kızgınlık', 'sinir', 'hiddet', 'gazap'],
    'şaşkınlık': ['hayret', 'şok', 'sürpriz'],
  };

  // Check if query contains an emotion word
  const queryLower = query.toLowerCase();
  let expandedQuery = query;

  for (const [emotion, synonyms] of Object.entries(emotionExpansions)) {
    if (queryLower.includes(emotion)) {
      expandedQuery = `${query} ${synonyms.join(' ')}`;
      break;
    }
  }

  return hybridSearch(expandedQuery, options);
}

/**
 * Get search statistics
 */
export async function getSearchStats(): Promise<{
  totalDreams: number;
  dreamsWithEmbeddings: number;
  embeddingCoverage: number;
}> {
  try {
    if (!db) {
      return { totalDreams: 0, dreamsWithEmbeddings: 0, embeddingCoverage: 0 };
    }

    const [totalResult, embeddedResult] = await Promise.all([
      db.execute(sql`SELECT COUNT(*) as count FROM dreams`),
      db.execute(sql`SELECT COUNT(*) as count FROM dreams WHERE embedding IS NOT NULL`),
    ]);

    const total = parseInt((totalResult.rows[0] as any)?.count || '0');
    const embedded = parseInt((embeddedResult.rows[0] as any)?.count || '0');

    return {
      totalDreams: total,
      dreamsWithEmbeddings: embedded,
      embeddingCoverage: total > 0 ? (embedded / total) * 100 : 0,
    };
  } catch (error) {
    console.error('[HybridSearch] Stats error:', error);
    return { totalDreams: 0, dreamsWithEmbeddings: 0, embeddingCoverage: 0 };
  }
}
