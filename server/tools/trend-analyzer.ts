/**
 * Trend Analyzer Tool
 * TikTok/Instagram trendlerini database'den analiz et
 */

import { db } from "../db";
import { socialVideos } from "../../shared/schema";
import { desc, sql } from "drizzle-orm";

export async function analyzeTrends(platform: string = 'tiktok'): Promise<{
  success: boolean;
  trends?: any[];
  summary?: string;
  error?: string;
}> {
  try {
    console.log(`📊 ${platform} trendleri analiz ediliyor...`);
    
    // Get top trending videos from last 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const trendingVideos = await db
      .select()
      .from(socialVideos)
      .where(sql`${socialVideos.platform} = ${platform} AND ${socialVideos.createdAt} > ${sevenDaysAgo}`)
      .orderBy(desc(socialVideos.viewCount))
      .limit(10);

    // Generate summary
    const totalViews = trendingVideos.reduce((sum, v) => sum + (v.viewCount || 0), 0);
    const avgViews = trendingVideos.length > 0 ? totalViews / trendingVideos.length : 0;
    
    const summary = `Son 7 günde ${platform}'ta ${trendingVideos.length} popüler içerik. Ortalama ${Math.round(avgViews).toLocaleString()} görüntülenme.`;

    console.log(`✅ Trend analizi tamamlandı`);

    return {
      success: true,
      trends: trendingVideos.map(v => ({
        title: v.title,
        views: v.viewCount,
        likes: v.likeCount,
        author: v.authorUsername,
        url: v.url
      })),
      summary
    };

  } catch (error: any) {
    console.error(`❌ Trend analysis error:`, error.message);
    return {
      success: false,
      error: error.message
    };
  }
}


