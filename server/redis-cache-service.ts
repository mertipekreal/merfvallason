import { Redis } from '@upstash/redis';

interface CacheConfig {
  ttl?: number;
  prefix?: string;
}

interface CacheStats {
  hits: number;
  misses: number;
  totalRequests: number;
  hitRate: number;
  cachedKeys: number;
  bytesUsed: number;
}

export class RedisCacheService {
  private redis: Redis;
  private stats = { hits: 0, misses: 0 };
  private defaultTTL = 3600;
  private prefix = 'merf:';

  constructor() {
    let url = process.env.UPSTASH_REDIS_REST_URL;
    let token = process.env.UPSTASH_REDIS_REST_TOKEN;

    if (!url || !token) {
      console.warn('⚠️ Redis credentials not found, cache disabled');
      this.redis = null as any;
      return;
    }

    // Auto-detect if values are swapped and fix them
    if (!url.startsWith('https://') && token.startsWith('https://')) {
      console.log('🔄 Redis credentials were swapped, auto-correcting...');
      const temp = url;
      url = token;
      token = temp;
    }

    if (!url.startsWith('https://')) {
      console.warn('⚠️ Invalid Redis URL format (must start with https://), cache disabled');
      this.redis = null as any;
      return;
    }

    try {
      this.redis = new Redis({ url, token });
      console.log('🔴 Redis cache service initialized');
    } catch (error) {
      console.warn('⚠️ Redis initialization failed, cache disabled:', error);
      this.redis = null as any;
    }
  }

  private getKey(key: string): string {
    return `${this.prefix}${key}`;
  }

  async get<T>(key: string): Promise<T | null> {
    if (!this.redis) return null;

    try {
      const fullKey = this.getKey(key);
      const value = await this.redis.get(fullKey);
      
      if (value) {
        this.stats.hits++;
        return value as T;
      } else {
        this.stats.misses++;
        return null;
      }
    } catch (error) {
      console.error('Redis get error:', error);
      this.stats.misses++;
      return null;
    }
  }

  async set<T>(key: string, value: T, ttl?: number): Promise<boolean> {
    if (!this.redis) return false;

    try {
      const fullKey = this.getKey(key);
      const expireTime = ttl || this.defaultTTL;
      await this.redis.set(fullKey, value, { ex: expireTime });
      return true;
    } catch (error) {
      console.error('Redis set error:', error);
      return false;
    }
  }

  async delete(key: string): Promise<boolean> {
    if (!this.redis) return false;

    try {
      const fullKey = this.getKey(key);
      await this.redis.del(fullKey);
      return true;
    } catch (error) {
      console.error('Redis delete error:', error);
      return false;
    }
  }

  async deletePattern(pattern: string): Promise<number> {
    if (!this.redis) return 0;

    try {
      const fullPattern = this.getKey(pattern);
      const keys = await this.redis.keys(fullPattern);
      if (keys.length > 0) {
        await this.redis.del(...keys);
      }
      return keys.length;
    } catch (error) {
      console.error('Redis deletePattern error:', error);
      return 0;
    }
  }

  async getOrSet<T>(
    key: string,
    fetchFn: () => Promise<T>,
    ttl?: number
  ): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    const value = await fetchFn();
    await this.set(key, value, ttl);
    return value;
  }

  async mget<T>(keys: string[]): Promise<(T | null)[]> {
    if (!this.redis || keys.length === 0) return keys.map(() => null);

    try {
      const fullKeys = keys.map(k => this.getKey(k));
      const values = await this.redis.mget(...fullKeys);
      
      for (const v of values) {
        if (v) this.stats.hits++;
        else this.stats.misses++;
      }

      return values as (T | null)[];
    } catch (error) {
      console.error('Redis mget error:', error);
      return keys.map(() => null);
    }
  }

  async mset(pairs: Array<{ key: string; value: any; ttl?: number }>): Promise<boolean> {
    if (!this.redis || pairs.length === 0) return false;

    try {
      const pipeline = this.redis.pipeline();
      
      for (const { key, value, ttl } of pairs) {
        const fullKey = this.getKey(key);
        const expireTime = ttl || this.defaultTTL;
        pipeline.set(fullKey, value, { ex: expireTime });
      }

      await pipeline.exec();
      return true;
    } catch (error) {
      console.error('Redis mset error:', error);
      return false;
    }
  }

  async increment(key: string, amount: number = 1): Promise<number> {
    if (!this.redis) return 0;

    try {
      const fullKey = this.getKey(key);
      return await this.redis.incrby(fullKey, amount);
    } catch (error) {
      console.error('Redis increment error:', error);
      return 0;
    }
  }

  async getStats(): Promise<CacheStats> {
    const totalRequests = this.stats.hits + this.stats.misses;
    const hitRate = totalRequests > 0 ? (this.stats.hits / totalRequests) * 100 : 0;

    let cachedKeys = 0;
    let bytesUsed = 0;

    if (this.redis) {
      try {
        const keys = await this.redis.keys(this.getKey('*'));
        cachedKeys = keys.length;
        
        bytesUsed = cachedKeys * 1024;
      } catch (error) {
        console.error('Redis stats error:', error);
      }
    }

    return {
      hits: this.stats.hits,
      misses: this.stats.misses,
      totalRequests,
      hitRate: Math.round(hitRate * 100) / 100,
      cachedKeys,
      bytesUsed,
    };
  }

  async warmCache(data: Array<{ key: string; value: any; ttl?: number }>): Promise<number> {
    if (!this.redis) return 0;

    const successful = await this.mset(data);
    return successful ? data.length : 0;
  }

  async flush(): Promise<boolean> {
    if (!this.redis) return false;

    try {
      const keys = await this.redis.keys(this.getKey('*'));
      if (keys.length > 0) {
        await this.redis.del(...keys);
      }
      this.stats = { hits: 0, misses: 0 };
      return true;
    } catch (error) {
      console.error('Redis flush error:', error);
      return false;
    }
  }

  async exists(key: string): Promise<boolean> {
    if (!this.redis) return false;

    try {
      const fullKey = this.getKey(key);
      const result = await this.redis.exists(fullKey);
      return result === 1;
    } catch (error) {
      console.error('Redis exists error:', error);
      return false;
    }
  }

  async ttl(key: string): Promise<number> {
    if (!this.redis) return -2;

    try {
      const fullKey = this.getKey(key);
      return await this.redis.ttl(fullKey);
    } catch (error) {
      console.error('Redis ttl error:', error);
      return -2;
    }
  }

  createCacheKey(...parts: (string | number)[]): string {
    return parts.map(p => String(p).toLowerCase().replace(/\s+/g, '_')).join(':');
  }
}

export const redisCacheService = new RedisCacheService();

export const CacheKeys = {
  dreamSearch: (query: string) => `search:dreams:${query}`,
  hybridSearch: (query: string) => `search:hybrid:${query}`,
  memorySearch: (userId: string, query: string) => `memory:${userId}:${query}`,
  trendAnalysis: (platform: string) => `trends:${platform}`,
  dataOverview: () => 'data:overview',
  dreamStats: () => 'dreams:stats',
  spotifyInsights: () => 'spotify:insights',
  toolResult: (toolName: string, args: string) => `tool:${toolName}:${args}`,
  conversation: (sessionId: string) => `conversation:${sessionId}`,
  userMemories: (userId: string) => `memories:${userId}`,
};

export const CacheTTL = {
  short: 60,
  medium: 300,
  long: 3600,
  dataOverview: 300,
  trends: 600,
  search: 120,
  toolResult: 180,
  conversation: 1800,
};
