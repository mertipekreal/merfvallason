import { Express } from 'express';

export interface DomainConfig {
  name: string;
  mountPath: string;
  loader: () => Promise<{ default: (app: Express) => void }>;
}

export const domainRegistry: DomainConfig[] = [
  { 
    name: 'core', 
    mountPath: '/api/core', 
    loader: () => import('./core') 
  },
  { 
    name: 'market', 
    mountPath: '/api/market-domain', 
    loader: () => import('./market') 
  },
  { 
    name: 'creative', 
    mountPath: '/api/creative-domain', 
    loader: () => import('./creative') 
  },
  { 
    name: 'valuation', 
    mountPath: '/api/valuation-domain', 
    loader: () => import('./valuation') 
  }
];

export async function loadDomains(app: Express): Promise<void> {
  console.log('[Domains] Starting lazy-load of domain modules...');
  
  for (const domain of domainRegistry) {
    try {
      const module = await domain.loader();
      module.default(app);
      console.log(`[Domains] ${domain.name} domain loaded at ${domain.mountPath}`);
    } catch (error) {
      console.error(`[Domains] Failed to load ${domain.name} domain:`, error);
    }
  }
  
  console.log('[Domains] All domains loaded successfully');
}

export { coreRouter } from './core';
export { marketRouter } from './market';
export { creativeRouter } from './creative';
export { valuationRouter } from './valuation';
