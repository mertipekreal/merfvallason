/**
 * TikTok Stats Güncelleme Scripti
 * Apify'dan TikTok istatistiklerini çeker ve mevcut kayıtları günceller
 */

import { ApifyClient } from 'apify-client';
import { initDatabase } from '../server/db';
import { socialVideos } from '../shared/schema';
import { sql, eq } from 'drizzle-orm';

const db = initDatabase();
if (!db) {
  console.error('❌ Database initialization failed');
  process.exit(1);
}

const APIFY_TOKEN = process.env.APIFY_API_TOKEN;
if (!APIFY_TOKEN) {
  console.error('❌ APIFY_API_TOKEN required');
  process.exit(1);
}

const client = new ApifyClient({ token: APIFY_TOKEN });

interface TikTokStats {
  id: string;
  playCount: number;
  diggCount: number;
  shareCount: number;
  commentCount: number;
}

async function scanApifyForStats(): Promise<Map<string, TikTokStats>> {
  console.log('📋 Apify TikTok verilerini tarıyorum...\n');
  
  const statsMap = new Map<string, TikTokStats>();
  
  const allRuns = await client.runs().list({ limit: 300 });
  console.log(`Toplam ${allRuns.total} run bulundu`);
  
  let processedRuns = 0;
  let foundStats = 0;
  
  for (const run of allRuns.items) {
    if (!run.defaultDatasetId) continue;
    
    try {
      const dataset = client.dataset(run.defaultDatasetId);
      const { items } = await dataset.listItems({ limit: 1000 });
      
      for (const item of items) {
        // TikTok verisi mi kontrol et
        if (item.id && (item.webVideoUrl?.includes('tiktok') || item.authorMeta || item.stats)) {
          const videoId = item.id as string;
          const stats = item.stats as any;
          
          if (stats && (stats.playCount || stats.diggCount || stats.shareCount)) {
            statsMap.set(videoId, {
              id: videoId,
              playCount: stats.playCount || 0,
              diggCount: stats.diggCount || 0,
              shareCount: stats.shareCount || 0,
              commentCount: stats.commentCount || 0
            });
            foundStats++;
          }
        }
      }
      
      processedRuns++;
      if (processedRuns % 20 === 0) {
        console.log(`  → ${processedRuns} run işlendi, ${foundStats} istatistik bulundu`);
      }
      
    } catch (e) {
      // Dataset silinmiş olabilir
    }
    
    // Rate limiting
    if (processedRuns % 10 === 0) {
      await new Promise(r => setTimeout(r, 200));
    }
  }
  
  console.log(`\n✅ Toplam ${statsMap.size} benzersiz TikTok istatistiği bulundu\n`);
  return statsMap;
}

async function updateDatabaseStats(statsMap: Map<string, TikTokStats>): Promise<void> {
  console.log('📊 Veritabanı güncelleniyor...\n');
  
  // Mevcut TikTok videolarını al
  const existingVideos = await db
    .select({ id: socialVideos.id, platformVideoId: socialVideos.platformVideoId })
    .from(socialVideos)
    .where(eq(socialVideos.platform, 'tiktok'));
  
  console.log(`Veritabanında ${existingVideos.length} TikTok videosu var`);
  
  let updated = 0;
  let notFound = 0;
  
  for (const video of existingVideos) {
    const stats = statsMap.get(video.platformVideoId);
    
    if (stats) {
      await db
        .update(socialVideos)
        .set({
          viewCount: stats.playCount,
          likeCount: stats.diggCount,
          shareCount: stats.shareCount,
          commentCount: stats.commentCount
        })
        .where(eq(socialVideos.id, video.id));
      
      updated++;
      
      if (updated % 500 === 0) {
        console.log(`  → ${updated} video güncellendi...`);
      }
    } else {
      notFound++;
    }
  }
  
  console.log(`\n✅ Güncelleme tamamlandı:`);
  console.log(`   • Güncellenen: ${updated}`);
  console.log(`   • Eşleşmeyen: ${notFound}`);
}

async function calculateViralMetrics(): Promise<void> {
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('                    VİRAL ANALİZ SONUÇLARI');
  console.log('═══════════════════════════════════════════════════════════════\n');
  
  // TikTok metrikleri
  const tiktokStats = await db.execute(sql`
    SELECT 
      COUNT(*) as toplam,
      COUNT(*) FILTER (WHERE view_count > 0) as goruntulenme_olan,
      AVG(view_count) FILTER (WHERE view_count > 0) as ort_view,
      AVG(like_count) FILTER (WHERE like_count > 0) as ort_like,
      AVG(share_count) FILTER (WHERE share_count > 0) as ort_share,
      MAX(view_count) as max_view,
      MAX(like_count) as max_like,
      MAX(share_count) as max_share,
      COUNT(*) FILTER (WHERE view_count > 1000000) as milyon_plus,
      COUNT(*) FILTER (WHERE view_count > 100000) as yuzbin_plus,
      COUNT(*) FILTER (WHERE share_count > 1000) as viral_share
    FROM social_videos
    WHERE platform = 'tiktok'
  `);
  
  const stats = tiktokStats.rows[0] as any;
  
  console.log('📱 TİKTOK METRİKLERİ');
  console.log('───────────────────────────────────────────────────────────────');
  console.log(`Toplam Video:           ${Number(stats.toplam).toLocaleString()}`);
  console.log(`Görüntülenme Verisi:    ${Number(stats.goruntulenme_olan).toLocaleString()}`);
  console.log(`Ort. Görüntülenme:      ${Math.round(Number(stats.ort_view) || 0).toLocaleString()}`);
  console.log(`Ort. Beğeni:            ${Math.round(Number(stats.ort_like) || 0).toLocaleString()}`);
  console.log(`Ort. Paylaşım:          ${Math.round(Number(stats.ort_share) || 0).toLocaleString()}`);
  console.log(`Max Görüntülenme:       ${Number(stats.max_view).toLocaleString()}`);
  console.log(`Max Beğeni:             ${Number(stats.max_like).toLocaleString()}`);
  console.log(`Max Paylaşım:           ${Number(stats.max_share).toLocaleString()}`);
  console.log('');
  console.log(`1M+ Görüntülenme:       ${Number(stats.milyon_plus)} video`);
  console.log(`100K+ Görüntülenme:     ${Number(stats.yuzbin_plus)} video`);
  console.log(`Viral (1K+ paylaşım):   ${Number(stats.viral_share)} video`);
  
  // Viral oranı hesapla
  const totalWithViews = Number(stats.goruntulenme_olan) || 1;
  const viralCount = Number(stats.milyon_plus) || 0;
  const viralRate = (viralCount / totalWithViews) * 100;
  
  console.log('');
  console.log('───────────────────────────────────────────────────────────────');
  console.log(`🔥 VİRAL ORANI: ${viralRate.toFixed(2)}% (1M+ görüntülenme)`);
  console.log('───────────────────────────────────────────────────────────────');
  
  // Instagram metrikleri
  const igStats = await db.execute(sql`
    SELECT 
      COUNT(*) as toplam,
      COUNT(*) FILTER (WHERE like_count > 0) as begeni_olan,
      AVG(like_count) FILTER (WHERE like_count > 0) as ort_like,
      MAX(like_count) as max_like,
      COUNT(*) FILTER (WHERE like_count > 10000) as onbin_plus
    FROM social_videos
    WHERE platform = 'instagram'
  `);
  
  const ig = igStats.rows[0] as any;
  
  console.log('\n📸 INSTAGRAM METRİKLERİ');
  console.log('───────────────────────────────────────────────────────────────');
  console.log(`Toplam Video:           ${Number(ig.toplam).toLocaleString()}`);
  console.log(`Beğeni Verisi Olan:     ${Number(ig.begeni_olan).toLocaleString()}`);
  console.log(`Ort. Beğeni:            ${Math.round(Number(ig.ort_like) || 0).toLocaleString()}`);
  console.log(`Max Beğeni:             ${Number(ig.max_like).toLocaleString()}`);
  console.log(`10K+ Beğeni:            ${Number(ig.onbin_plus)} video`);
  
  const igViralRate = (Number(ig.onbin_plus) / Number(ig.begeni_olan || 1)) * 100;
  console.log(`🔥 VİRAL ORANI: ${igViralRate.toFixed(2)}% (10K+ beğeni)`);
}

async function main() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('     TİKTOK İSTATİSTİK GÜNCELLEME');
  console.log('═══════════════════════════════════════════════════════════════\n');
  
  const statsMap = await scanApifyForStats();
  
  if (statsMap.size > 0) {
    await updateDatabaseStats(statsMap);
  }
  
  await calculateViralMetrics();
}

main().catch(console.error);
