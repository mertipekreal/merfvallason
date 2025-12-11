/**
 * Live Signal Service
 * Real-time signal generation and WebSocket broadcasting
 * Integrates prediction engine, technical analysis, and SAM metrics
 */

import { Server as HttpServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { db } from '../../../db';
import { liveSignals, notificationTargets, marketPredictions } from '@shared/schema';
import type { LiveSignal, InsertLiveSignal, NotificationTarget } from '@shared/schema';
import { eq, desc, and, gte, lte } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { generatePrediction, type PredictionResult } from './prediction-engine-service';

function getDb() {
  if (!db) throw new Error('Database not initialized');
  return db;
}

export interface SignalUpdate {
  type: 'signal' | 'alert' | 'status' | 'prediction';
  data: LiveSignal | PredictionResult | StatusUpdate;
  timestamp: Date;
}

export interface StatusUpdate {
  connected: boolean;
  activeSignals: number;
  lastUpdate: Date;
  marketStatus: 'open' | 'closed' | 'pre-market' | 'after-hours';
}

export interface SignalFilter {
  symbols?: string[];
  minConfidence?: number;
  signalTypes?: string[];
  sources?: string[];
}

type WebSocketClient = WebSocket & {
  id: string;
  filters: SignalFilter;
  isAlive: boolean;
  subscriptions: Set<string>;
};

class LiveSignalService {
  private wss: WebSocketServer | null = null;
  private clients: Map<string, WebSocketClient> = new Map();
  private signalCheckInterval: NodeJS.Timeout | null = null;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private watchlist: Set<string> = new Set(['SPY', 'QQQ', 'AAPL', 'MSFT', 'NVDA', 'TSLA', 'AMZN', 'GOOGL', 'META']);
  private initialized: boolean = false;

  initialize(httpServer: HttpServer): void {
    // Prevent duplicate initialization
    if (this.initialized) {
      console.log('[LiveSignal] WebSocket server already initialized, skipping');
      return;
    }

    this.wss = new WebSocketServer({ 
      server: httpServer, 
      path: '/ws/signals'
    });
    this.initialized = true;

    this.wss.on('connection', (ws: WebSocket, req) => {
      const client = ws as WebSocketClient;
      client.id = uuidv4();
      client.filters = {};
      client.isAlive = true;
      client.subscriptions = new Set();

      this.clients.set(client.id, client);
      console.log(`[LiveSignal] Client connected: ${client.id}`);

      this.sendToClient(client, {
        type: 'status',
        data: {
          connected: true,
          activeSignals: this.clients.size,
          lastUpdate: new Date(),
          marketStatus: this.getMarketStatus()
        } as StatusUpdate,
        timestamp: new Date()
      });

      client.on('message', (message: Buffer) => {
        try {
          const data = JSON.parse(message.toString());
          this.handleClientMessage(client, data);
        } catch (error) {
          console.error(`[LiveSignal] Error parsing message:`, error);
        }
      });

      client.on('pong', () => {
        client.isAlive = true;
      });

      client.on('close', () => {
        this.clients.delete(client.id);
        console.log(`[LiveSignal] Client disconnected: ${client.id}`);
      });

      client.on('error', (error) => {
        console.error(`[LiveSignal] Client error ${client.id}:`, error);
        this.clients.delete(client.id);
      });
    });

    this.startHeartbeat();
    this.startSignalGeneration();

    console.log('[LiveSignal] WebSocket server initialized on /ws/signals');
  }

  private handleClientMessage(client: WebSocketClient, message: any): void {
    switch (message.type) {
      case 'subscribe':
        if (message.symbols && Array.isArray(message.symbols)) {
          message.symbols.forEach((s: string) => client.subscriptions.add(s.toUpperCase()));
          console.log(`[LiveSignal] Client ${client.id} subscribed to: ${[...client.subscriptions].join(', ')}`);
        }
        break;

      case 'unsubscribe':
        if (message.symbols && Array.isArray(message.symbols)) {
          message.symbols.forEach((s: string) => client.subscriptions.delete(s.toUpperCase()));
        }
        break;

      case 'filter':
        client.filters = {
          symbols: message.symbols,
          minConfidence: message.minConfidence,
          signalTypes: message.signalTypes,
          sources: message.sources
        };
        break;

      case 'watchlist':
        if (message.symbols && Array.isArray(message.symbols)) {
          message.symbols.forEach((s: string) => this.watchlist.add(s.toUpperCase()));
        }
        break;

      case 'request_signals':
        this.sendActiveSignals(client);
        break;

      case 'generate_prediction':
        if (message.symbol) {
          this.generateAndBroadcastPrediction(message.symbol, message.horizonDays || 5);
        }
        break;
    }
  }

  private sendToClient(client: WebSocketClient, update: SignalUpdate): void {
    if (client.readyState === WebSocket.OPEN) {
      try {
        client.send(JSON.stringify(update));
      } catch (error) {
        console.error(`[LiveSignal] Error sending to client ${client.id}:`, error);
      }
    }
  }

  private broadcast(update: SignalUpdate, filter?: SignalFilter): void {
    this.clients.forEach((client) => {
      if (this.shouldSendToClient(client, update, filter)) {
        this.sendToClient(client, update);
      }
    });
  }

  private shouldSendToClient(client: WebSocketClient, update: SignalUpdate, filter?: SignalFilter): boolean {
    const signal = update.data as LiveSignal;
    
    if (client.subscriptions.size > 0 && signal.symbol) {
      if (!client.subscriptions.has(signal.symbol)) return false;
    }

    const clientFilter = client.filters;
    if (clientFilter.symbols && clientFilter.symbols.length > 0) {
      if (signal.symbol && !clientFilter.symbols.includes(signal.symbol)) return false;
    }

    if (clientFilter.minConfidence && signal.confidence) {
      if (signal.confidence < clientFilter.minConfidence) return false;
    }

    if (clientFilter.signalTypes && clientFilter.signalTypes.length > 0) {
      if (signal.signalType && !clientFilter.signalTypes.includes(signal.signalType)) return false;
    }

    return true;
  }

  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      this.clients.forEach((client) => {
        if (!client.isAlive) {
          client.terminate();
          this.clients.delete(client.id);
          return;
        }
        client.isAlive = false;
        client.ping();
      });
    }, 30000);
  }

  private startSignalGeneration(): void {
    this.signalCheckInterval = setInterval(async () => {
      await this.generateSignalsForWatchlist();
    }, 5 * 60 * 1000);

    setTimeout(() => this.generateSignalsForWatchlist(), 10000);
  }

  private async generateSignalsForWatchlist(): Promise<void> {
    const marketStatus = this.getMarketStatus();
    if (marketStatus === 'closed') {
      console.log('[LiveSignal] Market closed, skipping signal generation');
      return;
    }

    console.log(`[LiveSignal] Generating signals for ${this.watchlist.size} symbols...`);

    for (const symbol of this.watchlist) {
      try {
        await this.generateAndBroadcastPrediction(symbol, 5);
        await new Promise(resolve => setTimeout(resolve, 2000));
      } catch (error) {
        console.error(`[LiveSignal] Error generating signal for ${symbol}:`, error);
      }
    }
  }

  private async generateAndBroadcastPrediction(symbol: string, horizonDays: number): Promise<void> {
    try {
      const prediction = await generatePrediction({ symbol, horizonDays });
      
      const signal = await this.createSignalFromPrediction(prediction);
      
      this.broadcast({
        type: 'signal',
        data: signal,
        timestamp: new Date()
      });

      this.broadcast({
        type: 'prediction',
        data: prediction,
        timestamp: new Date()
      });

      console.log(`[LiveSignal] Generated signal for ${symbol}: ${signal.signalType} (${signal.confidence}% confidence)`);
    } catch (error) {
      console.error(`[LiveSignal] Error generating prediction for ${symbol}:`, error);
    }
  }

  private async createSignalFromPrediction(prediction: PredictionResult): Promise<LiveSignal> {
    const signalType = this.determineSignalType(prediction);
    
    const signal: InsertLiveSignal = {
      symbol: prediction.symbol,
      signalType,
      strength: prediction.confidence,
      direction: prediction.direction,
      price: prediction.priceTarget, // Current price would need to be fetched
      targetPrice: prediction.priceTarget,
      stopLoss: this.calculateStopLoss(prediction),
      takeProfit: prediction.priceTarget,
      confidence: prediction.confidence,
      source: 'prediction_engine',
      layerScores: {
        hardData: prediction.layerBreakdown.hardDataScore * 100,
        technical: prediction.layerBreakdown.technicalScore * 100,
        sam: prediction.layerBreakdown.samScore * 100,
        economic: prediction.layerBreakdown.economicScore * 100,
        ml: 0
      },
      keyFactors: [
        ...prediction.keyFactors.bullishFactors.slice(0, 3),
        ...prediction.keyFactors.bearishFactors.slice(0, 2)
      ],
      riskLevel: prediction.riskLevel,
      expiresAt: prediction.targetDate,
      isActive: 1,
      notified: 0
    };

    const id = uuidv4();
    await getDb().insert(liveSignals).values({ id, ...signal });

    return { id, ...signal, createdAt: new Date() } as LiveSignal;
  }

  private determineSignalType(prediction: PredictionResult): string {
    if (prediction.confidence >= 70) {
      return prediction.direction === 'up' ? 'buy' : prediction.direction === 'down' ? 'sell' : 'hold';
    } else if (prediction.confidence >= 50) {
      return 'alert';
    }
    return 'hold';
  }

  private calculateStopLoss(prediction: PredictionResult): number {
    const riskMultiplier = prediction.riskLevel === 'high' ? 0.02 : 
                           prediction.riskLevel === 'medium' ? 0.03 : 0.05;
    
    if (prediction.direction === 'up') {
      return prediction.priceTarget * (1 - riskMultiplier);
    } else {
      return prediction.priceTarget * (1 + riskMultiplier);
    }
  }

  private getMarketStatus(): 'open' | 'closed' | 'pre-market' | 'after-hours' {
    const now = new Date();
    const nyTime = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }));
    const hours = nyTime.getHours();
    const minutes = nyTime.getMinutes();
    const day = nyTime.getDay();

    if (day === 0 || day === 6) return 'closed';

    const timeInMinutes = hours * 60 + minutes;
    
    if (timeInMinutes >= 240 && timeInMinutes < 570) return 'pre-market';
    if (timeInMinutes >= 570 && timeInMinutes < 960) return 'open';
    if (timeInMinutes >= 960 && timeInMinutes < 1200) return 'after-hours';
    
    return 'closed';
  }

  private async sendActiveSignals(client: WebSocketClient): Promise<void> {
    try {
      const now = new Date();
      const signals = await getDb()
        .select()
        .from(liveSignals)
        .where(and(
          eq(liveSignals.isActive, 1),
          gte(liveSignals.expiresAt!, now)
        ))
        .orderBy(desc(liveSignals.createdAt))
        .limit(50);

      signals.forEach(signal => {
        this.sendToClient(client, {
          type: 'signal',
          data: signal,
          timestamp: new Date()
        });
      });
    } catch (error) {
      console.error('[LiveSignal] Error fetching active signals:', error);
    }
  }

  async getActiveSignals(filter?: SignalFilter): Promise<LiveSignal[]> {
    const now = new Date();
    let query = getDb()
      .select()
      .from(liveSignals)
      .where(and(
        eq(liveSignals.isActive, 1),
        gte(liveSignals.expiresAt!, now)
      ))
      .orderBy(desc(liveSignals.createdAt))
      .limit(100);

    const signals = await query;
    
    if (!filter) return signals;

    return signals.filter(signal => {
      if (filter.symbols && filter.symbols.length > 0) {
        if (!filter.symbols.includes(signal.symbol)) return false;
      }
      if (filter.minConfidence && signal.confidence < filter.minConfidence) return false;
      if (filter.signalTypes && filter.signalTypes.length > 0) {
        if (!filter.signalTypes.includes(signal.signalType)) return false;
      }
      if (filter.sources && filter.sources.length > 0) {
        if (!filter.sources.includes(signal.source)) return false;
      }
      return true;
    });
  }

  async getSignalHistory(symbol: string, days: number = 30): Promise<LiveSignal[]> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    return getDb()
      .select()
      .from(liveSignals)
      .where(and(
        eq(liveSignals.symbol, symbol),
        gte(liveSignals.createdAt!, startDate)
      ))
      .orderBy(desc(liveSignals.createdAt));
  }

  async deactivateExpiredSignals(): Promise<number> {
    const now = new Date();
    const result = await getDb()
      .update(liveSignals)
      .set({ isActive: 0 })
      .where(and(
        eq(liveSignals.isActive, 1),
        lte(liveSignals.expiresAt!, now)
      ));

    return 0;
  }

  addToWatchlist(symbols: string[]): void {
    symbols.forEach(s => this.watchlist.add(s.toUpperCase()));
  }

  removeFromWatchlist(symbols: string[]): void {
    symbols.forEach(s => this.watchlist.delete(s.toUpperCase()));
  }

  getWatchlist(): string[] {
    return [...this.watchlist];
  }

  getConnectedClients(): number {
    return this.clients.size;
  }

  broadcastAlert(message: string, severity: 'info' | 'warning' | 'critical'): void {
    this.broadcast({
      type: 'alert',
      data: {
        message,
        severity,
        timestamp: new Date()
      } as any,
      timestamp: new Date()
    });
  }

  shutdown(): void {
    if (this.signalCheckInterval) {
      clearInterval(this.signalCheckInterval);
      this.signalCheckInterval = null;
    }
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
    if (this.wss) {
      this.wss.close();
      this.wss = null;
    }
    this.initialized = false;
    this.clients.clear();
    console.log('[LiveSignal] Service shut down');
  }
}

export const liveSignalService = new LiveSignalService();

export async function addNotificationTarget(
  targetType: string,
  targetId: string,
  filters?: SignalFilter
): Promise<NotificationTarget> {
  const id = uuidv4();
  const target: any = {
    id,
    targetType,
    targetId,
    isActive: 1,
    filters: filters || null
  };

  await getDb().insert(notificationTargets).values(target);

  return target as NotificationTarget;
}

export async function getNotificationTargets(): Promise<NotificationTarget[]> {
  return getDb()
    .select()
    .from(notificationTargets)
    .where(eq(notificationTargets.isActive, 1));
}

export default liveSignalService;
