# API Quick Reference - Merf.ai v3.5

## Hızlı Erişim Tablosu

### TikTok & Sosyal Medya
```typescript
// TikTok Scraping
POST /api/scrape/tiktok
Body: { region: "TR" | "GLOBAL", videoCount: number }

// Instagram Scraping  
POST /api/scrape/instagram
Body: { username: string, postCount: number }

// Viral Analysis
GET /api/analytics/viral-trends
Query: ?platform=tiktok&days=7
```

### AI Chat & Analysis
```typescript
// Gemini AI Chat
POST /api/ai-chat
Body: { message: string, sessionId?: string }

// Sentiment Analysis
POST /api/analytics/sentiment
Body: { text: string, language: "tr" | "en" }

// Prompt Optimization
POST /api/creative/optimize-prompt
Body: { prompt: string, platform: string }
```

### Stock Market Prediction
```typescript
// Generate Prediction (3-Layer)
POST /api/market/predict/:symbol
Requires: auth

// Get Predictions
GET /api/market/predictions/:symbol
Query: ?limit=10

// Record Outcome
POST /api/market/record-outcome/:id
Body: { actualDirection: "UP" | "DOWN" | "FLAT" }

// Economic Indicators (FRED)
GET /api/market/economic-indicators

// SAM Metrics
GET /api/market/sam-metrics
```

### Dream & Déjà-vu
```typescript
// Match Dream
POST /api/dreams/match
Body: { description: string, emotion: string }

// Add Dream
POST /api/dreams
Body: { description: string, emotion: string, userId: string }

// Get Déjà-vu Scenarios
GET /api/dejavu/scenarios
Query: ?userId=string
```

### NFT Studio
```typescript
// Generate NFT
POST /api/nft/generate
Body: { 
  humanProfile: object,
  consciousnessLevel: number,
  jungArchetype: string 
}

// Get Candidates
GET /api/nft/candidates
Query: ?status=pending&limit=10
```

### Creative Tools
```typescript
// Content Optimization (Runway)
POST /api/creative/optimize
Body: { content: string, platform: string }

// Brief Bot
POST /api/creative/brief
Body: { idea: string, platform: string }

// Dual-Layer Analysis
POST /api/creative/dual-analysis
Body: { content: string }
```

### Spotify Analysis
```typescript
// Analyze Track
POST /api/spotify/analyze
Body: { trackId: string }

// Score Playlist
POST /api/spotify/playlist-score
Body: { playlistId: string }
```

### Automation
```typescript
// Create Job
POST /api/automation/jobs
Body: { 
  type: "scrape" | "analyze" | "predict",
  schedule: string,
  config: object 
}

// Get Jobs
GET /api/automation/jobs
Query: ?status=active

// Get Logs
GET /api/automation/logs/:jobId
```

## Environment Variables (Secrets)

### Hızlı Erişim
```bash
# AI Services
OPENAI_API_KEY=sk-...
AI_INTEGRATIONS_GEMINI_API_KEY=...
AI_INTEGRATIONS_ANTHROPIC_API_KEY=...
RUNWAY_API_KEY=key_...

# Social Media
APIFY_API_TOKEN=...
SPOTIFY_CLIENT_ID=...
SPOTIFY_CLIENT_SECRET=...

# Database
DATABASE_URL=postgresql://...
PGHOST=...
PGPORT=5432
PGUSER=...
PGPASSWORD=...
PGDATABASE=...

# Session
SESSION_SECRET=...
```

## Service Files Quick Access

### Backend Services
```bash
# AI Services
server/services/gemini-chat-service.ts       # Gemini AI chat
server/services/openai-service.ts            # OpenAI GPT/DALL-E
server/services/runway-service.ts            # Video generation

# Market Analysis
server/services/prediction-engine-service.ts  # 3-layer prediction
server/services/feature-engineering-service.ts # Feature extraction
server/services/sam-analysis-service.ts       # SAM analysis
server/services/fred-service.ts               # Economic indicators
server/services/technical-analysis-service.ts # ICT Smart Money

# Social Media
server/services/apify-service.ts             # Social scraping
server/services/spotify-service.ts           # Music analysis

# Dream Analysis
server/services/dream-dejavu-service.ts      # Dream matching
server/services/dreambank-scraper.ts         # DreamBank data
server/services/backtest-service.ts          # Dream-market backtest

# NFT & Kader
server/services/nft-genesis-service.ts       # NFT generation
server/services/kader-engine-service.ts      # Fate simulation

# Automation
server/services/automation-service.ts        # Job scheduling
```

### Database Schema
```bash
# Main Schema
shared/schema.ts                             # All Drizzle tables

# Key Tables
- scrapeRuns, scrapeBatches
- weeklyInsights, datasets, analyticsResults
- dreams, dejavuEntries, dreamMatches
- social_videos, embedding_jobs
- stockPriceData, marketPredictions
- economicIndicators, samMetrics
- automationJobs, automationLogs
- nft_candidates, humanProfiles
```

### Frontend Pages
```bash
# Main Pages
client/src/pages/explore.tsx                 # Keşfet (Analytics)
client/src/pages/data-center.tsx             # Veri Merkezi
client/src/pages/creative-studio.tsx         # Yaratıcı Stüdyo
client/src/pages/music-analysis.tsx          # Müzik Analizi
client/src/pages/subconscious-analysis.tsx   # Bilinçaltı Analizi
client/src/pages/ai-chat.tsx                 # AI Chat (Gemini)
client/src/pages/nft-studio.tsx              # NFT Stüdyo
client/src/pages/market-prediction.tsx       # Borsa Tahmini (YENİ)
```

## Common Workflows

### 1. TikTok Viral Analysis
```typescript
// 1. Scrape videos
POST /api/scrape/tiktok
{ region: "TR", videoCount: 1000 }

// 2. Analyze trends
GET /api/analytics/viral-trends?platform=tiktok&days=7

// 3. Get insights
GET /api/insights/weekly?platform=tiktok
```

### 2. Stock Prediction
```typescript
// 1. Get economic context
GET /api/market/economic-indicators

// 2. Get SAM metrics
GET /api/market/sam-metrics

// 3. Generate prediction
POST /api/market/predict/IXIC

// 4. Check accuracy stats
GET /api/market/accuracy
```

### 3. Dream Analysis
```typescript
// 1. Match dream
POST /api/dreams/match
{ description: "uçuyordum", emotion: "heyecan" }

// 2. Get similar dreams
GET /api/dreams/similar/:id

// 3. Check déjà-vu
POST /api/dejavu/detect
{ userId: "123", recentEvents: [...] }
```

### 4. Content Creation
```typescript
// 1. Optimize prompt
POST /api/creative/optimize-prompt
{ prompt: "viral video idea", platform: "tiktok" }

// 2. Generate content
POST /api/creative/optimize
{ content: "...", platform: "tiktok" }

// 3. Dual-layer analysis
POST /api/creative/dual-analysis
{ content: "final video" }
```

## Error Handling

### Common Error Codes
- `400` - Bad Request (validation error)
- `401` - Unauthorized (missing auth)
- `404` - Not Found
- `429` - Rate Limit Exceeded
- `500` - Internal Server Error

### Rate Limits
- OpenAI: 3 req/min (tier 1)
- Apify: 100 req/hour
- Runway: 10 videos/hour
- Gemini: 60 req/min

## Development Tips

### Testing API Endpoints
```bash
# Using curl
curl -X POST http://localhost:5000/api/ai-chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Merhaba"}'

# Using httpie
http POST localhost:5000/api/market/predict/IXIC
```

### Checking Logs
```bash
# Application logs
tail -f .local/logs/app.log

# Database queries
grep "SELECT" .local/logs/db.log

# API requests
grep "POST\|GET" .local/logs/api.log
```

## Performance Optimization

### Caching Strategy
- TikTok data: 1 hour cache
- Stock predictions: 15 min cache
- Economic indicators: 1 day cache
- Dream matches: No cache (real-time)

### Database Indexes
```sql
-- High-priority indexes
CREATE INDEX idx_social_videos_platform ON social_videos(platform);
CREATE INDEX idx_market_predictions_symbol ON marketPredictions(symbol);
CREATE INDEX idx_dreams_embedding ON dreams USING ivfflat(embedding);
```

## Troubleshooting

### Common Issues

1. **API Key Not Found**
   - Check `view_env_vars` tool
   - Verify secret name matches exactly

2. **Database Connection Failed**
   - Check `DATABASE_URL` secret
   - Verify Neon DB is running

3. **Scraping Failed**
   - Apify token expired?
   - Rate limit exceeded?
   - Target website changed?

4. **Prediction Accuracy Low**
   - Check SAM metrics quality
   - Verify FRED data freshness
   - Review feature engineering

---

*Son Güncelleme: 8 Aralık 2025*
