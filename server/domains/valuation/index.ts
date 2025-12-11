import { Express } from 'express';
import { valuationRouter } from './routes';

export * from './services/dreambank-ingestion';
export * from './services/dream-dejavu-service';
export * from './services/fate-engine';
export * from './services/seed-dreams';

export { valuationRouter };

export default function registerValuationDomain(app: Express): void {
  app.use('/api/valuation-domain', valuationRouter);
  console.log('[Valuation Domain] Initialized with 4 services');
}
