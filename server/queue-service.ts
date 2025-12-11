import { Queue, Worker, Job, QueueEvents } from 'bullmq';
import Redis from 'ioredis';
import { db } from './db';
import { bulkJobs, dreams } from '@shared/schema';
import { eq, count } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { apifyService } from './domains/core/services/apify-service';
import { startFullIngestion, getIngestionProgress } from './domains/valuation/services/dreambank-ingestion';

function getDb() {
  if (!db) throw new Error('Database not initialized');
  return db;
}

let redisConnection: Redis | null = null;
let bulkDataQueue: Queue | null = null;
let bulkDataWorker: Worker | null = null;
let queueEvents: QueueEvents | null = null;

export interface QueueConfig {
  redisUrl?: string;
  redisHost?: string;
  redisPort?: number;
  redisPassword?: string;
}

export function getRedisConnection(): Redis | null {
  return redisConnection;
}

export function isQueueEnabled(): boolean {
  return redisConnection !== null && bulkDataQueue !== null;
}

export async function initializeQueue(config?: QueueConfig): Promise<boolean> {
  // Try Redis Cloud first (paid, more reliable), then fall back to Upstash
  const redisCloudHost = process.env.REDIS_CLOUD_HOST;
  const redisCloudPort = process.env.REDIS_CLOUD_PORT;
  const redisCloudPassword = process.env.REDIS_CLOUD_PASSWORD;
  
  const upstashUrl = config?.redisUrl || process.env.UPSTASH_REDIS_REST_URL;
  
  // Check if Redis Cloud is configured
  if (redisCloudHost && redisCloudPort && redisCloudPassword) {
    try {
      console.log('[Queue] Connecting to Redis Cloud...');
      redisConnection = new Redis({
        host: redisCloudHost,
        port: parseInt(redisCloudPort, 10),
        password: redisCloudPassword,
        maxRetriesPerRequest: null,
        enableReadyCheck: false,
        tls: {},
      });
      
      // Test connection
      await redisConnection.ping();
      console.log('[Queue] ✅ Redis Cloud connected successfully');
      
      return await setupBullMQ();
    } catch (error: any) {
      console.error('[Queue] Redis Cloud connection failed:', error.message);
      redisConnection = null;
    }
  }
  
  // Fallback: check Upstash (REST API - not compatible with BullMQ)
  if (upstashUrl) {
    if (upstashUrl.startsWith('https://')) {
      console.log('[Queue] Upstash REST API detected - BullMQ requires Redis protocol');
      console.log('[Queue] Falling back to database-only job tracking');
      return false;
    }
    
    try {
      redisConnection = new Redis(upstashUrl, {
        maxRetriesPerRequest: null,
        enableReadyCheck: false,
      });
      
      return await setupBullMQ();
    } catch (error) {
      console.error('[Queue] Upstash connection failed:', error);
      redisConnection = null;
      return false;
    }
  }
  
  console.log('[Queue] Redis not configured - using database-only job tracking');
  return false;
}

async function setupBullMQ(): Promise<boolean> {
  if (!redisConnection) return false;
  
  try {

    bulkDataQueue = new Queue('bulk-data-collection', {
      connection: redisConnection,
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 5000,
        },
        removeOnComplete: 100,
        removeOnFail: 500,
      },
    });

    bulkDataWorker = new Worker('bulk-data-collection', processJob, {
      connection: redisConnection,
      concurrency: 2,
    });

    queueEvents = new QueueEvents('bulk-data-collection', {
      connection: redisConnection,
    });

    bulkDataWorker.on('completed', async (job) => {
      console.log(`[Queue] Job ${job.id} completed`);
      await updateJobStatus(job.data.dbJobId, 'completed');
    });

    bulkDataWorker.on('failed', async (job, err) => {
      console.error(`[Queue] Job ${job?.id} failed:`, err.message);
      if (job) {
        await updateJobStatus(job.data.dbJobId, 'failed', [err.message]);
      }
    });

    bulkDataWorker.on('progress', async (job, progress) => {
      if (typeof progress === 'number') {
        await updateJobProgress(job.data.dbJobId, progress);
      }
    });

    console.log('[Queue] BullMQ initialized successfully');
    return true;
  } catch (error) {
    console.error('[Queue] Failed to initialize:', error);
    redisConnection = null;
    bulkDataQueue = null;
    return false;
  }
}

async function processJob(job: Job): Promise<void> {
  const { dbJobId, jobType, targetCount, config } = job.data;
  
  console.log(`[Queue] Processing job ${dbJobId}: ${jobType}`);
  
  await updateJobStatus(dbJobId, 'running');
  
  switch (jobType) {
    case 'tiktok_scrape':
      await processTikTokScrape(job, dbJobId, targetCount, config);
      break;
    case 'instagram_scrape':
      await processInstagramScrape(job, dbJobId, targetCount, config);
      break;
    case 'dreambank_ingest':
      await processDreamBankIngest(job, dbJobId, targetCount, config);
      break;
    default:
      throw new Error(`Unknown job type: ${jobType}`);
  }
}

async function processTikTokScrape(job: Job, dbJobId: string, targetCount: number, config: any): Promise<void> {
  const batchSize = config?.batchSize || 500;
  let processed = 0;
  
  try {
    const results = await apifyService.scrapeByRegion('tiktok', targetCount);
    
    for (const result of results) {
      processed += result.resultsCount || 0;
      const progress = Math.min((processed / targetCount) * 100, 100);
      await job.updateProgress(progress);
      await updateJobCounts(dbJobId, processed, result.resultsCount || 0, 0);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await addJobError(dbJobId, message);
    throw error;
  }
}

async function processInstagramScrape(job: Job, dbJobId: string, targetCount: number, config: any): Promise<void> {
  const batchSize = config?.batchSize || 500;
  let processed = 0;
  
  try {
    const results = await apifyService.scrapeByRegion('instagram', targetCount);
    
    for (const result of results) {
      processed += result.resultsCount || 0;
      const progress = Math.min((processed / targetCount) * 100, 100);
      await job.updateProgress(progress);
      await updateJobCounts(dbJobId, processed, result.resultsCount || 0, 0);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await addJobError(dbJobId, message);
    throw error;
  }
}

async function processDreamBankIngest(job: Job, dbJobId: string, targetCount: number, config: any): Promise<void> {
  // Hugging Face API has a maximum of 100 rows per request
  const batchSize = Math.min(config?.batchSize || 100, 100);
  
  // Get current DreamBank count to skip existing records
  const currentCount = await getDb()
    .select({ count: count() })
    .from(dreams)
    .where(eq(dreams.source, 'dreambank'));
  const startOffset = currentCount[0]?.count || 0;
  
  console.log(`[DreamBank] Current records: ${startOffset}, will start from offset ${startOffset}`);
  
  try {
    startFullIngestion(batchSize, targetCount, startOffset);
    
    let lastProgress = 0;
    const checkInterval = setInterval(async () => {
      const progress = getIngestionProgress();
      if (progress.progress !== lastProgress) {
        lastProgress = progress.progress;
        await job.updateProgress(progress.progress);
        await updateJobCounts(dbJobId, progress.imported, progress.imported, progress.errors.length);
      }
      
      if (progress.status === 'completed' || progress.status === 'error') {
        clearInterval(checkInterval);
      }
    }, 2000);
    
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        clearInterval(checkInterval);
        reject(new Error('DreamBank ingestion timeout'));
      }, 30 * 60 * 1000);
      
      const waitForCompletion = setInterval(() => {
        const progress = getIngestionProgress();
        if (progress.status === 'completed') {
          clearInterval(waitForCompletion);
          clearTimeout(timeout);
          resolve();
        } else if (progress.status === 'error') {
          clearInterval(waitForCompletion);
          clearTimeout(timeout);
          reject(new Error(progress.errors.join(', ')));
        }
      }, 5000);
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await addJobError(dbJobId, message);
    throw error;
  }
}

export async function createBulkJob(
  jobType: string,
  targetCount: number,
  config?: any
): Promise<string> {
  const jobId = uuidv4();
  
  await getDb().insert(bulkJobs).values({
    id: jobId,
    jobType,
    status: 'pending',
    targetCount,
    config,
    errors: [],
  });
  
  if (bulkDataQueue) {
    await bulkDataQueue.add(jobType, {
      dbJobId: jobId,
      jobType,
      targetCount,
      config,
    });
  } else {
    processJobWithoutQueue(jobId, jobType, targetCount, config);
  }
  
  return jobId;
}

async function processJobWithoutQueue(
  jobId: string,
  jobType: string,
  targetCount: number,
  config?: any
): Promise<void> {
  try {
    await updateJobStatus(jobId, 'running');
    
    switch (jobType) {
      case 'tiktok_scrape':
        await processTikTokWithRetry(jobId, targetCount, config);
        break;
      case 'instagram_scrape':
        await processInstagramWithRetry(jobId, targetCount, config);
        break;
      case 'dreambank_ingest':
        await processDreamBankWithRetry(jobId, targetCount, config);
        break;
    }
    
    await updateJobStatus(jobId, 'completed');
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await updateJobStatus(jobId, 'failed', [message]);
  }
}

async function processTikTokWithRetry(jobId: string, targetCount: number, config?: any): Promise<void> {
  let processed = 0;
  let retries = 0;
  const maxRetries = 3;
  
  while (processed < targetCount && retries < maxRetries) {
    try {
      const results = await apifyService.scrapeByRegion('tiktok', Math.min(targetCount - processed, 1000));
      
      for (const result of results) {
        processed += result.resultsCount || 0;
        await updateJobProgress(jobId, (processed / targetCount) * 100);
        await updateJobCounts(jobId, processed, result.resultsCount || 0, 0);
      }
      
      retries = 0;
    } catch (error) {
      retries++;
      const delay = Math.pow(2, retries) * 1000;
      console.log(`[TikTok] Retry ${retries}/${maxRetries} after ${delay}ms`);
      await sleep(delay);
      
      if (retries >= maxRetries) {
        throw error;
      }
    }
  }
}

async function processInstagramWithRetry(jobId: string, targetCount: number, config?: any): Promise<void> {
  let processed = 0;
  let retries = 0;
  const maxRetries = 3;
  
  while (processed < targetCount && retries < maxRetries) {
    try {
      const results = await apifyService.scrapeByRegion('instagram', Math.min(targetCount - processed, 1000));
      
      for (const result of results) {
        processed += result.resultsCount || 0;
        await updateJobProgress(jobId, (processed / targetCount) * 100);
        await updateJobCounts(jobId, processed, result.resultsCount || 0, 0);
      }
      
      retries = 0;
    } catch (error) {
      retries++;
      const delay = Math.pow(2, retries) * 1000;
      console.log(`[Instagram] Retry ${retries}/${maxRetries} after ${delay}ms`);
      await sleep(delay);
      
      if (retries >= maxRetries) {
        throw error;
      }
    }
  }
}

async function processDreamBankWithRetry(jobId: string, targetCount: number, config?: any): Promise<void> {
  // Hugging Face API has a maximum of 100 rows per request
  const batchSize = Math.min(config?.batchSize || 100, 100);
  
  // Get current DreamBank count to skip existing records
  const currentCount = await getDb()
    .select({ count: count() })
    .from(dreams)
    .where(eq(dreams.source, 'dreambank'));
  const startOffset = currentCount[0]?.count || 0;
  
  console.log(`[DreamBank] Current records: ${startOffset}, will start from offset ${startOffset}`);
  
  await updateJobStatus(jobId, 'running');
  
  startFullIngestion(batchSize, targetCount, startOffset);
  
  return new Promise((resolve, reject) => {
    const checkInterval = setInterval(async () => {
      const progress = getIngestionProgress();
      
      await updateJobProgress(jobId, progress.progress);
      await updateJobCounts(jobId, progress.imported, progress.imported, progress.errors.length);
      
      if (progress.status === 'completed') {
        clearInterval(checkInterval);
        resolve();
      } else if (progress.status === 'error') {
        clearInterval(checkInterval);
        reject(new Error(progress.errors.join(', ')));
      }
    }, 3000);
    
    setTimeout(() => {
      clearInterval(checkInterval);
      reject(new Error('DreamBank ingestion timeout (30 min)'));
    }, 30 * 60 * 1000);
  });
}

async function updateJobStatus(jobId: string, status: string, errors?: string[]): Promise<void> {
  const updates: any = { 
    status, 
    updatedAt: new Date() 
  };
  
  if (status === 'running') {
    updates.startedAt = new Date();
  } else if (status === 'completed' || status === 'failed') {
    updates.completedAt = new Date();
  }
  
  if (errors) {
    updates.errors = errors;
  }
  
  await getDb().update(bulkJobs).set(updates).where(eq(bulkJobs.id, jobId));
}

async function updateJobProgress(jobId: string, progress: number): Promise<void> {
  await getDb().update(bulkJobs).set({ 
    progress: Math.min(progress, 100),
    updatedAt: new Date() 
  }).where(eq(bulkJobs.id, jobId));
}

async function updateJobCounts(
  jobId: string, 
  processed: number, 
  success: number, 
  errors: number
): Promise<void> {
  await getDb().update(bulkJobs).set({
    processedCount: processed,
    successCount: success,
    errorCount: errors,
    updatedAt: new Date(),
  }).where(eq(bulkJobs.id, jobId));
}

async function addJobError(jobId: string, error: string): Promise<void> {
  const [job] = await getDb().select().from(bulkJobs).where(eq(bulkJobs.id, jobId));
  if (job) {
    const errors = [...(job.errors || []), error];
    await getDb().update(bulkJobs).set({ 
      errors,
      errorCount: errors.length,
      updatedAt: new Date() 
    }).where(eq(bulkJobs.id, jobId));
  }
}

export async function getActiveJobs(): Promise<any[]> {
  const jobs = await getDb().select().from(bulkJobs)
    .where(eq(bulkJobs.status, 'running'));
  return jobs;
}

export async function getAllJobs(limit: number = 50): Promise<any[]> {
  const jobs = await getDb().select().from(bulkJobs)
    .orderBy(bulkJobs.createdAt)
    .limit(limit);
  return jobs;
}

export async function getJobById(jobId: string): Promise<any | null> {
  const [job] = await getDb().select().from(bulkJobs).where(eq(bulkJobs.id, jobId));
  return job || null;
}

export async function cancelJob(jobId: string): Promise<boolean> {
  const [job] = await getDb().select().from(bulkJobs).where(eq(bulkJobs.id, jobId));
  
  if (!job || job.status !== 'running') {
    return false;
  }
  
  await getDb().update(bulkJobs).set({
    status: 'cancelled',
    completedAt: new Date(),
    updatedAt: new Date(),
  }).where(eq(bulkJobs.id, jobId));
  
  return true;
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function shutdownQueue(): Promise<void> {
  if (bulkDataWorker) {
    await bulkDataWorker.close();
  }
  if (queueEvents) {
    await queueEvents.close();
  }
  if (bulkDataQueue) {
    await bulkDataQueue.close();
  }
  if (redisConnection) {
    await redisConnection.quit();
  }
}
