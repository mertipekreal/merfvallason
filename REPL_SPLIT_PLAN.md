# Merf.ai Repl Bölme Planı

## 1. merf-ai-core (Ana Platform)

### Servisler (15 dosya)
```
- gemini-ai-service.ts          # Gemini AI chat
- claude-ai-service.ts          # Claude AI
- apify-service.ts              # TikTok/Instagram scraping
- tiktok-bridge.ts              # TikTok bridge
- social-video-service.ts       # Video CRUD
- analytics-engine.ts           # Analytics
- spotify-service.ts            # Spotify API
- spotify-scoring.ts            # Playlist scoring
- huggingface-service.ts        # Embeddings
- hybrid-search-service.ts      # Search
- memory-service.ts             # Memory
- automation-service.ts         # Job scheduler
- feedback-service.ts           # Feedback
- export-service.ts             # Export
- weekly-scraper.ts             # Weekly jobs
```

### Database Tables
```sql
- scrapeRuns, scrapeBatches
- weeklyInsights
- datasets
- analyticsResults
- social_videos
- embedding_jobs
- feedback
- automationJobs, automationLogs
```

### API Endpoints
```
POST /api/scrape/tiktok
POST /api/scrape/instagram  
POST /api/ai-chat
POST /api/analytics/*
POST /api/spotify/*
GET /api/insights/*
```

### Dependencies
```json
{
  "@google/genai": "latest",
  "@anthropic-ai/sdk": "latest",
  "apify-client": "latest",
  "@spotify/web-api-ts-sdk": "latest",
  "@huggingface/inference": "latest"
}
```

---

## 2. merf-stock-predictor (Borsa Tahmin Sistemi)

### Servisler (30 dosya)
```
# Prediction Core
- prediction-engine-service.ts      # 3-layer engine
- feature-engineering-service.ts    # Feature extraction
- adaptive-weight-engine.ts         # Weight tuning
- self-improving-engine.ts          # ML improvement

# Data Layers
- sam-analysis-service.ts           # SAM (Dream/Emotion)
- technical-analysis-service.ts     # ICT Smart Money
- fred-service.ts                   # Economic indicators
- social-sentiment-service.ts       # Social sentiment
- psychology-embedding-service.ts   # Psychology analysis

# External APIs
- polygon-service.ts                # Market data
- unusual-whales-service.ts         # Options flow
- quiver-quant-service.ts           # Congress trades
- bist-service.ts                   # BIST data

# Backtesting
- backtest-service.ts               # Main backtest
- comprehensive-backtest.ts         # Full backtest
- session-backtest-service.ts       # Session analysis
- portfolio-backtest-service.ts     # Portfolio backtest
- historical-data-service.ts        # Historical data
- dreambank-scraper.ts              # Dream data

# Trading
- trading-session-service.ts        # Session trading
- risk-management-service.ts        # Risk management
- portfolio-optimization-service.ts # Portfolio optimization
- live-signal-service.ts            # Live signals
- realtime-market-service.ts        # Real-time data

# ML & Analysis
- ml-prediction-service.ts          # ML models
- market-analysis-service.ts        # Market analysis
- viral-prediction-service.ts       # Viral prediction
- enhanced-signal-combiner.ts       # Signal combination

# Infrastructure
- notification-service.ts           # Alerts
- redis-cache-service.ts            # Caching
```

### Database Tables
```sql
- stockPriceData
- orderFlowData
- darkPoolTrades
- optionsFlow
- fairValueGaps
- marketStructureShifts
- liquidityVoids
- dreamMarketCorrelations
- tradingSignals
- backtestResults
- marketMakerSentiment
- economicIndicators
- institutionalActivity
- samMetrics
- featureSnapshots
- marketPredictions
- dreams (for correlation)
```

### API Endpoints
```
POST /api/market/predict/:symbol
GET /api/market/predictions/:symbol
GET /api/market/accuracy
POST /api/market/record-outcome/:id
GET /api/market/features/:symbol
GET /api/market/economic-indicators
GET /api/market/sam-metrics
GET /api/market/backtest
```

### Dependencies
```json
{
  "@upstash/redis": "latest",
  "ioredis": "latest",
  "bullmq": "latest"
}
```

---

## 3. social-account-valuator (Hesap Değerleme Botu)

### Yeni Servisler (Yazılacak)
```
- fameswap-scraper.ts       # Fameswap scraper
- swapd-scraper.ts          # Swapd scraper
- socialblade-analyzer.ts   # SocialBlade risk
- valuation-engine.ts       # S-Score calculation
- telegram-notifier.ts      # Telegram alerts
```

### Database Tables
```sql
- accountListings          # Scraped listings
- valuationScores         # Calculated scores
- riskAnalysis            # Risk assessment
- notificationHistory     # Sent notifications
```

### Features
- Playwright stealth scraping
- Anti-bot bypass (residential proxies)
- S-Score formula: (F × E) / P × Q
- SocialBlade graph analysis
- Telegram real-time alerts

### Dependencies
```json
{
  "playwright": "latest",
  "playwright-stealth": "latest",
  "python-telegram-bot": "latest",
  "cheerio": "latest"
}
```

---

## 4. rasch-content-manager (İçerik Yönetimi)

### Servisler (5 dosya)
```
- runway-service.ts             # Video generation
- nft-art-service.ts            # NFT art
- creative-engine.ts            # Content optimization
- dual-layer-analysis-service.ts # Dual analysis
- canva-service.ts              # Design integration
```

### Database Tables
```sql
- generatedVideos      # Runway outputs
- contentCalendar      # Posting schedule
- fanPageAccounts      # 50 fan pages
- performanceMetrics   # Video analytics
- campaigns            # Campaign management
```

### Features
- Runway video generation
- 50 fan page scheduler
- Viral trend analysis
- Canva integration
- Performance tracking

### API Endpoints
```
POST /api/rasch/generate-video
POST /api/rasch/schedule-post
GET /api/rasch/performance
GET /api/rasch/calendar
```

### Dependencies
```json
{
  "@runway/sdk": "latest"
}
```

---

## Migration Steps

### Phase 1: Stock Predictor (En Bağımsız)
1. Yeni repl oluştur: `merf-stock-predictor`
2. 30 servis dosyasını kopyala
3. Database migration script
4. ENV variables kopyala
5. Test et

### Phase 2: Rasch Content Manager
1. Yeni repl oluştur: `rasch-content-manager`
2. 5 servis + Rasch assets
3. Database schema
4. Test et

### Phase 3: Social Account Valuator
1. Yeni repl oluştur: `social-account-valuator`
2. Sıfırdan yaz (Playwright + Telegram)
3. Test et

### Phase 4: Core Cleanup
1. Stock ve Rasch kod şişliğini sil
2. Sadece AI Chat + Scraping bırak
3. Optimize et

---

## Avantajlar

✅ **Hafıza**: Her repl küçük → context asla dolmaz
✅ **Hız**: Modüler deploy → hızlı geliştirme
✅ **İzolasyon**: Bir repl çökerse diğerleri çalışır
✅ **Ölçeklendirme**: Her repl bağımsız scale olur
✅ **Maliyet**: Sadece kullanılan repl'ler çalışır

## Tahmini Boyutlar

| Repl | Kod Satırı | DB Tabloları | API Count |
|------|-----------|-------------|-----------|
| Core | ~5K | 10 | 20 |
| Stock | ~15K | 25 | 15 |
| Rasch | ~2K | 5 | 8 |
| Valuator | ~3K | 4 | 5 |

**Toplam:** 25K satır (şu an: ~40K satır - %35 düşüş)
