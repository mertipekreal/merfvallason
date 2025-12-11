import { db, isDatabaseAvailable } from './db';
import {
  automationJobs,
  automationLogs,
  documentedDejavuCases,
  quickDejavuMatches,
  dreams,
  socialVideos,
  dreamMatches,
  AutomationJob,
  AutomationStatus,
  AutomationDashboardStats
} from '@shared/schema';
import { eq, desc, sql, and, gte } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { apifyService } from './apify-service';

function getDb() {
  if (!db) throw new Error('Database not initialized');
  return db;
}

interface AutomationConfig {
  videoScraperRate: number;
  dreamCollectorRate: number;
  dejavuAnalyzerRate: number;
  enableAutoDejavuAnalysis: boolean;
}

const DEFAULT_CONFIG: AutomationConfig = {
  videoScraperRate: 30,
  dreamCollectorRate: 30,
  dejavuAnalyzerRate: 10,
  enableAutoDejavuAnalysis: true,
};

let automationIntervals: Map<string, NodeJS.Timeout> = new Map();
let isInitialized = false;

export async function initializeAutomation(autoStart: boolean = false): Promise<void> {
  if (isInitialized) return;

  console.log('🤖 Initializing 24/7 Automation Service...');

  if (!isDatabaseAvailable()) {
    console.warn('⚠️ Database not available - Automation Service disabled');
    return;
  }

  try {
    const apifyToken = process.env.APIFY_API_TOKEN;
    if (apifyToken) {
      try {
        apifyService.initialize(apifyToken);
        console.log('✅ Apify service initialized for automation');
      } catch (e) {
        console.warn('⚠️ Apify service initialization failed:', e);
      }
    } else {
      console.warn('⚠️ APIFY_API_TOKEN not set, video scraping will be limited');
    }

    await ensureDefaultJobs();
    isInitialized = true;
    console.log('✅ 24/7 Automation Service initialized');

    if (autoStart) {
      await autoStartJobs();
    }
  } catch (error) {
    console.error('❌ Failed to initialize automation:', error);
  }
}

export async function autoStartJobs(): Promise<{ started: number; failed: number }> {
  console.log('🚀 Auto-starting automation jobs...');

  let started = 0;
  let failed = 0;

  try {
    const jobs = await getDb().select().from(automationJobs);

    for (const job of jobs) {
      // Start if: not running in memory OR marked as active in DB (resume after restart)
      if (!automationIntervals.has(job.id)) {
        try {
          const success = await startAutomationJob(job.id);
          if (success) {
            started++;
          } else {
            failed++;
          }
        } catch (e) {
          console.error(`Failed to auto-start job ${job.name}:`, e);
          failed++;
        }
      }
    }

    console.log(`✅ Auto-start complete: ${started} started, ${failed} failed`);
  } catch (error) {
    console.error('Auto-start jobs error:', error);
  }

  return { started, failed };
}

async function ensureDefaultJobs(): Promise<void> {
  const existingJobs = await getDb().select().from(automationJobs);

  const defaultJobs = [
    {
      id: uuidv4(),
      jobType: 'video_scraper' as const,
      name: 'Video Toplayıcı (TikTok, Instagram, Twitter)',
      status: 'paused' as AutomationStatus,
      ratePerMinute: 30,
      platforms: ['tiktok', 'instagram', 'twitter'],
      config: {
        hashtags: ['türkiye', 'viral', 'trend', 'fyp'],
        region: 'both',
        batchSize: 30,
      },
    },
    {
      id: uuidv4(),
      jobType: 'dream_collector' as const,
      name: 'Rüya Toplayıcı (DreamBank)',
      status: 'paused' as AutomationStatus,
      ratePerMinute: 30,
      platforms: ['dreambank'],
      config: {
        batchSize: 30,
        autoDejavuAnalysis: true,
      },
    },
    {
      id: uuidv4(),
      jobType: 'dejavu_analyzer' as const,
      name: 'Otomatik DejaVu Analizci',
      status: 'paused' as AutomationStatus,
      ratePerMinute: 10,
      platforms: [],
      config: {
        autoDejavuAnalysis: true,
      },
    },
  ];

  for (const job of defaultJobs) {
    const exists = existingJobs.find(j => j.jobType === job.jobType);
    if (!exists) {
      await getDb().insert(automationJobs).values(job);
      console.log(`📋 Created default automation job: ${job.name}`);
    }
  }
}

export async function startAutomationJob(jobId: string): Promise<boolean> {
  try {
    const [job] = await getDb().select().from(automationJobs).where(eq(automationJobs.id, jobId));

    if (!job) {
      console.error(`Automation job not found: ${jobId}`);
      return false;
    }

    if (automationIntervals.has(jobId)) {
      console.log(`Job ${job.name} is already running`);
      return false;
    }

    const intervalMs = (60 * 1000) / job.ratePerMinute;

    const interval = setInterval(async () => {
      try {
        await executeAutomationJob(job);
      } catch (error) {
        console.error(`Error in automation job ${job.name}:`, error);
        await updateJobError(jobId, error instanceof Error ? error.message : String(error));
      }
    }, intervalMs);

    automationIntervals.set(jobId, interval);

    await getDb().update(automationJobs).set({
      status: 'active',
      lastRunAt: new Date(),
      updatedAt: new Date(),
      errorMessage: null,
    }).where(eq(automationJobs.id, jobId));

    console.log(`▶️ Started automation job: ${job.name} (${job.ratePerMinute}/min)`);
    return true;
  } catch (error) {
    console.error(`Failed to start automation job ${jobId}:`, error);
    return false;
  }
}

export async function stopAutomationJob(jobId: string): Promise<boolean> {
  try {
    const interval = automationIntervals.get(jobId);
    if (interval) {
      clearInterval(interval);
      automationIntervals.delete(jobId);
    }

    await getDb().update(automationJobs).set({
      status: 'paused',
      updatedAt: new Date(),
    }).where(eq(automationJobs.id, jobId));

    console.log(`⏸️ Stopped automation job: ${jobId}`);
    return true;
  } catch (error) {
    console.error(`Failed to stop automation job ${jobId}:`, error);
    return false;
  }
}

async function executeAutomationJob(job: AutomationJob): Promise<void> {
  const logId = uuidv4();
  const startTime = Date.now();

  try {
    await getDb().insert(automationLogs).values({
      id: logId,
      automationJobId: job.id,
      startedAt: new Date(),
    });

    let result: { processed: number; successful: number; failed: number; dejavuMatches: number } = {
      processed: 0,
      successful: 0,
      failed: 0,
      dejavuMatches: 0,
    };

    switch (job.jobType) {
      case 'video_scraper':
        result = await executeVideoScraper(job);
        break;
      case 'dream_collector':
        result = await executeDreamCollector(job);
        break;
      case 'dejavu_analyzer':
        result = await executeDejavuAnalyzer(job);
        break;
    }

    await getDb().update(automationLogs).set({
      completedAt: new Date(),
      itemsProcessed: result.processed,
      itemsSuccessful: result.successful,
      itemsFailed: result.failed,
      dejavuMatchesFound: result.dejavuMatches,
    }).where(eq(automationLogs.id, logId));

    await updateJobStats(job.id, result);

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    await getDb().update(automationLogs).set({
      completedAt: new Date(),
      errors: [errorMessage],
    }).where(eq(automationLogs.id, logId));

    throw error;
  }
}

async function executeVideoScraper(job: AutomationJob): Promise<{ processed: number; successful: number; failed: number; dejavuMatches: number }> {
  const config = job.config as { hashtags?: string[]; region?: string; batchSize?: number };
  const batchSize = config?.batchSize || 1;

  let processed = 0;
  let successful = 0;
  let failed = 0;

  const platforms = (job.platforms as string[]) || ['tiktok'];

  for (const platform of platforms) {
    try {
      if (platform === 'tiktok' || platform === 'instagram') {
        const results = await apifyService.scrapeByRegion(platform as 'tiktok' | 'instagram', batchSize);
        for (const result of results) {
          processed += result.resultsCount || 0;
          successful += result.resultsCount || 0;
        }
      }
    } catch (error) {
      console.error(`Error scraping ${platform}:`, error);
      failed++;
    }
  }

  return { processed, successful, failed, dejavuMatches: 0 };
}

async function executeDreamCollector(job: AutomationJob): Promise<{ processed: number; successful: number; failed: number; dejavuMatches: number }> {
  const config = job.config as { batchSize?: number; autoDejavuAnalysis?: boolean };
  const batchSize = config?.batchSize || 1;

  let dejavuMatches = 0;

  if (config?.autoDejavuAnalysis) {
    const newDreams = await getDb()
      .select()
      .from(dreams)
      .where(eq(dreams.source, 'dreambank'))
      .orderBy(desc(dreams.dreamDate))
      .limit(batchSize);

    for (const dream of newDreams) {
      const matches = await findQuickDejavuMatches(dream.id);
      dejavuMatches += matches;
    }
  }

  return { processed: batchSize, successful: batchSize, failed: 0, dejavuMatches };
}

async function executeDejavuAnalyzer(job: AutomationJob): Promise<{ processed: number; successful: number; failed: number; dejavuMatches: number }> {
  const unprocessedMatches = await getDb()
    .select()
    .from(quickDejavuMatches)
    .where(eq(quickDejavuMatches.processed, 0))
    .limit(10);

  let processed = 0;
  let successful = 0;
  let failed = 0;
  let dejavuMatches = unprocessedMatches.length;

  for (const match of unprocessedMatches) {
    try {
      await getDb().update(quickDejavuMatches).set({
        processed: 1,
      }).where(eq(quickDejavuMatches.id, match.id));

      processed++;
      successful++;
    } catch (error) {
      failed++;
    }
  }

  return { processed, successful, failed, dejavuMatches };
}

async function findQuickDejavuMatches(dreamId: string): Promise<number> {
  const [dream] = await getDb().select().from(dreams).where(eq(dreams.id, dreamId));
  if (!dream) return 0;

  const documentedCases = await getDb().select().from(documentedDejavuCases);

  let matchCount = 0;

  for (const caseDoc of documentedCases) {
    const dreamText = `${dream.title} ${dream.description}`.toLowerCase();
    const caseText = `${caseDoc.observation} ${caseDoc.scenario || ''}`.toLowerCase();

    const dreamWords = new Set(dreamText.split(/\s+/).filter(w => w.length > 3));
    const caseWords = new Set(caseText.split(/\s+/).filter(w => w.length > 3));

    const intersection = Array.from(dreamWords).filter(w => caseWords.has(w));
    const similarity = intersection.length / Math.max(dreamWords.size, caseWords.size);

    if (similarity > 0.15) {
      await getDb().insert(quickDejavuMatches).values({
        id: uuidv4(),
        dreamId,
        matchedCaseId: caseDoc.id,
        matchType: 'documented_case',
        similarityScore: similarity,
        matchReason: `Ortak motifler: ${intersection.slice(0, 5).join(', ')}`,
        sharedMotifs: intersection.slice(0, 10),
      });
      matchCount++;
    }
  }

  return matchCount;
}

async function updateJobStats(jobId: string, result: { processed: number; successful: number; failed: number }): Promise<void> {
  const [job] = await getDb().select().from(automationJobs).where(eq(automationJobs.id, jobId));
  if (!job) return;

  const currentStats = job.stats as { totalProcessed: number; lastHourProcessed: number; successRate: number; averageLatency: number } || {
    totalProcessed: 0,
    lastHourProcessed: 0,
    successRate: 100,
    averageLatency: 0,
  };

  const newStats = {
    totalProcessed: currentStats.totalProcessed + result.processed,
    lastHourProcessed: currentStats.lastHourProcessed + result.processed,
    successRate: result.processed > 0
      ? ((currentStats.successRate * currentStats.totalProcessed) + (result.successful / result.processed * 100)) / (currentStats.totalProcessed + 1)
      : currentStats.successRate,
    averageLatency: currentStats.averageLatency,
  };

  await getDb().update(automationJobs).set({
    stats: newStats,
    lastRunAt: new Date(),
    updatedAt: new Date(),
  }).where(eq(automationJobs.id, jobId));
}

async function updateJobError(jobId: string, errorMessage: string): Promise<void> {
  await getDb().update(automationJobs).set({
    status: 'error',
    errorMessage,
    updatedAt: new Date(),
  }).where(eq(automationJobs.id, jobId));
}

export async function getAutomationJobs(): Promise<AutomationJob[]> {
  return await getDb().select().from(automationJobs).orderBy(automationJobs.createdAt);
}

export async function getAutomationDashboardStats(): Promise<AutomationDashboardStats> {
  const jobs = await getDb().select().from(automationJobs);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const videosToday = await getDb()
    .select({ count: sql<number>`count(*)` })
    .from(socialVideos)
    .where(gte(socialVideos.createdAt, today));

  const dreamsToday = await getDb()
    .select({ count: sql<number>`count(*)` })
    .from(dreams)
    .where(gte(dreams.createdAt, today));

  const matchesToday = await getDb()
    .select({ count: sql<number>`count(*)` })
    .from(quickDejavuMatches)
    .where(gte(quickDejavuMatches.createdAt, today));

  const videoScraper = jobs.find(j => j.jobType === 'video_scraper');
  const dreamCollector = jobs.find(j => j.jobType === 'dream_collector');
  const dejavuAnalyzer = jobs.find(j => j.jobType === 'dejavu_analyzer');

  const activeCount = jobs.filter(j => j.status === 'active').length;
  const errorCount = jobs.filter(j => j.status === 'error').length;

  let systemHealth: 'healthy' | 'degraded' | 'critical' = 'healthy';
  if (errorCount > 0) systemHealth = 'degraded';
  if (errorCount >= 2) systemHealth = 'critical';

  return {
    videoScraperStatus: (videoScraper?.status || 'paused') as AutomationStatus,
    dreamCollectorStatus: (dreamCollector?.status || 'paused') as AutomationStatus,
    dejavuAnalyzerStatus: (dejavuAnalyzer?.status || 'paused') as AutomationStatus,
    totalVideosToday: Number(videosToday[0]?.count || 0),
    totalDreamsToday: Number(dreamsToday[0]?.count || 0),
    dejavuMatchesToday: Number(matchesToday[0]?.count || 0),
    videosPerMinute: videoScraper?.ratePerMinute || 30,
    dreamsPerMinute: dreamCollector?.ratePerMinute || 30,
    systemHealth,
  };
}

export async function updateAutomationJobConfig(
  jobId: string,
  updates: Partial<{ ratePerMinute: number; platforms: string[]; config: any }>
): Promise<boolean> {
  try {
    await getDb().update(automationJobs).set({
      ...updates,
      updatedAt: new Date(),
    }).where(eq(automationJobs.id, jobId));
    return true;
  } catch (error) {
    console.error('Failed to update automation job:', error);
    return false;
  }
}

export async function seedDocumentedDejavuCases(): Promise<number> {
  const cases = [
    {
      id: uuidv4(),
      caseType: 'medical' as const,
      caseName: 'Sürekli Dejavu (Chronic Déjà Vu)',
      source: 'Dr. Chris Moulin (Leeds Üniversitesi) - 2000\'lerin başı',
      year: '2000',
      observation: '80 yaşındaki eski bir mühendis, gazete okumayı ve televizyon izlemeyi reddediyordu. Doktorlara "Bunların hepsini daha önce gördüm, haberlerin hepsi eski" diyerek şikayette bulunuyordu.',
      significance: 'Bu vaka, dejavunun sadece anlık bir his değil, hafıza devrelerindeki (özellikle şakak lobu) kalıcı bir hata sonucu sürekli bir "hatırlama" döngüsüne dönüşebileceğini kanıtlayan en net tıbbi kayıttır.',
      metadata: { category: 'chronic' },
    },
    {
      id: uuidv4(),
      caseType: 'medical' as const,
      caseName: 'Dostoyevski\'nin Nöbetleri',
      source: 'Fyodor Dostoyevski (Yazar ve Epilepsi Hastası)',
      person: 'Fyodor Dostoyevski',
      observation: 'Yazar, epileptik nöbetlerinden hemen önce gelen o kısacık anda evrensel bir uyum ve "her şeyi daha önce yaşamış olma" hissi (ecstatic aura) duyduğunu not etmiştir.',
      significance: 'Budala (The Idiot) adlı eserinde Prens Mişkin karakteri üzerinden bu deneyimi detaylıca anlatarak, nörolojik bir durumu edebiyat tarihine kazımıştır.',
      metadata: { literary_work: 'The Idiot', character: 'Prince Myshkin' },
    },
    {
      id: uuidv4(),
      caseType: 'historical' as const,
      caseName: 'Louis-Auguste Blanqui\'nin Hipotezi',
      source: 'L\'Éternité par les astres (1872)',
      year: '1872',
      person: 'Louis-Auguste Blanqui',
      observation: 'Fransız devrimci, hapishanedeyken yazdığı metinlerde dejavuyu "sonsuz evrenler teorisi" ile açıklamaya çalışmıştır. Kendi hayatını daha önce sayısız kez yaşadığını iddia etmiştir.',
      significance: 'Dejavunun bilimsel bir açıklamadan çok felsefi ve çoklu evren teorisi bağlamında kaydedildiği ilk modern metinlerden biridir.',
      metadata: { theory: 'multiverse' },
    },
    {
      id: uuidv4(),
      caseType: 'historical' as const,
      caseName: 'Sir Walter Scott Günlüğü',
      source: 'Kişisel Günlük',
      year: '1828',
      person: 'Sir Walter Scott',
      observation: 'Scott günlüğünde, bir akşam yemeği sırasında ani bir hisse kapıldığını yazar: "Nedenini bilmiyorum ama bu sahne, konuşmaların anlamı ve hatta şu anki yerim bana garip bir şekilde tanıdık geliyor; sanki daha önce birebir yaşanmış gibi."',
      significance: 'Tarihteki en net ve samimi kişisel dejavu kayıtlarından biri kabul edilir.',
      analysisNotes: 'Dinner party setting, spontaneous recognition',
    },
    {
      id: uuidv4(),
      caseType: 'literary' as const,
      caseName: 'Charles Dickens - David Copperfield',
      source: 'David Copperfield',
      person: 'Charles Dickens',
      observation: 'Dickens, karakteri üzerinden şu hissi tarif eder: "Hepimizin zaman zaman başına gelen o his; şu an söylediklerimizin, yaptıklarımızın hepsinin uzak bir geçmişte aynen tekrarlandığı hissi..."',
      significance: 'Bu pasaj, dejavu terimi popüler olmadan önce durumu halka en iyi anlatan metin olarak kayıtlara geçmiştir.',
      metadata: { pre_terminology: true },
    },
    {
      id: uuidv4(),
      caseType: 'historical' as const,
      caseName: 'Pythagoras (Pisagor) - Truva Kalkanı',
      source: 'Biyografik Aktarım',
      person: 'Pythagoras',
      observation: 'Pisagor, Hera tapınağında asılı duran bir kalkanı gördüğünde, bunun kendisine Truva Savaşı\'nda (Euphorbus olarak yaşadığı hayatta) ait olduğunu "hatırladığını" iddia etmiştir.',
      significance: 'Bugün dejavu dediğimiz olayın, antik çağlarda "reenkarnasyon hatırası" olarak yorumlandığının en eski örneğidir.',
      metadata: { ancient: true, reincarnation: true },
    },
    {
      id: uuidv4(),
      caseType: 'modern' as const,
      caseName: 'Rüya ile Eşleşme (Dream-Reality Link)',
      source: 'Modern Araştırmalar',
      scenario: 'Kişi, o an yaşadığı olayı aylar önce rüyasında gördüğünü iddia eder.',
      frequency: 'Çok Yüksek',
      observation: 'İnternet forumlarında ve anketlerde en çok kaydedilen türdür. Bir kullanıcı, yeni taşındığı evdeki mutfak tezgahının kırık köşesini gördüğünde, bunu 2 yıl önceki bir rüyasında tamir ettiğini hatırlaması.',
      significance: 'En yaygın dejavu deneyimi tipi - rüya ve gerçeklik arasındaki bağlantı.',
      metadata: { common_type: true, dream_related: true },
    },
    {
      id: uuidv4(),
      caseType: 'modern' as const,
      caseName: 'Yol/Mekan Tanışıklığı (Travel Déjà Vu)',
      source: 'Modern Araştırmalar',
      scenario: 'Hiç gidilmemiş bir şehirde, bir sokağın köşesini dönünce ne çıkacağını bilme durumu.',
      frequency: 'Orta',
      observation: 'Turistlerin Roma veya Paris\'e ilk ziyaretlerinde "Ben bu sokağı biliyorum, şurada bir fırın olmalı" deyip haklı çıkmaları.',
      significance: 'Genellikle filmlerden veya fotoğraflardan gelen bilinçaltı kodlamasıyla açıklanır.',
      analysisNotes: 'Subconscious memory from media exposure',
      metadata: { travel_related: true, media_influence: true },
    },
  ];

  if (!isDatabaseAvailable()) {
    console.warn('⚠️ Database not available - Seeding skipped');
    return 0;
  }

  const existingCases = await getDb().select().from(documentedDejavuCases);

  if (existingCases.length > 0) {
    console.log(`📚 Documented dejavu cases already exist (${existingCases.length} cases)`);
    return existingCases.length;
  }

  for (const caseDoc of cases) {
    await getDb().insert(documentedDejavuCases).values(caseDoc);
  }

  console.log(`📚 Seeded ${cases.length} documented dejavu cases`);
  return cases.length;
}

export async function stopAllAutomation(): Promise<void> {
  const entries = Array.from(automationIntervals.entries());
  for (const [jobId, interval] of entries) {
    clearInterval(interval);
    await getDb().update(automationJobs).set({
      status: 'paused',
      updatedAt: new Date(),
    }).where(eq(automationJobs.id, jobId));
  }
  automationIntervals.clear();
  console.log('⏹️ All automation jobs stopped');
}

export async function getRecentAutomationLogs(limit: number = 50): Promise<any[]> {
  return await getDb()
    .select()
    .from(automationLogs)
    .orderBy(desc(automationLogs.startedAt))
    .limit(limit);
}
