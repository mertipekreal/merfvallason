import { Express } from 'express';
import { creativeRouter } from './routes';

export * from './services/canva-service';
export * from './services/chartmetric-service';
export * from './services/creative-engine';
export * from './services/nft-art-service';
export * from './services/nft-genesis-service';
export * from './services/nft-ranking-service';
export * from './services/runway-service';

export { creativeRouter };

export default function registerCreativeDomain(app: Express): void {
  app.use('/api/creative-domain', creativeRouter);
  console.log('[Creative Domain] Initialized with 7 services');
}
