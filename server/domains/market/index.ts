import { Express } from 'express';
import { marketRouter } from './routes';

export * from './services/adaptive-weight-engine';
export * from './services/backtest-service';
export * from './services/bist-service';
export * from './services/comprehensive-backtest';
export * from './services/dreambank-scraper';
export * from './services/enhanced-signal-combiner';
export * from './services/feature-engineering-service';
export * from './services/fred-service';
export * from './services/historical-data-service';
export * from './services/live-signal-service';
export * from './services/market-analysis-service';
export * from './services/ml-prediction-service';
export * from './services/polygon-service';
export * from './services/portfolio-backtest-service';
export * from './services/portfolio-optimization-service';
export * from './services/prediction-engine-service';
export * from './services/quiver-quant-service';
export * from './services/realtime-market-service';
export * from './services/risk-management-service';
export * from './services/sam-analysis-service';
export * from './services/self-improving-engine';
export * from './services/session-backtest-service';
export * from './services/social-sentiment-service';
export * from './services/technical-analysis-service';
export * from './services/trading-session-service';
export * from './services/unusual-whales-service';

export { marketRouter };

export default function registerMarketDomain(app: Express): void {
  app.use('/api/market-domain', marketRouter);
  console.log('[Market Domain] Initialized with 26 services');
}
