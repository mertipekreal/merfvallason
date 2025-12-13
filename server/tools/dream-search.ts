/**
 * Dream Search Tool
 * PostgreSQL dreams tablosunda arama
 */

import { db } from "../db";
import { dreams } from "../../shared/schema";
import { sql, ilike } from "drizzle-orm";

export async function searchDreams(query: string): Promise<{
  success: boolean;
  dreams?: any[];
  count?: number;
  error?: string;
}> {
  try {
    console.log(`🌙 Rüya aranıyor: ${query}`);
    
    // Search in dream content and tags
    const results = await db
      .select()
      .from(dreams)
      .where(
        sql`${dreams.content} ILIKE ${`%${query}%`} OR ${dreams.tags}::text ILIKE ${`%${query}%`}`
      )
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

