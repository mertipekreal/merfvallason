import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { ExpressAdapter } from '@bull-board/express';
import { Queue } from 'bullmq';
import { db } from './db';
import { bulkJobs } from '@shared/schema';
import { desc, eq } from 'drizzle-orm';

let serverAdapter: ExpressAdapter | null = null;
let bullBoard: ReturnType<typeof createBullBoard> | null = null;

export function setupBullBoard(queue?: Queue): ExpressAdapter {
  serverAdapter = new ExpressAdapter();
  serverAdapter.setBasePath('/admin/queues');

  const queues = queue ? [new BullMQAdapter(queue)] : [];

  bullBoard = createBullBoard({
    queues,
    serverAdapter,
  });

  console.log('[Bull Board] Dashboard initialized at /admin/queues');
  return serverAdapter;
}

export function addQueueToBoard(queue: Queue): void {
  if (bullBoard) {
    bullBoard.addQueue(new BullMQAdapter(queue));
    console.log(`[Bull Board] Added queue: ${queue.name}`);
  }
}

export function getServerAdapter(): ExpressAdapter | null {
  return serverAdapter;
}

export interface JobStats {
  total: number;
  pending: number;
  running: number;
  completed: number;
  failed: number;
  cancelled: number;
}

export interface JobSummary {
  id: string;
  jobType: string;
  status: string;
  progress: number;
  targetCount: number;
  processedCount: number;
  successCount: number;
  errorCount: number;
  createdAt: Date;
  startedAt: Date | null;
  completedAt: Date | null;
  errors: string[];
}

export async function getJobStats(): Promise<JobStats> {
  if (!db) {
    return { total: 0, pending: 0, running: 0, completed: 0, failed: 0, cancelled: 0 };
  }

  const jobs = await db.select().from(bulkJobs);
  
  const stats: JobStats = {
    total: jobs.length,
    pending: 0,
    running: 0,
    completed: 0,
    failed: 0,
    cancelled: 0,
  };

  for (const job of jobs) {
    switch (job.status) {
      case 'pending':
        stats.pending++;
        break;
      case 'running':
        stats.running++;
        break;
      case 'completed':
        stats.completed++;
        break;
      case 'failed':
        stats.failed++;
        break;
      case 'cancelled':
        stats.cancelled++;
        break;
    }
  }

  return stats;
}

export async function getRecentJobs(limit: number = 20): Promise<JobSummary[]> {
  if (!db) {
    return [];
  }

  const jobs = await db.select().from(bulkJobs)
    .orderBy(desc(bulkJobs.createdAt))
    .limit(limit);

  return jobs.map(job => ({
    id: job.id,
    jobType: job.jobType,
    status: job.status,
    progress: job.progress ?? 0,
    targetCount: job.targetCount ?? 0,
    processedCount: job.processedCount ?? 0,
    successCount: job.successCount ?? 0,
    errorCount: job.errorCount ?? 0,
    createdAt: job.createdAt ?? new Date(),
    startedAt: job.startedAt,
    completedAt: job.completedAt,
    errors: job.errors ?? [],
  }));
}

export async function getJobsByType(jobType: string): Promise<JobSummary[]> {
  if (!db) {
    return [];
  }

  const jobs = await db.select().from(bulkJobs)
    .where(eq(bulkJobs.jobType, jobType))
    .orderBy(desc(bulkJobs.createdAt));

  return jobs.map(job => ({
    id: job.id,
    jobType: job.jobType,
    status: job.status,
    progress: job.progress ?? 0,
    targetCount: job.targetCount ?? 0,
    processedCount: job.processedCount ?? 0,
    successCount: job.successCount ?? 0,
    errorCount: job.errorCount ?? 0,
    createdAt: job.createdAt ?? new Date(),
    startedAt: job.startedAt,
    completedAt: job.completedAt,
    errors: job.errors ?? [],
  }));
}

export async function clearCompletedJobs(): Promise<number> {
  if (!db) {
    return 0;
  }

  const result = await db.delete(bulkJobs)
    .where(eq(bulkJobs.status, 'completed'));
  
  return result.rowCount ?? 0;
}

export async function clearFailedJobs(): Promise<number> {
  if (!db) {
    return 0;
  }

  const result = await db.delete(bulkJobs)
    .where(eq(bulkJobs.status, 'failed'));
  
  return result.rowCount ?? 0;
}
