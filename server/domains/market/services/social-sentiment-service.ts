import { ApifyClient } from 'apify-client';

const apifyClient = new ApifyClient({
  token: process.env.APIFY_API_TOKEN,
});

// Service status tracking
// 3-source architecture: Twitter (Apify), Reddit (OAuth), News (Benzinga)
interface ServiceStatus {
  twitter: { available: boolean; lastError?: string; lastSuccess?: Date };
  reddit: { available: boolean; lastError?: string; lastSuccess?: Date };
  news: { available: boolean; lastError?: string; lastSuccess?: Date };
}

let serviceStatus: ServiceStatus = {
  twitter: { available: false, lastError: 'Not initialized - requires Apify tweet-scraper' },
  reddit: { available: false, lastError: 'Requires OAuth 2.0 - register app at reddit.com/prefs/apps, set REDDIT_CLIENT_ID/SECRET' },
  news: { available: false, lastError: 'Not initialized - uses Polygon Benzinga' },
};

// Check Apify token at startup
const APIFY_TOKEN_CONFIGURED = !!process.env.APIFY_API_TOKEN;
if (!APIFY_TOKEN_CONFIGURED) {
  console.log('[Social] Warning: APIFY_API_TOKEN not configured. Twitter scraper will not work.');
  serviceStatus.twitter.lastError = 'APIFY_API_TOKEN not configured';
}

// Check if Apify is available for a given scraper
export function isApifyAvailable(): boolean {
  return APIFY_TOKEN_CONFIGURED;
}

// Get service health status (3-source architecture)
export function getServiceStatus(): ServiceStatus & { summary: string; apifyConfigured: boolean; activeSources: { twitter: boolean; reddit: boolean; news: boolean }; coreSourcesActive: number } {
  const twitterActive = serviceStatus.twitter.available;
  const redditActive = serviceStatus.reddit.available;
  const newsActive = serviceStatus.news.available;
  
  // Core sources = Twitter + News (Reddit is optional)
  const coreSourcesActive = (twitterActive ? 1 : 0) + (newsActive ? 1 : 0);
  
  let summary = '';
  
  if (!APIFY_TOKEN_CONFIGURED) {
    summary = 'APIFY_API_TOKEN missing. Twitter unavailable. News (Benzinga) is primary sentiment source.';
  } else if (coreSourcesActive === 0) {
    summary = 'Social scrapers not yet run. Call POST /api/social/scrape to initialize Twitter + News.';
  } else {
    const activeList: string[] = [];
    if (twitterActive) activeList.push('Twitter');
    if (newsActive) activeList.push('News');
    if (redditActive) activeList.push('Reddit');
    
    summary = `${coreSourcesActive}/2 core sources active: ${activeList.join(', ')}.${!redditActive ? ' Reddit optional (OAuth not configured).' : ''}`;
  }
  
  return { 
    ...serviceStatus, 
    summary, 
    apifyConfigured: APIFY_TOKEN_CONFIGURED, 
    activeSources: { twitter: twitterActive, reddit: redditActive, news: newsActive },
    coreSourcesActive
  };
}

export interface SocialPost {
  platform: 'twitter' | 'reddit' | 'linkedin' | 'news';
  id: string;
  text: string;
  author: string;
  timestamp: Date;
  likes: number;
  shares: number;
  comments: number;
  sentiment: 'bullish' | 'bearish' | 'neutral';
  sentimentScore: number;
  tickers: string[];
  url: string;
}

interface SentimentSummary {
  platform: string;
  totalPosts: number;
  bullish: number;
  bearish: number;
  neutral: number;
  averageSentiment: number;
  topTickers: { ticker: string; mentions: number; sentiment: number }[];
  lastUpdated: Date;
}

// Keyword lists for sentiment analysis
const BULLISH_KEYWORDS = [
  'buy', 'long', 'calls', 'moon', 'rocket', 'bullish', 'breakout', 'rip',
  'pump', 'green', 'tendies', 'gains', 'squeeze', 'hodl', 'diamond hands',
  'to the moon', 'all time high', 'ATH', 'load up', 'accumulate', 'strong',
  'undervalued', 'opportunity', 'yükseliş', 'al', 'artış', 'hedef'
];

const BEARISH_KEYWORDS = [
  'sell', 'short', 'puts', 'dump', 'crash', 'bearish', 'red', 'tank',
  'drop', 'plunge', 'bubble', 'overvalued', 'bag holder', 'paper hands',
  'dead cat', 'correction', 'recession', 'fear', 'panic', 'blood',
  'düşüş', 'sat', 'tehlike', 'risk', 'panik', 'çöküş'
];

const STOCK_TICKERS = [
  'AAPL', 'MSFT', 'GOOGL', 'GOOG', 'AMZN', 'NVDA', 'META', 'TSLA', 'AMD',
  'NFLX', 'INTC', 'CRM', 'ORCL', 'ADBE', 'PYPL', 'UBER', 'COIN', 'PLTR',
  'SPY', 'QQQ', 'IWM', 'DIA', 'VTI', 'VOO', 'ARKK', 'XLF', 'XLE', 'XLK',
  'BTC', 'ETH', 'DOGE', 'SOL'
];

// In-memory cache for sentiment data (3-source architecture)
let sentimentCache: {
  twitter: SocialPost[];
  reddit: SocialPost[];
  news: SocialPost[];
  lastUpdate: { [key: string]: Date };
} = {
  twitter: [],
  reddit: [],
  news: [],
  lastUpdate: {}
};

// Get cached posts for SAM analysis
export function getCachedPosts(): { twitter: SocialPost[]; reddit: SocialPost[]; news: SocialPost[] } {
  return {
    twitter: sentimentCache.twitter,
    reddit: sentimentCache.reddit,
    news: sentimentCache.news
  };
}

// Analyze text for sentiment
function analyzeSentiment(text: string): { sentiment: 'bullish' | 'bearish' | 'neutral'; score: number } {
  const lowerText = text.toLowerCase();
  
  let bullishScore = 0;
  let bearishScore = 0;
  
  BULLISH_KEYWORDS.forEach(keyword => {
    if (lowerText.includes(keyword.toLowerCase())) {
      bullishScore += 1;
    }
  });
  
  BEARISH_KEYWORDS.forEach(keyword => {
    if (lowerText.includes(keyword.toLowerCase())) {
      bearishScore += 1;
    }
  });
  
  // Check for emoji sentiment
  const bullishEmojis = ['🚀', '📈', '💎', '🔥', '💰', '🐂', '✅', '💚', '🟢'];
  const bearishEmojis = ['📉', '🔴', '💀', '🐻', '⚠️', '❌', '🩸', '😱'];
  
  bullishEmojis.forEach(emoji => {
    if (text.includes(emoji)) bullishScore += 0.5;
  });
  
  bearishEmojis.forEach(emoji => {
    if (text.includes(emoji)) bearishScore += 0.5;
  });
  
  const totalScore = bullishScore + bearishScore;
  if (totalScore === 0) {
    return { sentiment: 'neutral', score: 0 };
  }
  
  const netScore = (bullishScore - bearishScore) / totalScore;
  
  if (netScore > 0.2) {
    return { sentiment: 'bullish', score: netScore };
  } else if (netScore < -0.2) {
    return { sentiment: 'bearish', score: netScore };
  }
  return { sentiment: 'neutral', score: netScore };
}

// Extract tickers from text
function extractTickers(text: string): string[] {
  const tickers: string[] = [];
  const upperText = text.toUpperCase();
  
  // Look for $TICKER pattern
  const dollarPattern = /\$([A-Z]{1,5})/g;
  let match;
  while ((match = dollarPattern.exec(upperText)) !== null) {
    if (STOCK_TICKERS.includes(match[1])) {
      tickers.push(match[1]);
    }
  }
  
  // Also check for tickers without $
  STOCK_TICKERS.forEach(ticker => {
    const regex = new RegExp(`\\b${ticker}\\b`, 'i');
    if (regex.test(text) && !tickers.includes(ticker)) {
      tickers.push(ticker);
    }
  });
  
  return Array.from(new Set(tickers));
}

// Scrape X/Twitter for market sentiment - uses selected scraper config
export async function scrapeTwitterSentiment(query: string = 'stock market OR $SPY OR $QQQ OR nasdaq', limit: number = 50): Promise<SocialPost[]> {
  // Use the selected scraper configuration (defined later in file)
  const scraperConfig = getActiveScraperConfig();
  
  try {
    console.log(`[Social] Scraping Twitter with ${scraperConfig.actorId} for: ${query}`);
    
    const run = await apifyClient.actor(scraperConfig.actorId).call(
      scraperConfig.inputFormat(query, limit)
    );
    
    const { items } = await apifyClient.dataset(run.defaultDatasetId).listItems();
    
    const posts: SocialPost[] = items.map((item: any) => {
      const text = item.full_text || item.text || item.tweet_text || '';
      const { sentiment, score } = analyzeSentiment(text);
      return {
        platform: 'twitter' as const,
        id: item.id_str || item.id || item.tweet_id || '',
        text,
        author: item.user?.screen_name || item.username || item.author || 'unknown',
        timestamp: new Date(item.created_at || item.date || Date.now()),
        likes: item.favorite_count || item.likes || 0,
        shares: item.retweet_count || item.retweets || 0,
        comments: item.reply_count || item.replies || 0,
        sentiment,
        sentimentScore: score,
        tickers: extractTickers(text),
        url: item.url || `https://twitter.com/${item.user?.screen_name || item.username}/status/${item.id_str || item.id}`
      };
    });
    
    // Replace cache (no duplicates)
    sentimentCache.twitter = posts;
    sentimentCache.lastUpdate.twitter = new Date();
    serviceStatus.twitter = { available: true, lastSuccess: new Date() };
    
    console.log(`[Social] Twitter scraped: ${posts.length} posts (${scraperConfig.actorId})`);
    return posts;
  } catch (error: any) {
    const errorMsg = error?.message || 'Unknown error';
    console.error('[Social] Twitter scrape error:', errorMsg);
    serviceStatus.twitter = { available: false, lastError: `Apify actor error: ${errorMsg}. Actor: ${scraperConfig.actorId}` };
    // Clear stale cache on failure
    sentimentCache.twitter = [];
    delete sentimentCache.lastUpdate.twitter;
    return [];
  }
}

// Helper to get active scraper config - uses global currentScraper variable
function getActiveScraperConfig(): { actorId: string; costPer1k: number; inputFormat: (query: string, limit: number) => any } {
  // Access scraper configs defined later in file (hoisted)
  const configs: Record<string, { actorId: string; costPer1k: number; inputFormat: (query: string, limit: number) => any }> = {
    'tweet-scraper-v2': {
      actorId: 'apidojo/tweet-scraper',
      costPer1k: 0.30,
      inputFormat: (query: string, limit: number) => ({
        searchTerms: [query],
        maxTweets: limit,
        sort: 'Latest',
        tweetLanguage: 'en',
      })
    },
    'cheapest': {
      actorId: 'kaitoeasyapi/twitter-x-data-tweet-scraper-pay-per-result-cheapest',
      costPer1k: 0.10,
      inputFormat: (query: string, limit: number) => ({
        search_keywords: query,
        max_tweets: limit,
        sort_by: 'Latest',
      })
    },
    'fast-scraper': {
      actorId: 'fastcrawler/tweet-fast-scraper',
      costPer1k: 0.01,
      inputFormat: (query: string, limit: number) => ({
        searchQuery: query,
        maxItems: limit,
        sortBy: 'Latest',
      })
    }
  };
  
  // Use module-level selectedScraper variable
  return configs[selectedScraperType] || configs['tweet-scraper-v2'];
}

// Module-level scraper selection (used by getActiveScraperConfig)
let selectedScraperType: string = 'tweet-scraper-v2';

// Export function to change scraper at module level
export function selectScraper(type: string) {
  if (['tweet-scraper-v2', 'cheapest', 'fast-scraper'].includes(type)) {
    selectedScraperType = type;
    console.log(`[Social] Main scraper set to: ${type}`);
  }
}

// Scrape Reddit for market sentiment using Reddit's free JSON API
// Returns [] and clears cache on any failure (no partial data)
export async function scrapeRedditSentiment(subreddits: string[] = ['wallstreetbets', 'stocks', 'investing', 'options'], limit: number = 50): Promise<SocialPost[]> {
  // Clear cache BEFORE attempting - ensures no stale data leaks
  sentimentCache.reddit = [];
  delete sentimentCache.lastUpdate.reddit;
  
  try {
    console.log(`[Social] Scraping Reddit: ${subreddits.join(', ')}`);
    
    const allPosts: SocialPost[] = [];
    const postsPerSub = Math.ceil(limit / subreddits.length);
    let hasAnyError = false;
    
    // Use Reddit's public JSON API with old.reddit.com (better for scraping)
    for (const subreddit of subreddits) {
      try {
        const response = await fetch(
          `https://old.reddit.com/r/${subreddit}/hot.json?limit=${postsPerSub}&raw_json=1`,
          {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
              'Accept': 'application/json',
              'Accept-Language': 'en-US,en;q=0.9',
            }
          }
        );
        
        if (!response.ok) {
          console.log(`[Social] Reddit API error for r/${subreddit}: ${response.status}`);
          hasAnyError = true;
          continue;
        }
        
        const data = await response.json();
        const children = data?.data?.children || [];
        
        for (const child of children) {
          const post = child.data;
          const fullText = `${post.title || ''} ${post.selftext || ''}`;
          const { sentiment, score } = analyzeSentiment(fullText);
          
          allPosts.push({
            platform: 'reddit' as const,
            id: post.id,
            text: fullText.slice(0, 500),
            author: post.author || 'unknown',
            timestamp: new Date(post.created_utc * 1000),
            likes: post.ups || 0,
            shares: 0,
            comments: post.num_comments || 0,
            sentiment,
            sentimentScore: score,
            tickers: extractTickers(fullText),
            url: `https://reddit.com${post.permalink}`
          });
        }
      } catch (subError) {
        console.log(`[Social] Error fetching r/${subreddit}:`, subError);
        hasAnyError = true;
      }
    }
    
    // Only commit to cache if we got data
    if (allPosts.length > 0) {
      sentimentCache.reddit = allPosts;
      sentimentCache.lastUpdate.reddit = new Date();
      serviceStatus.reddit = { available: true, lastSuccess: new Date() };
      console.log(`[Social] Reddit scraped: ${allPosts.length} posts${hasAnyError ? ' (some subreddits failed)' : ''}`);
      return allPosts;
    } else {
      // No data gathered - mark as unavailable
      serviceStatus.reddit = { available: false, lastError: 'Reddit requires OAuth 2.0 authentication. Register app at reddit.com/prefs/apps' };
      console.log(`[Social] Reddit scrape returned 0 posts`);
      return [];
    }
  } catch (error: any) {
    const errorMsg = error?.message || 'Unknown error';
    console.error('[Social] Reddit scrape error:', errorMsg);
    serviceStatus.reddit = { available: false, lastError: `Reddit API error: ${errorMsg}` };
    return [];
  }
}

// Scrape financial news - uses Polygon Benzinga as primary source (no Apify needed)
export async function scrapeFinancialNews(limit: number = 30): Promise<SocialPost[]> {
  try {
    console.log('[Social] Fetching financial news from Polygon Benzinga...');
    
    // Use Polygon Benzinga API (already configured and working)
    const polygonApiKey = process.env.POLYGON_API_KEY;
    if (!polygonApiKey) {
      throw new Error('POLYGON_API_KEY not configured');
    }
    
    const response = await fetch(
      `https://api.polygon.io/v2/reference/news?limit=${limit}&apiKey=${polygonApiKey}`
    );
    
    if (!response.ok) {
      throw new Error(`Benzinga API error: ${response.status}`);
    }
    
    const data = await response.json();
    const articles = data.results || [];
    
    const posts: SocialPost[] = articles.map((article: any) => {
      const fullText = `${article.title || ''} ${article.description || ''}`;
      const { sentiment, score } = analyzeSentiment(fullText);
      return {
        platform: 'news' as const,
        id: article.id || `news_${Date.now()}`,
        text: fullText,
        author: article.author || article.publisher?.name || 'Benzinga',
        timestamp: new Date(article.published_utc || Date.now()),
        likes: 0,
        shares: 0,
        comments: 0,
        sentiment,
        sentimentScore: score,
        tickers: article.tickers || extractTickers(fullText),
        url: article.article_url
      };
    });
    
    sentimentCache.news = posts;
    sentimentCache.lastUpdate.news = new Date();
    
    if (posts.length > 0) {
      serviceStatus.news = { available: true, lastSuccess: new Date() };
    } else {
      serviceStatus.news = { available: false, lastError: 'Benzinga returned no articles' };
    }
    
    console.log(`[Social] Benzinga news fetched: ${posts.length} articles`);
    return posts;
  } catch (error: any) {
    const errorMsg = error?.message || 'Unknown error';
    console.error('[Social] News fetch error:', errorMsg);
    serviceStatus.news = { available: false, lastError: `Benzinga error: ${errorMsg}` };
    // Clear stale cache on failure to prevent old data from affecting combined sentiment
    sentimentCache.news = [];
    delete sentimentCache.lastUpdate.news;
    return [];
  }
}

// Get aggregated sentiment summary
export function getSentimentSummary(): { [platform: string]: SentimentSummary } {
  const summaries: { [platform: string]: SentimentSummary } = {};
  
  const platforms = ['twitter', 'reddit', 'news'] as const;
  
  platforms.forEach(platform => {
    const posts = sentimentCache[platform];
    const tickerMentions: { [ticker: string]: { count: number; totalSentiment: number } } = {};
    
    let bullish = 0, bearish = 0, neutral = 0;
    let totalSentiment = 0;
    
    posts.forEach(post => {
      if (post.sentiment === 'bullish') bullish++;
      else if (post.sentiment === 'bearish') bearish++;
      else neutral++;
      
      totalSentiment += post.sentimentScore;
      
      post.tickers.forEach(ticker => {
        if (!tickerMentions[ticker]) {
          tickerMentions[ticker] = { count: 0, totalSentiment: 0 };
        }
        tickerMentions[ticker].count++;
        tickerMentions[ticker].totalSentiment += post.sentimentScore;
      });
    });
    
    const topTickers = Object.entries(tickerMentions)
      .map(([ticker, data]) => ({
        ticker,
        mentions: data.count,
        sentiment: data.count > 0 ? data.totalSentiment / data.count : 0
      }))
      .sort((a, b) => b.mentions - a.mentions)
      .slice(0, 10);
    
    summaries[platform] = {
      platform,
      totalPosts: posts.length,
      bullish,
      bearish,
      neutral,
      averageSentiment: posts.length > 0 ? totalSentiment / posts.length : 0,
      topTickers,
      lastUpdated: sentimentCache.lastUpdate[platform] || new Date()
    };
  });
  
  return summaries;
}

// Get combined market sentiment score
// Can optionally accept fresh results to avoid stale cache
export function getCombinedSentiment(freshResults?: { twitter?: SocialPost[]; reddit?: SocialPost[]; news?: SocialPost[] }): {
  overallSentiment: number;
  direction: 'bullish' | 'bearish' | 'neutral';
  confidence: number;
  breakdown: { platform: string; sentiment: number; weight: number; active: boolean }[];
  activeSources: number;
} {
  // Use fresh results if provided, otherwise fall back to cache
  const data = {
    twitter: freshResults?.twitter ?? sentimentCache.twitter,
    reddit: freshResults?.reddit ?? sentimentCache.reddit,
    news: freshResults?.news ?? sentimentCache.news
  };
  
  // Build summaries from the provided data (not global cache)
  const summaries: { [platform: string]: SentimentSummary } = {};
  const platforms = ['twitter', 'reddit', 'news'] as const;
  
  platforms.forEach(platform => {
    const posts = data[platform];
    let bullish = 0, bearish = 0, neutral = 0;
    let totalSentiment = 0;
    
    posts.forEach(post => {
      if (post.sentiment === 'bullish') bullish++;
      else if (post.sentiment === 'bearish') bearish++;
      else neutral++;
      totalSentiment += post.sentimentScore;
    });
    
    summaries[platform] = {
      platform,
      totalPosts: posts.length,
      bullish,
      bearish,
      neutral,
      averageSentiment: posts.length > 0 ? totalSentiment / posts.length : 0,
      topTickers: [],
      lastUpdated: new Date()
    };
  });
  
  // Base weights for each platform (will be renormalized based on active sources)
  const baseWeights = {
    twitter: 0.40,   // High volume, real-time
    reddit: 0.30,    // Strong retail sentiment (optional)
    news: 0.30       // Institutional focus, Benzinga
  };
  
  const breakdown: { platform: string; sentiment: number; weight: number; active: boolean }[] = [];
  let weightedSum = 0;
  let totalWeight = 0;
  let activeSources = 0;
  
  // Only include platforms that have data - renormalize weights dynamically
  Object.entries(summaries).forEach(([platform, summary]) => {
    const isActive = summary.totalPosts > 0;
    const baseWeight = baseWeights[platform as keyof typeof baseWeights] || 0;
    
    if (isActive) {
      totalWeight += baseWeight;
      activeSources++;
    }
  });
  
  // Now calculate normalized sentiment using only active sources
  Object.entries(summaries).forEach(([platform, summary]) => {
    const isActive = summary.totalPosts > 0;
    const baseWeight = baseWeights[platform as keyof typeof baseWeights] || 0;
    
    // Renormalize weight: if total active weight is 0.7, and this platform is 0.4, new weight = 0.4/0.7 = 0.57
    const normalizedWeight = totalWeight > 0 && isActive ? baseWeight / totalWeight : 0;
    
    if (isActive) {
      weightedSum += summary.averageSentiment * normalizedWeight;
    }
    
    breakdown.push({
      platform,
      sentiment: summary.averageSentiment,
      weight: normalizedWeight,
      active: isActive
    });
  });
  
  const overallSentiment = totalWeight > 0 ? weightedSum : 0;
  
  let direction: 'bullish' | 'bearish' | 'neutral' = 'neutral';
  if (overallSentiment > 0.15) direction = 'bullish';
  else if (overallSentiment < -0.15) direction = 'bearish';
  
  // Confidence based on data volume, consensus, and source coverage
  const totalPosts = Object.values(summaries).reduce((sum, s) => sum + s.totalPosts, 0);
  const consensus = Math.abs(overallSentiment);
  const sourceCoverage = activeSources / 3; // 3 possible sources
  const confidence = Math.min(0.95, 0.2 + (totalPosts / 200) * 0.25 + consensus * 0.30 + sourceCoverage * 0.20);
  
  return {
    overallSentiment,
    direction,
    confidence,
    breakdown,
    activeSources
  };
}

// Scrape all sources (3-source architecture)
export async function scrapeAllSources(): Promise<{
  twitter: SocialPost[];
  reddit: SocialPost[];
  news: SocialPost[];
  summary: ReturnType<typeof getSentimentSummary>;
  combined: ReturnType<typeof getCombinedSentiment>;
}> {
  console.log('[Social] Starting full social media scrape (3-source architecture)...');
  
  // Run core scrapers (Twitter + News) in parallel - Reddit is optional
  const [twitter, news] = await Promise.all([
    APIFY_TOKEN_CONFIGURED 
      ? scrapeTwitterSentiment('stock market OR $SPY OR $QQQ OR nasdaq OR wall street', 50)
      : Promise.resolve([]),
    scrapeFinancialNews(30)
  ]);
  
  // Reddit is optional - wrapped in try/catch since it requires OAuth
  let reddit: SocialPost[] = [];
  try {
    reddit = await scrapeRedditSentiment(['wallstreetbets', 'stocks', 'investing', 'options'], 50);
  } catch (err: any) {
    console.log('[Social] Reddit scrape skipped (OAuth not configured):', err?.message || 'unknown error');
  }
  
  return {
    twitter,
    reddit,
    news,
    summary: getSentimentSummary(),
    combined: getCombinedSentiment()
  };
}

// Get ticker-specific sentiment
export function getTickerSentiment(ticker: string): {
  ticker: string;
  mentions: number;
  sentiment: number;
  direction: 'bullish' | 'bearish' | 'neutral';
  posts: SocialPost[];
} {
  const allPosts = [
    ...sentimentCache.twitter,
    ...sentimentCache.reddit,
    ...sentimentCache.news
  ];
  
  const tickerPosts = allPosts.filter(p => p.tickers.includes(ticker.toUpperCase()));
  
  const totalSentiment = tickerPosts.reduce((sum, p) => sum + p.sentimentScore, 0);
  const avgSentiment = tickerPosts.length > 0 ? totalSentiment / tickerPosts.length : 0;
  
  let direction: 'bullish' | 'bearish' | 'neutral' = 'neutral';
  if (avgSentiment > 0.15) direction = 'bullish';
  else if (avgSentiment < -0.15) direction = 'bearish';
  
  return {
    ticker: ticker.toUpperCase(),
    mentions: tickerPosts.length,
    sentiment: avgSentiment,
    direction,
    posts: tickerPosts.slice(0, 20)
  };
}

// Get cached data (without scraping)
export function getCachedSentiment() {
  return {
    twitter: sentimentCache.twitter,
    reddit: sentimentCache.reddit,
    news: sentimentCache.news,
    lastUpdate: sentimentCache.lastUpdate,
    summary: getSentimentSummary(),
    combined: getCombinedSentiment()
  };
}

// Auto-refresh daemon (runs every 15 minutes during market hours)
let refreshInterval: NodeJS.Timeout | null = null;

export function startAutoRefresh(intervalMinutes: number = 15) {
  if (refreshInterval) {
    clearInterval(refreshInterval);
  }
  
  console.log(`[Social] Starting auto-refresh every ${intervalMinutes} minutes`);
  
  refreshInterval = setInterval(async () => {
    const now = new Date();
    const hour = now.getUTCHours();
    const day = now.getUTCDay();
    
    // Only during US market hours (9:30 AM - 4:00 PM ET = 14:30 - 21:00 UTC)
    // Monday to Friday
    if (day >= 1 && day <= 5 && hour >= 13 && hour <= 21) {
      console.log('[Social] Auto-refreshing social sentiment data...');
      await scrapeAllSources();
    }
  }, intervalMinutes * 60 * 1000);
}

export function stopAutoRefresh() {
  if (refreshInterval) {
    clearInterval(refreshInterval);
    refreshInterval = null;
    console.log('[Social] Auto-refresh stopped');
  }
}

// ============================================================================
// ADVANCED TWITTER/X FEATURES - Based on Twitter Algorithm Analysis
// ============================================================================

// Scraper options for cost optimization
type ScraperType = 'tweet-scraper-v2' | 'cheapest' | 'fast-scraper';

interface ScraperConfig {
  actorId: string;
  costPer1k: number;
  maxConcurrent: number;
  inputFormat: (query: string, limit: number) => any;
}

const SCRAPER_CONFIGS: Record<ScraperType, ScraperConfig> = {
  'tweet-scraper-v2': {
    actorId: 'apidojo/tweet-scraper',
    costPer1k: 0.30,
    maxConcurrent: 20,
    inputFormat: (query, limit) => ({
      searchTerms: [query],
      maxTweets: limit,
      sort: 'Latest',
      tweetLanguage: 'en',
    })
  },
  'cheapest': {
    actorId: 'kaitoeasyapi/twitter-x-data-tweet-scraper-pay-per-result-cheapest',
    costPer1k: 0.10,
    maxConcurrent: 50,
    inputFormat: (query, limit) => ({
      search_keywords: query,
      max_tweets: limit,
      sort_by: 'Latest',
    })
  },
  'fast-scraper': {
    actorId: 'fastcrawler/tweet-fast-scraper',
    costPer1k: 0.01,
    maxConcurrent: 100,
    inputFormat: (query, limit) => ({
      searchQuery: query,
      maxItems: limit,
      sortBy: 'Latest',
    })
  }
};

// Current scraper preference
let currentScraper: ScraperType = 'tweet-scraper-v2';

export function setScraperType(type: ScraperType) {
  currentScraper = type;
  selectedScraperType = type; // Also update module-level for scrapeTwitterSentiment
  console.log(`[Social] Switched to ${type} scraper (${SCRAPER_CONFIGS[type].costPer1k}$/1K tweets)`);
}

export function getScraperInfo() {
  const config = SCRAPER_CONFIGS[currentScraper];
  return {
    current: currentScraper,
    costPer1k: config.costPer1k,
    maxConcurrent: config.maxConcurrent,
    actorId: config.actorId,
    availableScrapers: Object.keys(SCRAPER_CONFIGS)
  };
}

// Scrape with selected scraper (cost-optimized)
export async function scrapeTwitterOptimized(query: string, limit: number = 100, scraperType?: ScraperType): Promise<SocialPost[]> {
  const config = SCRAPER_CONFIGS[scraperType || currentScraper];
  
  try {
    console.log(`[Social] Scraping Twitter with ${scraperType || currentScraper}: ${query} (limit: ${limit})`);
    
    const run = await apifyClient.actor(config.actorId).call(config.inputFormat(query, limit));
    const { items } = await apifyClient.dataset(run.defaultDatasetId).listItems();
    
    const posts: SocialPost[] = items.map((item: any) => {
      const text = item.full_text || item.text || item.tweet_text || '';
      const { sentiment, score } = analyzeSentiment(text);
      return {
        platform: 'twitter' as const,
        id: item.id_str || item.id || item.tweet_id || '',
        text,
        author: item.user?.screen_name || item.username || item.author || 'unknown',
        timestamp: new Date(item.created_at || item.date || Date.now()),
        likes: item.favorite_count || item.likes || 0,
        shares: item.retweet_count || item.retweets || 0,
        comments: item.reply_count || item.replies || 0,
        sentiment,
        sentimentScore: score,
        tickers: extractTickers(text),
        url: item.url || `https://twitter.com/${item.user?.screen_name || item.username}/status/${item.id_str || item.id}`
      };
    });
    
    // Return posts (don't modify cache here - let bulk handle it)
    console.log(`[Social] Twitter optimized scraped: ${posts.length} posts`);
    return posts;
  } catch (error: any) {
    console.error(`[Social] Twitter optimized scrape error:`, error?.message);
    throw error;
  }
}

// Dedupe posts by ID
function dedupePostsById(posts: SocialPost[]): SocialPost[] {
  const seen = new Set<string>();
  return posts.filter(post => {
    if (seen.has(post.id)) return false;
    seen.add(post.id);
    return true;
  });
}

// Max cache size to prevent memory issues
const MAX_CACHE_SIZE = 5000;

// Bulk scrape with parallel actors (for high volume - uses your 148 concurrent actor capacity)
export async function bulkScrapeTwitter(
  queries: string[],
  tweetsPerQuery: number = 500,
  maxConcurrent: number = 20
): Promise<{ totalTweets: number; estimatedCost: number; posts: SocialPost[]; duration: number; warnings: string[] }> {
  const startTime = Date.now();
  const config = SCRAPER_CONFIGS[currentScraper];
  const allPosts: SocialPost[] = [];
  const warnings: string[] = [];
  
  console.log(`[Social] Bulk scrape starting: ${queries.length} queries, ${tweetsPerQuery} tweets each, ${maxConcurrent} concurrent`);
  
  // Process in batches
  const batchSize = Math.min(maxConcurrent, config.maxConcurrent);
  for (let i = 0; i < queries.length; i += batchSize) {
    const batch = queries.slice(i, i + batchSize);
    
    const promises = batch.map(async (query) => {
      try {
        return await scrapeTwitterOptimized(query, tweetsPerQuery, currentScraper);
      } catch (err) {
        console.error(`[Social] Failed to scrape: ${query}`);
        return [];
      }
    });
    
    const results = await Promise.all(promises);
    results.forEach(posts => allPosts.push(...posts));
    
    console.log(`[Social] Bulk scrape progress: ${Math.min(i + batchSize, queries.length)}/${queries.length} queries completed`);
  }
  
  const duration = (Date.now() - startTime) / 1000;
  
  // Dedupe posts by ID
  const dedupedPosts = dedupePostsById(allPosts);
  if (dedupedPosts.length < allPosts.length) {
    warnings.push(`Removed ${allPosts.length - dedupedPosts.length} duplicate posts`);
  }
  
  // Cap cache size to prevent memory issues
  const cappedPosts = dedupedPosts.slice(0, MAX_CACHE_SIZE);
  if (cappedPosts.length < dedupedPosts.length) {
    warnings.push(`Cache capped at ${MAX_CACHE_SIZE} posts (${dedupedPosts.length - MAX_CACHE_SIZE} dropped)`);
  }
  
  const estimatedCost = (cappedPosts.length / 1000) * config.costPer1k;
  
  // Replace cache with deduped, capped posts
  sentimentCache.twitter = cappedPosts;
  sentimentCache.lastUpdate.twitter = new Date();
  serviceStatus.twitter = { available: true, lastSuccess: new Date() };
  
  console.log(`[Social] Bulk scrape complete: ${cappedPosts.length} unique posts, $${estimatedCost.toFixed(2)} estimated cost`);
  
  return {
    totalTweets: cappedPosts.length,
    estimatedCost,
    posts: cappedPosts,
    duration,
    warnings
  };
}

// ============================================================================
// VIRAL PREDICTION SYSTEM - Based on Twitter Algorithm's Engagement Signals
// ============================================================================

interface ViralMetrics {
  engagementRate: number;       // (likes + retweets + replies) / impressions estimate
  velocityScore: number;        // Engagement speed in first 30 min
  amplificationRatio: number;   // Retweets / Likes ratio (higher = more viral)
  replyRatio: number;           // Replies / Likes ratio (higher = controversial)
  viralProbability: number;     // 0-1 probability of going viral
  prediction: 'viral' | 'moderate' | 'low';
}

export function analyzeViralPotential(post: SocialPost): ViralMetrics {
  const likes = post.likes || 0;
  const shares = post.shares || 0;
  const comments = post.comments || 0;
  
  // Estimate impressions based on engagement (typical 2-5% engagement rate)
  const estimatedImpressions = Math.max((likes + shares + comments) * 30, 100);
  
  const engagementRate = (likes + shares + comments) / estimatedImpressions;
  
  // Amplification ratio (retweets vs likes) - viral content gets more shares
  const amplificationRatio = likes > 0 ? shares / likes : 0;
  
  // Reply ratio - controversial content gets more replies
  const replyRatio = likes > 0 ? comments / likes : 0;
  
  // Time-based velocity (simplified - assume recent posts)
  const postAge = (Date.now() - new Date(post.timestamp).getTime()) / (1000 * 60); // minutes
  const velocityScore = postAge > 0 ? (likes + shares * 2) / Math.max(postAge, 1) : 0;
  
  // Calculate viral probability using Twitter's signals
  let viralScore = 0;
  
  // High engagement rate is key
  viralScore += Math.min(engagementRate * 10, 0.3);
  
  // High amplification ratio indicates shareability
  viralScore += Math.min(amplificationRatio * 2, 0.25);
  
  // Moderate controversy (replies) helps, too much hurts
  viralScore += replyRatio > 0.5 && replyRatio < 2 ? 0.15 : 0;
  
  // Velocity is crucial for viral spread
  viralScore += Math.min(velocityScore / 100, 0.3);
  
  const viralProbability = Math.min(Math.max(viralScore, 0), 1);
  
  let prediction: 'viral' | 'moderate' | 'low' = 'low';
  if (viralProbability > 0.6) prediction = 'viral';
  else if (viralProbability > 0.3) prediction = 'moderate';
  
  return {
    engagementRate,
    velocityScore,
    amplificationRatio,
    replyRatio,
    viralProbability,
    prediction
  };
}

// Analyze all cached posts for viral potential
export function getViralTrends(): {
  viralPosts: (SocialPost & { viralMetrics: ViralMetrics })[];
  trendingTickers: { ticker: string; viralScore: number; posts: number }[];
  overallViralIndex: number;
} {
  const allPosts = [...sentimentCache.twitter];
  
  const postsWithMetrics = allPosts.map(post => ({
    ...post,
    viralMetrics: analyzeViralPotential(post)
  }));
  
  // Sort by viral probability
  const viralPosts = postsWithMetrics
    .filter(p => p.viralMetrics.viralProbability > 0.3)
    .sort((a, b) => b.viralMetrics.viralProbability - a.viralMetrics.viralProbability)
    .slice(0, 20);
  
  // Calculate viral score by ticker
  const tickerViralScores: Record<string, { totalViralScore: number; count: number }> = {};
  
  postsWithMetrics.forEach(post => {
    post.tickers.forEach(ticker => {
      if (!tickerViralScores[ticker]) {
        tickerViralScores[ticker] = { totalViralScore: 0, count: 0 };
      }
      tickerViralScores[ticker].totalViralScore += post.viralMetrics.viralProbability;
      tickerViralScores[ticker].count++;
    });
  });
  
  const trendingTickers = Object.entries(tickerViralScores)
    .map(([ticker, data]) => ({
      ticker,
      viralScore: data.totalViralScore / data.count,
      posts: data.count
    }))
    .sort((a, b) => b.viralScore - a.viralScore)
    .slice(0, 10);
  
  // Overall viral index
  const overallViralIndex = postsWithMetrics.length > 0 
    ? postsWithMetrics.reduce((sum, p) => sum + p.viralMetrics.viralProbability, 0) / postsWithMetrics.length
    : 0;
  
  return { viralPosts, trendingTickers, overallViralIndex };
}

// ============================================================================
// INFLUENCER WEIGHTED SENTIMENT - Whale/Influencer Tracking
// ============================================================================

interface InfluencerProfile {
  username: string;
  followerCount: number;
  influenceScore: number; // 0-100
  category: 'whale' | 'analyst' | 'trader' | 'news' | 'general';
  historicalAccuracy?: number;
}

// Known finance influencers (can be expanded via API)
const KNOWN_INFLUENCERS: InfluencerProfile[] = [
  { username: 'elonmusk', followerCount: 150000000, influenceScore: 95, category: 'whale' },
  { username: 'jimcramer', followerCount: 2000000, influenceScore: 70, category: 'analyst' },
  { username: 'chaikinemoney', followerCount: 300000, influenceScore: 65, category: 'analyst' },
  { username: 'unusual_whales', followerCount: 800000, influenceScore: 80, category: 'trader' },
  { username: 'Workicejobs', followerCount: 200000, influenceScore: 60, category: 'trader' },
  { username: 'dikidrader', followerCount: 500000, influenceScore: 75, category: 'trader' },
];

// Calculate influence weight for a user
function calculateInfluenceWeight(author: string, likes: number, shares: number): number {
  // Check if known influencer
  const influencer = KNOWN_INFLUENCERS.find(i => 
    i.username.toLowerCase() === author.toLowerCase()
  );
  
  if (influencer) {
    return influencer.influenceScore / 100;
  }
  
  // Estimate influence from engagement
  const engagementScore = Math.log10(Math.max(likes + shares * 2, 1) + 1) / 5;
  return Math.min(engagementScore, 0.5); // Cap at 0.5 for non-influencers
}

// Get influencer-weighted sentiment
export function getInfluencerWeightedSentiment(): {
  weightedSentiment: number;
  direction: 'bullish' | 'bearish' | 'neutral';
  influencerPosts: (SocialPost & { influenceWeight: number })[];
  topInfluencerSentiments: { username: string; sentiment: number; weight: number; posts: number }[];
  whaleActivity: { bulls: number; bears: number; neutral: number };
} {
  const allPosts = [...sentimentCache.twitter];
  
  // Add influence weight to each post
  const postsWithWeight = allPosts.map(post => ({
    ...post,
    influenceWeight: calculateInfluenceWeight(post.author, post.likes, post.shares)
  }));
  
  // Calculate weighted sentiment
  let totalWeight = 0;
  let weightedSum = 0;
  
  postsWithWeight.forEach(post => {
    const weight = post.influenceWeight;
    weightedSum += post.sentimentScore * weight;
    totalWeight += weight;
  });
  
  const weightedSentiment = totalWeight > 0 ? weightedSum / totalWeight : 0;
  
  // Determine direction
  let direction: 'bullish' | 'bearish' | 'neutral' = 'neutral';
  if (weightedSentiment > 0.15) direction = 'bullish';
  else if (weightedSentiment < -0.15) direction = 'bearish';
  
  // Get top influencer posts
  const influencerPosts = postsWithWeight
    .filter(p => p.influenceWeight > 0.3)
    .sort((a, b) => b.influenceWeight - a.influenceWeight)
    .slice(0, 20);
  
  // Aggregate by influencer
  const influencerStats: Record<string, { totalSentiment: number; totalWeight: number; count: number }> = {};
  
  postsWithWeight.forEach(post => {
    if (post.influenceWeight > 0.3) {
      if (!influencerStats[post.author]) {
        influencerStats[post.author] = { totalSentiment: 0, totalWeight: 0, count: 0 };
      }
      influencerStats[post.author].totalSentiment += post.sentimentScore;
      influencerStats[post.author].totalWeight += post.influenceWeight;
      influencerStats[post.author].count++;
    }
  });
  
  const topInfluencerSentiments = Object.entries(influencerStats)
    .map(([username, stats]) => ({
      username,
      sentiment: stats.totalSentiment / stats.count,
      weight: stats.totalWeight / stats.count,
      posts: stats.count
    }))
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 10);
  
  // Whale activity (high influence posts)
  const whales = postsWithWeight.filter(p => p.influenceWeight > 0.5);
  const whaleActivity = {
    bulls: whales.filter(p => p.sentiment === 'bullish').length,
    bears: whales.filter(p => p.sentiment === 'bearish').length,
    neutral: whales.filter(p => p.sentiment === 'neutral').length
  };
  
  return {
    weightedSentiment,
    direction,
    influencerPosts,
    topInfluencerSentiments,
    whaleActivity
  };
}

// ============================================================================
// SIMCLUSTERS-LIKE COMMUNITY DETECTION
// Based on Twitter's SimClusters algorithm for topic/community embeddings
// ============================================================================

interface CommunityCluster {
  id: string;
  name: string;
  keywords: string[];
  posts: SocialPost[];
  sentiment: number;
  momentum: 'rising' | 'falling' | 'stable';
  memberCount: number;
}

// Define community clusters based on Twitter's approach
const COMMUNITY_KEYWORDS: Record<string, string[]> = {
  'tech_growth': ['NVDA', 'AMD', 'MSFT', 'GOOGL', 'META', 'AI', 'tech', 'growth', 'innovation'],
  'ev_clean_energy': ['TSLA', 'RIVN', 'LCID', 'EV', 'electric', 'solar', 'clean energy', 'battery'],
  'meme_stocks': ['GME', 'AMC', 'BBBY', 'squeeze', 'apes', 'diamond hands', 'moon', 'yolo'],
  'crypto': ['BTC', 'ETH', 'DOGE', 'SOL', 'crypto', 'blockchain', 'defi', 'web3'],
  'value_investing': ['BRK', 'JPM', 'BAC', 'value', 'dividend', 'buffett', 'undervalued'],
  'macro_economy': ['SPY', 'QQQ', 'fed', 'inflation', 'rates', 'recession', 'economy', 'jobs'],
  'biotech': ['MRNA', 'PFE', 'BNTX', 'FDA', 'clinical', 'trial', 'pharma', 'biotech'],
  'options_trading': ['calls', 'puts', 'options', 'theta', 'IV', 'gamma', 'spreads', 'expiry']
};

// Detect which community a post belongs to
function detectCommunity(post: SocialPost): string[] {
  const communities: string[] = [];
  const text = post.text.toLowerCase();
  const tickers = post.tickers;
  
  Object.entries(COMMUNITY_KEYWORDS).forEach(([community, keywords]) => {
    const matchScore = keywords.filter(kw => 
      text.includes(kw.toLowerCase()) || tickers.includes(kw.toUpperCase())
    ).length;
    
    if (matchScore >= 2) {
      communities.push(community);
    }
  });
  
  return communities.length > 0 ? communities : ['general'];
}

// Get community clusters (SimClusters-inspired)
export function getCommunityAnalysis(): {
  clusters: CommunityCluster[];
  crossCommunityFlow: { from: string; to: string; strength: number }[];
  emergingTopics: string[];
} {
  const allPosts = [...sentimentCache.twitter, ...sentimentCache.reddit];
  
  // Assign posts to communities
  const communityPosts: Record<string, SocialPost[]> = {};
  
  allPosts.forEach(post => {
    const communities = detectCommunity(post);
    communities.forEach(community => {
      if (!communityPosts[community]) {
        communityPosts[community] = [];
      }
      communityPosts[community].push(post);
    });
  });
  
  // Build clusters
  const clusters: CommunityCluster[] = Object.entries(communityPosts).map(([id, posts]) => {
    const avgSentiment = posts.reduce((sum, p) => sum + p.sentimentScore, 0) / posts.length;
    
    // Determine momentum based on recent vs older posts
    const recentPosts = posts.filter(p => 
      Date.now() - new Date(p.timestamp).getTime() < 60 * 60 * 1000 // last hour
    );
    const olderPosts = posts.filter(p => 
      Date.now() - new Date(p.timestamp).getTime() >= 60 * 60 * 1000
    );
    
    let momentum: 'rising' | 'falling' | 'stable' = 'stable';
    if (recentPosts.length > olderPosts.length * 1.5) momentum = 'rising';
    else if (recentPosts.length < olderPosts.length * 0.5) momentum = 'falling';
    
    return {
      id,
      name: id.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
      keywords: COMMUNITY_KEYWORDS[id] || [],
      posts,
      sentiment: avgSentiment,
      momentum,
      memberCount: new Set(posts.map(p => p.author)).size
    };
  });
  
  // Sort by activity
  clusters.sort((a, b) => b.posts.length - a.posts.length);
  
  // Detect cross-community flow (users posting in multiple communities)
  const userCommunities: Record<string, Set<string>> = {};
  allPosts.forEach(post => {
    if (!userCommunities[post.author]) {
      userCommunities[post.author] = new Set();
    }
    detectCommunity(post).forEach(c => userCommunities[post.author].add(c));
  });
  
  const crossCommunityFlow: { from: string; to: string; strength: number }[] = [];
  const communityPairs: Record<string, number> = {};
  
  Object.values(userCommunities).forEach(communities => {
    const arr = Array.from(communities);
    for (let i = 0; i < arr.length; i++) {
      for (let j = i + 1; j < arr.length; j++) {
        const key = [arr[i], arr[j]].sort().join('->');
        communityPairs[key] = (communityPairs[key] || 0) + 1;
      }
    }
  });
  
  Object.entries(communityPairs)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .forEach(([key, count]) => {
      const [from, to] = key.split('->');
      crossCommunityFlow.push({ from, to, strength: count });
    });
  
  // Detect emerging topics (new keywords appearing frequently)
  const wordFrequency: Record<string, number> = {};
  const recentPosts = allPosts.filter(p => 
    Date.now() - new Date(p.timestamp).getTime() < 2 * 60 * 60 * 1000 // last 2 hours
  );
  
  recentPosts.forEach(post => {
    const words = post.text.toLowerCase().match(/\$[a-z]+|\b[a-z]{3,}\b/gi) || [];
    words.forEach(word => {
      wordFrequency[word] = (wordFrequency[word] || 0) + 1;
    });
  });
  
  const emergingTopics = Object.entries(wordFrequency)
    .filter(([word, count]) => count >= 3)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15)
    .map(([word]) => word);
  
  return { clusters, crossCommunityFlow, emergingTopics };
}

// ============================================================================
// MARKET SIGNAL AGGREGATION - Combines all sources for trading signals
// ============================================================================

export interface MarketSignal {
  timestamp: Date;
  ticker?: string;
  signalType: 'sentiment' | 'viral' | 'influencer' | 'community' | 'combined';
  direction: 'bullish' | 'bearish' | 'neutral';
  strength: number; // 0-100
  confidence: number; // 0-1
  sources: string[];
  reasoning: string;
}

export function generateMarketSignals(ticker?: string): MarketSignal[] {
  const signals: MarketSignal[] = [];
  const timestamp = new Date();
  
  // 1. Combined sentiment signal
  const combined = getCombinedSentiment();
  signals.push({
    timestamp,
    ticker,
    signalType: 'combined',
    direction: combined.direction,
    strength: Math.abs(combined.overallSentiment) * 100,
    confidence: combined.confidence,
    sources: combined.breakdown.filter(b => b.active).map(b => b.platform),
    reasoning: `Combined sentiment: ${(combined.overallSentiment * 100).toFixed(1)}% (${combined.activeSources} sources)`
  });
  
  // 2. Viral trend signal
  const viral = getViralTrends();
  if (viral.viralPosts.length > 0) {
    const viralBullish = viral.viralPosts.filter(p => p.sentiment === 'bullish').length;
    const viralBearish = viral.viralPosts.filter(p => p.sentiment === 'bearish').length;
    const viralDirection = viralBullish > viralBearish ? 'bullish' : viralBearish > viralBullish ? 'bearish' : 'neutral';
    
    signals.push({
      timestamp,
      ticker,
      signalType: 'viral',
      direction: viralDirection,
      strength: viral.overallViralIndex * 100,
      confidence: Math.min(viral.viralPosts.length / 10, 1),
      sources: ['twitter'],
      reasoning: `${viral.viralPosts.length} viral posts detected, ${viralBullish} bullish, ${viralBearish} bearish`
    });
  }
  
  // 3. Influencer signal
  const influencer = getInfluencerWeightedSentiment();
  signals.push({
    timestamp,
    ticker,
    signalType: 'influencer',
    direction: influencer.direction,
    strength: Math.abs(influencer.weightedSentiment) * 100,
    confidence: Math.min(influencer.influencerPosts.length / 5, 1),
    sources: ['twitter'],
    reasoning: `Whale activity: ${influencer.whaleActivity.bulls} bulls, ${influencer.whaleActivity.bears} bears`
  });
  
  // 4. Community signal
  const community = getCommunityAnalysis();
  const risingCommunities = community.clusters.filter(c => c.momentum === 'rising');
  if (risingCommunities.length > 0) {
    const avgSentiment = risingCommunities.reduce((sum, c) => sum + c.sentiment, 0) / risingCommunities.length;
    signals.push({
      timestamp,
      ticker,
      signalType: 'community',
      direction: avgSentiment > 0.1 ? 'bullish' : avgSentiment < -0.1 ? 'bearish' : 'neutral',
      strength: Math.abs(avgSentiment) * 100,
      confidence: Math.min(risingCommunities.length / 3, 1),
      sources: ['twitter', 'reddit'],
      reasoning: `${risingCommunities.length} rising communities: ${risingCommunities.map(c => c.name).join(', ')}`
    });
  }
  
  return signals;
}
