/**
 * Apify'dan PostgreSQL'e Veri Aktarma Scripti
 * 
 * Apify run'larından verileri çeker ve social_videos tablosuna kaydeder
 */

import { ApifyClient } from 'apify-client';
import { initDatabase } from '../server/db';
import { socialVideos } from '../shared/schema';
import { v4 as uuidv4 } from 'uuid';
import { sql } from 'drizzle-orm';

// Initialize database
const db = initDatabase();
if (!db) {
  console.error('❌ Database initialization failed. Check DATABASE_URL');
  process.exit(1);
}

const APIFY_TOKEN = process.env.APIFY_API_TOKEN;

if (!APIFY_TOKEN) {
  console.error('❌ APIFY_API_TOKEN environment variable is required');
  process.exit(1);
}

const client = new ApifyClient({ token: APIFY_TOKEN });

interface TikTokItem {
  id?: string;
  webVideoUrl?: string;
  videoUrl?: string;
  desc?: string;
  text?: string;
  hashtags?: string[];
  covers?: string[];
  dynamicCover?: string;
  music?: { id?: string; title?: string };
  stats?: { playCount?: number; diggCount?: number; shareCount?: number; commentCount?: number };
  authorMeta?: { name?: string; id?: string; nickName?: string; uniqueId?: string };
  createTime?: number;
  createTimeISO?: string;
}

interface InstagramItem {
  id?: string;
  shortCode?: string;
  url?: string;
  caption?: string;
  hashtags?: string[];
  displayUrl?: string;
  videoUrl?: string;
  likesCount?: number;
  commentsCount?: number;
  timestamp?: string;
  ownerUsername?: string;
}

function detectPlatform(item: any): 'tiktok' | 'instagram' | 'twitter' | null {
  if (item.webVideoUrl?.includes('tiktok') || item.authorMeta?.uniqueId || item.music) {
    return 'tiktok';
  }
  if (item.shortCode || item.ownerUsername || item.url?.includes('instagram')) {
    return 'instagram';
  }
  if (item.tweet_id || item.full_text || item.url?.includes('twitter') || item.url?.includes('x.com')) {
    return 'twitter';
  }
  return null;
}

function detectRegion(item: any): 'turkey' | 'global' {
  const turkeyKeywords = ['türk', 'turk', 'istanbul', 'ankara', 'izmir', 'keşfet', 'kesfet', 'türkiye', 'turkiye', 'fyptr'];
  
  const text = [
    item.desc || '',
    item.text || '',
    item.caption || '',
    ...(item.hashtags || [])
  ].join(' ').toLowerCase();
  
  return turkeyKeywords.some(kw => text.includes(kw)) ? 'turkey' : 'global';
}

function mapTikTokToVideo(item: TikTokItem): any {
  const platformVideoId = item.id || `tiktok_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  return {
    id: uuidv4(),
    platform: 'tiktok',
    region: detectRegion(item),
    platformVideoId,
    caption: item.desc || item.text || null,
    hashtags: item.hashtags || [],
    soundId: item.music?.id || null,
    videoUrl: item.videoUrl || item.webVideoUrl || null,
    thumbnailUrl: item.covers?.[0] || item.dynamicCover || null,
    viewCount: item.stats?.playCount || 0,
    likeCount: item.stats?.diggCount || 0,
    shareCount: item.stats?.shareCount || 0,
    commentCount: item.stats?.commentCount || 0,
    authorUsername: item.authorMeta?.uniqueId || item.authorMeta?.name || item.authorMeta?.nickName || null,
    authorId: item.authorMeta?.id || null,
    postedAt: item.createTimeISO ? new Date(item.createTimeISO) : 
              item.createTime ? new Date(item.createTime * 1000) : null,
    fetchedAt: new Date(),
  };
}

function mapInstagramToVideo(item: InstagramItem): any {
  const platformVideoId = item.id || item.shortCode || `ig_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  return {
    id: uuidv4(),
    platform: 'instagram',
    region: detectRegion(item),
    platformVideoId,
    caption: item.caption || null,
    hashtags: item.hashtags || [],
    soundId: null,
    videoUrl: item.videoUrl || item.url || null,
    thumbnailUrl: item.displayUrl || null,
    viewCount: 0,
    likeCount: item.likesCount || 0,
    shareCount: 0,
    commentCount: item.commentsCount || 0,
    authorUsername: item.ownerUsername || null,
    authorId: null,
    postedAt: item.timestamp ? new Date(item.timestamp) : null,
    fetchedAt: new Date(),
  };
}

async function getRunsWithData(): Promise<Array<{ runId: string; datasetId: string; itemCount: number }>> {
  console.log('📋 Apify run\'ları taranıyor...');
  
  const runsWithData: Array<{ runId: string; datasetId: string; itemCount: number }> = [];
  
  // Get all runs (up to 500)
  const allRuns = await client.runs().list({ limit: 500 });
  console.log(`  → Toplam ${allRuns.total} run bulundu`);
  
  let checkedCount = 0;
  for (const run of allRuns.items) {
    if (run.defaultDatasetId) {
      try {
        const info = await client.dataset(run.defaultDatasetId).get();
        if (info && info.itemCount > 0) {
          runsWithData.push({
            runId: run.id,
            datasetId: run.defaultDatasetId,
            itemCount: info.itemCount,
          });
        }
      } catch (e) {
        // Dataset might have been deleted
      }
    }
    checkedCount++;
    if (checkedCount % 50 === 0) {
      console.log(`  → ${checkedCount} run kontrol edildi, ${runsWithData.length} veri bulundu...`);
    }
  }
  
  return runsWithData;
}

async function importDataset(datasetId: string): Promise<{ imported: number; skipped: number; errors: number }> {
  const stats = { imported: 0, skipped: 0, errors: 0 };
  
  try {
    const dataset = client.dataset(datasetId);
    
    // Fetch all items (paginated)
    let offset = 0;
    const limit = 1000;
    let allItems: any[] = [];
    
    while (true) {
      const { items } = await dataset.listItems({ limit, offset });
      if (!items || items.length === 0) break;
      allItems = allItems.concat(items);
      if (items.length < limit) break;
      offset += limit;
    }
    
    if (allItems.length === 0) {
      return stats;
    }
    
    const videosToInsert: any[] = [];
    
    for (const item of allItems) {
      try {
        const platform = detectPlatform(item);
        
        if (!platform || platform === 'twitter') {
          stats.skipped++;
          continue;
        }
        
        let videoData: any;
        
        if (platform === 'tiktok') {
          videoData = mapTikTokToVideo(item as TikTokItem);
        } else if (platform === 'instagram') {
          videoData = mapInstagramToVideo(item as InstagramItem);
        } else {
          stats.skipped++;
          continue;
        }
        
        videosToInsert.push(videoData);
      } catch (error) {
        stats.errors++;
      }
    }
    
    // Insert in batches
    if (videosToInsert.length > 0) {
      const batchSize = 100;
      for (let i = 0; i < videosToInsert.length; i += batchSize) {
        const batch = videosToInsert.slice(i, i + batchSize);
        try {
          await db.insert(socialVideos)
            .values(batch)
            .onConflictDoNothing({ target: socialVideos.platformVideoId });
          stats.imported += batch.length;
        } catch (error: any) {
          if (error.message?.includes('duplicate')) {
            stats.skipped += batch.length;
          } else {
            stats.errors += batch.length;
          }
        }
      }
    }
    
    return stats;
  } catch (error: any) {
    stats.errors++;
    return stats;
  }
}

async function getExistingCount(): Promise<number> {
  const result = await db.select({ count: sql<number>`count(*)` }).from(socialVideos);
  return Number(result[0]?.count || 0);
}

async function main() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('     APIFY → PostgreSQL VERİ AKTARIMI');
  console.log('═══════════════════════════════════════════════════════════════\n');
  
  const existingBefore = await getExistingCount();
  console.log(`📊 Mevcut social_videos kayıt sayısı: ${existingBefore}\n`);
  
  // Get runs with data
  const runsWithData = await getRunsWithData();
  
  console.log(`\n✅ Veri içeren ${runsWithData.length} run bulundu`);
  
  if (runsWithData.length === 0) {
    console.log('❌ Aktarılacak veri bulunamadı');
    process.exit(0);
  }
  
  const totalItems = runsWithData.reduce((sum, r) => sum + r.itemCount, 0);
  console.log(`📦 Toplam item sayısı: ${totalItems.toLocaleString()}\n`);
  
  console.log('🚀 Veri aktarımı başlıyor...\n');
  
  const overallStats = { imported: 0, skipped: 0, errors: 0 };
  
  for (let i = 0; i < runsWithData.length; i++) {
    const run = runsWithData[i];
    const progress = ((i + 1) / runsWithData.length * 100).toFixed(1);
    
    process.stdout.write(`[${progress}%] Run ${i + 1}/${runsWithData.length} (${run.itemCount} items)... `);
    
    const stats = await importDataset(run.datasetId);
    
    overallStats.imported += stats.imported;
    overallStats.skipped += stats.skipped;
    overallStats.errors += stats.errors;
    
    console.log(`✅ ${stats.imported} aktarıldı`);
    
    // Rate limiting
    if ((i + 1) % 5 === 0) {
      await new Promise(resolve => setTimeout(resolve, 300));
    }
  }
  
  const existingAfter = await getExistingCount();
  
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('     SONUÇLAR');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log(`📊 Önceki kayıt sayısı: ${existingBefore.toLocaleString()}`);
  console.log(`📊 Şimdiki kayıt sayısı: ${existingAfter.toLocaleString()}`);
  console.log(`📥 Yeni eklenen: ${(existingAfter - existingBefore).toLocaleString()}`);
  console.log(`⏭️ Atlanan: ${overallStats.skipped.toLocaleString()}`);
  console.log(`❌ Hata: ${overallStats.errors.toLocaleString()}`);
  console.log('═══════════════════════════════════════════════════════════════\n');
}

main().catch(console.error);
