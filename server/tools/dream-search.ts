/**
 * Dream Search Tool
 * PostgreSQL dreams tablosunda arama
 */

import { db } from "../db";
import { dreams } from "../../shared/schema";
import { or, ilike } from "drizzle-orm";

export async function searchDreams(query: string): Promise<{
  success: boolean;
  dreams?: any[];
  count?: number;
  error?: string;
}> {
  try {
    console.log(`🌙 Rüya aranıyor: ${query}`);
    
    if (!query || query.trim() === '') {
      return {
        success: false,
        error: "Arama kelimesi boş olamaz"
      };
    }

    // Search in dream content only (tags removed to avoid SQL issues)
    const searchPattern = `%${query}%`;
    const results = await db
      .select()
      .from(dreams)
      .where(ilike(dreams.content, searchPattern))
      .limit(10);

    console.log(`✅ ${results.length} rüya bulundu`);

    return {
      success: true,
      dreams: results,
      count: results.length
    };

  } catch (error: any) {
    console.error(`❌ Dream search error:`, error.message);
    return {
      success: false,
      error: error.message
    };
  }
}
