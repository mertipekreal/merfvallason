import { Express } from 'express';
import { coreRouter } from './routes';

export * from './services/gemini-ai-service';
export * from './services/claude-ai-service';
export * from './services/apify-service';
export * from './services/tiktok-bridge';
export * from './services/spotify-service';
export * from './services/spotify-scoring';
export * from './services/analytics-engine';
export * from './services/hybrid-search-service';
export * from './services/memory-service';
export * from './services/automation-service';
export * from './services/feedback-service';
export * from './services/export-service';
export * from './services/weekly-scraper';
export * from './services/huggingface-service';
export * from './services/social-video-service';

export { coreRouter };

export default function registerCoreDomain(app: Express): void {
  app.use('/api/core', coreRouter);
  console.log('[Core Domain] Initialized with 16 services');
}
