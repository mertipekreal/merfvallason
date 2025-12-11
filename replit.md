# Merf.ai

## Overview
Merf.ai is a Turkish emotional AI and analytics platform extracting insights from social media. It combines algorithmic data analysis with emotional intelligence for AI sentiment analysis, trend detection, dataset comparison, content optimization, AI prompt optimization, conversational AI, 24/7 automation, Canva integration, dual-layer AI analysis, and stock market prediction. The platform delivers market intelligence focusing on Turkish and global social media trends, with ambitions for advanced financial intelligence.

## User Preferences
- Preferred communication style: Simple, everyday language (Turkish with proper diacritics)
- Design aesthetic: Cinematic, moody, film noir with deep navy blues (#2D3654) and cyan/teal accents (#19B5B5)
- Regional focus: 70% Turkey, 30% Global distribution
- Weekly automated scraping: Every Monday, 2500 videos daily per platform
- Admin Mode: Public users see only AI Chat; add `?admin=true` to URL for full admin access (persists in localStorage)

## System Architecture

### Frontend
- **Framework**: React 18+ with TypeScript, Vite.
- **UI Component System**: Shadcn UI (New York style) with Radix UI primitives.
- **Design Theme**: Cinematic dark mode with deep navy blue backgrounds (hsl 227 31% 18%), card surfaces (#3D4766), and cyan/teal primary accents (hsl 185 80% 50%).
- **State Management**: TanStack Query (React Query).
- **Routing**: Wouter.
- **Styling**: Tailwind CSS.
- **Data Visualization**: Recharts (cyan/teal color scheme).

### Backend
- **Runtime**: Node.js with TypeScript, ES modules, Express.js.
- **Modular Domain Architecture**: 4 lazy-loaded domains (Core, Market, Creative, Valuation) for AI Chat, scraping, analytics, sentiment analysis, trend detection, Spotify integration, automation, stock market prediction, NFT generation, content optimization, and human profiling.
  - **Core Services**: Sentiment analysis, trend detection, social media scraping, Spotify API integration, content/prompt optimization, Dream-DejaVu matching, background jobs, NFT ranking/genesis, 24/7 Automation, Stock Market Prediction (3-layer architecture).
  - **FRED Service**: Integrates FREE economic indicators (VIX, T10Y2Y, UMCSENT, UNRATE, Fed Funds Rate, CPI) for market regime detection.
  - **SAM Analysis Service**: Implements Subconscious Analysis Model with Night Owl Indicator, Dissonance Scoring, and Dream Fear Index (DFI). DFI architecture utilizes MIDAS, Markov, and Kalman filters.
    - **Temporal Risk Analysis**: 5-zone circadian risk scoring (Critical 02:00-05:00, High 05:00-08:00, Moderate 22:00-02:00, Low 08:00-11:00, Normal 11:00-22:00) with PFC inhibition and emotional reactivity metrics.
    - **Integrated Risk Report**: 4-layer risk model combining Biological (circadian disruption, PFC inhibition, sleep deprivation), Psychological (emotional reactivity, dissonance, stress), Unconscious (DFI, HVDC aggression, Night Owl, collective anxiety), and Market (smart money divergence, volume anomaly, institutional activity, liquidity) layers into composite risk scoring with actionable recommendations.
    - **Hall/Van de Castle (HVDC) Index**: Dream content analysis with A/F Index (aggression/friendliness ratio), Victimization Percent, and aggression keyword detection (physical, verbal, covert) in Turkish/English.
  - **Dream-Market Backtest System**: Historical correlation between dream sentiment and market movements (1989-2024), predicting market drops.
  - **Market Prediction Engine**: Weighted 3-layer model (Hard Data, Technical, SAM, Economic) for directional accuracy.
  - **Alpha Signals Dashboard**: Apple-style Bento Grid dashboard synthesizing 6-layer market intelligence (Hard Data, Technical, SAM, Economic, Emotion, Microstructure) with API endpoints for dashboard data, NightOwl, DreamMarket metrics, and signals.
  - **Technical Analysis**: Incorporates ICT Smart Money concepts (FVG, MSS, Liquidity Voids).
  - **Function Calling Architecture**: Modular tool API layer (`server/tools/`) with automatic tool detection.
  - **SAM Image Segmentation Service**: Hybrid Python+Node.js (Flask/FastAPI) using MobileSAM and FastSAM models for in-memory image segmentation.
- **API Design**: RESTful API with Zod schema validation for all features.
- **UI/UX (Turkish Navigation)**: Keşfet, Veri Merkezi, Yaratıcı Stüdyo, Müzik Analizi, Bilinçaltı Analizi, AI Chat, NFT Stüdyo.
  - **AI Chat**: Gemini AI-powered, Turkish language support, emotional state tracking, session management, context-aware insights.
  - **Kader Motoru v2.0**: Personal fate simulation with HumanCV profiling, consciousness levels, synchronicity, Jung archetypes.
  - **NFT Studio**: Genesis NFT creation with Kader Motoru integration and Runway AI art generation.

### Database
- **Type**: PostgreSQL via Neon serverless.
- **ORM**: Drizzle ORM.
- **Key Tables**: `scrapeRuns`, `datasets`, `analyticsResults`, `dreams`, `dejavuEntries`, `social_videos`, `humanProfiles`, `fateSimulations`, `conversations`, `automationJobs`, `stockPriceData`, `marketStructureShifts`, `dreamMarketCorrelations`, `tradingSignals`, `marketPredictions`, and others for market metrics, subconscious logs, and alpha signals.

### Current Data Statistics (December 2024)
- **Total Records**: 44,201
- **social_videos**: 35,039 (TikTok + Instagram)
- **dreams**: 3,491
- **market_predictions**: 3,005
- **stock_price_data**: 2,565
- **conversations**: 74

### Backtest Performance (5-Year: 2019-2024)
- **Stock Market Prediction Accuracy**: 75%
- **Social Media Sentiment Accuracy**: 69.2%
- **Overall System Accuracy**: 72.1%
- Best performing years: 2019 (100%), 2020 (100%), 2024 (100%)
- Best categories: Pandemic (100%), Tech (100%), Inflation (100%)

### Viral Analysis
- **Instagram Viral Rate**: 0.17% (10K+ likes)
- Average likes: 148, Max likes: 38,227

## External Dependencies
- **Apify**: Social media scraping (TikTok, Instagram, Twitter) and Spotify data.
- **Runway API**: AI-powered content optimization and dual-layer analysis.
- **OpenAI**: AI sentiment analysis, prompt generation, DALL-E 3 image generation.
- **Gemini AI**: Conversational AI chat with Turkish language support.
- **Canva Connect API**: Professional design integration (OAuth 2.0).
- **Spotify**: Track analysis, playlist scoring, artist data.
- **Hugging Face**: Semantic embeddings (`sentence-transformers`), FinBERT sentiment analysis (planned).
- **Replit Object Storage**: Object storage.
- **BullMQ / Upstash Redis**: Background job queuing.
- **FRED API**: Free historical economic data (St. Louis Fed).
- **Yahoo Finance**: Alternative historical market data.
- **Unusual Whales API**: Options flow, dark pool data, whale trades, market maker positioning.
- **Quiver Quant API**: Congress trading, insider trading, institutional holdings.
- **Polygon API**: Real-time and historical market data (stocks, options, forex, crypto).
- **Vista Social API**: Social media management and analytics.