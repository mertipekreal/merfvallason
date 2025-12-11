import { apifyService, type ScrapeJob } from './apify-service';
import { analyticsEngine } from './analytics-engine';
import { db } from './db';
import { scrapeRuns, weeklyInsights } from '@shared/schema';
import { eq } from 'drizzle-orm';
import { randomUUID } from 'crypto';

interface WeeklyScrapingConfig {
  dailyVideoCount: number;
  turkeyPercent: number;
  globalPercent: number;
}

interface ScrapingResult {
  platform: string;
  region: string;
  count: number;
  datasetId?: string;
  job?: ScrapeJob;
}

const DEFAULT_CONFIG: WeeklyScrapingConfig = {
  dailyVideoCount: 2500,
  turkeyPercent: 70,
  globalPercent: 30,
};

function getWeekNumber(date: Date): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return `${d.getUTCFullYear()}-W${weekNo.toString().padStart(2, '0')}`;
}

function getPastWeekDates(fromDate: Date = new Date()): Date[] {
  const dates: Date[] = [];
  for (let i = 6; i >= 0; i--) {
    const date = new Date(fromDate);
    date.setDate(date.getDate() - i);
    dates.push(date);
  }
  return dates;
}

class WeeklyScraperService {
  private config: WeeklyScrapingConfig = DEFAULT_CONFIG;
  private isRunning: boolean = false;

  setConfig(config: Partial<WeeklyScrapingConfig>): void {
    this.config = { ...this.config, ...config };
    console.log('[WeeklyScraper] Config updated:', this.config);
  }

  getConfig(): WeeklyScrapingConfig {
    return { ...this.config };
  }

  async runWeeklyScrape(platform: 'tiktok' | 'instagram', startDate?: Date): Promise<any> {
    if (this.isRunning) {
      throw new Error('Weekly scrape already in progress');
    }

    this.isRunning = true;
    const weekNumber = getWeekNumber(startDate || new Date());
    const runId = randomUUID();

    console.log(`[WeeklyScraper] Starting weekly scrape for ${platform}, week: ${weekNumber}`);

    const scrapeRunRecord = {
      id: runId,
      weekNumber,
      platform,
      region: 'mixed',
      status: 'running' as const,
      targetCount: this.config.dailyVideoCount * 7,
      actualCount: 0,
      turkeyCount: 0,
      globalCount: 0,
      datasetIds: [] as string[],
      startedAt: new Date(),
    };

    try {
      if (db) {
        await db.insert(scrapeRuns).values(scrapeRunRecord);
      }
    } catch (error) {
      console.log('[WeeklyScraper] Could not insert to DB, continuing with in-memory tracking');
    }

    const results: ScrapingResult[] = [];
    const datasetIds: string[] = [];
    let totalTurkeyCount = 0;
    let totalGlobalCount = 0;

    try {
      const turkeyCount = Math.round(this.config.dailyVideoCount * 7 * (this.config.turkeyPercent / 100));
      const globalCount = this.config.dailyVideoCount * 7 - turkeyCount;

      console.log(`[WeeklyScraper] Target: Turkey ${turkeyCount}, Global ${globalCount}`);

      if (!apifyService.isInitialized()) {
        const token = process.env.APIFY_API_TOKEN;
        if (token) {
          apifyService.initialize(token);
        } else {
          throw new Error('Apify not initialized and no API token available');
        }
      }

      apifyService.setRegionConfig(this.config.turkeyPercent, this.config.globalPercent);

      const batchSize = Math.min(500, turkeyCount);
      const turkeyBatches = Math.ceil(turkeyCount / batchSize);
      const globalBatches = Math.ceil(globalCount / batchSize);

      console.log(`[WeeklyScraper] Processing ${turkeyBatches} Turkey batches, ${globalBatches} Global batches`);

      for (let i = 0; i < Math.min(turkeyBatches, 3); i++) {
        try {
          console.log(`[WeeklyScraper] Turkey batch ${i + 1}/${turkeyBatches}`);
          const jobs = await apifyService.scrapeByRegion(platform, batchSize);
          
          for (const job of jobs) {
            if (job.datasetId) {
              datasetIds.push(job.datasetId);
              if (job.region === 'turkey') {
                totalTurkeyCount += job.resultsCount || 0;
              } else {
                totalGlobalCount += job.resultsCount || 0;
              }
              results.push({
                platform,
                region: job.region || 'mixed',
                count: job.resultsCount || 0,
                datasetId: job.datasetId,
                job,
              });
            }
          }

          await new Promise(resolve => setTimeout(resolve, 2000));
        } catch (error: any) {
          console.error(`[WeeklyScraper] Batch ${i + 1} failed:`, error.message);
        }
      }

      const totalCount = totalTurkeyCount + totalGlobalCount;
      console.log(`[WeeklyScraper] Completed: ${totalCount} total (Turkey: ${totalTurkeyCount}, Global: ${totalGlobalCount})`);

      try {
        if (db) {
          await db.update(scrapeRuns)
            .set({
              status: 'completed',
              actualCount: totalCount,
              turkeyCount: totalTurkeyCount,
              globalCount: totalGlobalCount,
              datasetIds,
              completedAt: new Date(),
            })
            .where(eq(scrapeRuns.id, runId));
        }
      } catch (error) {
        console.log('[WeeklyScraper] Could not update DB record');
      }

      this.isRunning = false;

      return {
        success: true,
        weekNumber,
        platform,
        totalCount,
        turkeyCount: totalTurkeyCount,
        globalCount: totalGlobalCount,
        datasetIds,
        results,
      };

    } catch (error: any) {
      console.error('[WeeklyScraper] Weekly scrape failed:', error.message);
      
      try {
        if (db) {
          await db.update(scrapeRuns)
            .set({
              status: 'failed',
              errorMessage: error.message,
              completedAt: new Date(),
            })
            .where(eq(scrapeRuns.id, runId));
        }
      } catch (dbError) {
        console.log('[WeeklyScraper] Could not update DB record');
      }

      this.isRunning = false;
      throw error;
    }
  }

  async runFullWeeklyScrape(startDate?: Date): Promise<any> {
    const results = {
      tiktok: null as any,
      instagram: null as any,
      weekNumber: getWeekNumber(startDate || new Date()),
    };

    try {
      console.log('[WeeklyScraper] Starting TikTok scrape...');
      results.tiktok = await this.runWeeklyScrape('tiktok', startDate);
    } catch (error: any) {
      console.error('[WeeklyScraper] TikTok scrape failed:', error.message);
      results.tiktok = { error: error.message };
    }

    await new Promise(resolve => setTimeout(resolve, 5000));

    try {
      console.log('[WeeklyScraper] Starting Instagram scrape...');
      results.instagram = await this.runWeeklyScrape('instagram', startDate);
    } catch (error: any) {
      console.error('[WeeklyScraper] Instagram scrape failed:', error.message);
      results.instagram = { error: error.message };
    }

    return results;
  }

  async getScrapeHistory(limit: number = 10): Promise<any[]> {
    try {
      if (!db) return [];
      const runs = await db.select().from(scrapeRuns).limit(limit);
      return runs;
    } catch (error) {
      console.error('[WeeklyScraper] Could not fetch history:', error);
      return [];
    }
  }

  async getWeeklyInsights(weekNumber: string): Promise<any> {
    try {
      if (!db) return [];
      const insights = await db.select()
        .from(weeklyInsights)
        .where(eq(weeklyInsights.weekNumber, weekNumber));
      return insights;
    } catch (error) {
      console.error('[WeeklyScraper] Could not fetch insights:', error);
      return [];
    }
  }

  isScrapingInProgress(): boolean {
    return this.isRunning;
  }

  getCurrentWeekNumber(): string {
    return getWeekNumber(new Date());
  }
}

export const weeklyScraperService = new WeeklyScraperService();
export { getWeekNumber, getPastWeekDates };
