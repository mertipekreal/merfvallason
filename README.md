# 🧠 DuyguMotor AI Platform

**AI-Powered Emotion & Market Intelligence Platform** - Dream Analysis, Financial Predictions, Social Media Analytics, and Creative Content Generation

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Node](https://img.shields.io/badge/node-v20.x-green.svg)
![TypeScript](https://img.shields.io/badge/typescript-5.6.3-blue.svg)

## 🌟 Features

### 💭 Emotion Intelligence
- **Dream Analysis** - AI-powered dream interpretation and pattern recognition
- **Deja Vu Tracking** - Track and analyze recurring experiences
- **SAM (Subconscious Analysis Model)** - 6-layer prediction engine for emotional patterns
- **Psychology Embeddings** - Advanced sentiment analysis using FinBERT and custom models

### 📊 Market Intelligence
- **Real-time Market Data** - Integration with Polygon, Quiver Quant, and Unusual Whales
- **Trading Signals** - AI-driven buy/sell signals with confidence scores
- **Backtesting Engine** - Test strategies across 5+ years of historical data
- **Portfolio Optimization** - Risk-adjusted portfolio recommendations
- **Technical Analysis** - RSI, MACD, Bollinger Bands, and 20+ indicators

### 🎨 Creative Studio
- **NFT Art Generation** - AI-powered art creation using Runway ML
- **Dream-to-NFT** - Convert dreams into unique digital art
- **Story Engine** - Generate narratives based on emotional data
- **Music-Emotion Correlation** - Analyze Spotify data against emotional states

### 📱 Social Intelligence
- **TikTok Analytics** - Viral prediction and trend analysis
- **Instagram Insights** - Engagement optimization
- **Spotify Algorithm** - Reverse-engineered playlist placement scoring
- **Automated Scraping** - Apify integration for data collection

### 🤖 AI Integrations
- **OpenAI GPT-4** - Natural language processing
- **Google Gemini** - Advanced reasoning and analysis
- **Claude AI** - Ethical AI decision-making
- **Hugging Face FinBERT** - Financial sentiment analysis

## 🚀 Quick Start

### Prerequisites
- Node.js v20+
- PostgreSQL (Neon Serverless recommended)
- Redis (Upstash recommended)

### Installation

```bash
# Clone repository
git clone https://github.com/mertipekreal/merfvallason.git
cd merfvallason

# Install dependencies
npm install

# Setup environment variables
cp .env.example .env
# Edit .env with your API keys

# Push database schema
npm run db:push

# Start development server
npm run dev
```

### Environment Variables

Create a `.env` file with the following:

```env
# Database
DATABASE_URL=postgresql://...

# AI Services
OPENAI_API_KEY=sk-...
GOOGLE_AI_API_KEY=AIza...
HUGGINGFACE_API_KEY=hf_...

# Market Data
POLYGON_API_KEY=...
QUIVER_QUANT_API_KEY=...

# Social Media
APIFY_API_TOKEN=apify_api_...
SPOTIFY_CLIENT_ID=...
SPOTIFY_CLIENT_SECRET=...

# Redis
UPSTASH_REDIS_REST_URL=https://...
UPSTASH_REDIS_REST_TOKEN=...

# Admin
ADMIN_API_KEY=your_secure_key
SESSION_SECRET=your_secure_secret
```

## 📖 API Documentation

### Core Endpoints

```
GET  /api/health              - Health check
POST /api/register            - User registration
POST /api/login               - User login
GET  /api/user                - Get current user
```

### Dream & Emotion

```
GET    /api/core/dreams                 - List all dreams
POST   /api/core/dreams                 - Create dream
GET    /api/core/dreams/:id             - Get dream by ID
POST   /api/core/dreams/:id/analyze     - Analyze dream with AI
GET    /api/core/dejavu                 - List deja vu entries
POST   /api/core/sam/analyze            - SAM emotional analysis
```

### Market Intelligence

```
GET  /api/market-domain/quotes/:symbol           - Real-time quotes
GET  /api/market-domain/technical/:symbol        - Technical indicators
POST /api/market-domain/backtest                 - Run backtest
GET  /api/market-domain/signals/:symbol          - Trading signals
POST /api/market-domain/portfolio/optimize       - Portfolio optimization
```

### Creative Studio

```
POST /api/creative-domain/nft/generate           - Generate NFT art
POST /api/creative-domain/runway/text-to-video   - Text to video
GET  /api/creative-domain/chartmetric/artists    - Artist analytics
```

## 🏗️ Architecture

### Tech Stack
- **Frontend**: React 18 + TypeScript + Tailwind CSS
- **Backend**: Express.js + Node.js
- **Database**: PostgreSQL (Drizzle ORM)
- **Cache**: Redis (Upstash)
- **Queue**: BullMQ
- **Build**: Vite + esbuild

### Project Structure

```
├── client/              # React frontend
│   ├── src/
│   │   ├── components/  # Reusable UI components
│   │   ├── pages/       # Page components
│   │   └── hooks/       # Custom React hooks
├── server/              # Express backend
│   ├── domains/         # Domain-driven design
│   │   ├── core/        # Core services (dreams, analytics)
│   │   ├── market/      # Market intelligence
│   │   ├── creative/    # Creative studio
│   │   └── valuation/   # Valuation services
│   ├── auth.ts          # Authentication
│   ├── db.ts            # Database connection
│   ├── index.ts         # Server entry point
│   └── routes.ts        # API routes
├── shared/              # Shared types and schemas
└── script/              # Build and utility scripts
```

## 🧪 Testing

```bash
# Run type checking
npm run check

# Run build
npm run build

# Run in production mode
npm start
```

## 📊 Backtesting

DuyguMotor includes powerful backtesting capabilities:

```typescript
POST /api/market-domain/backtest
{
  "symbol": "AAPL",
  "startDate": "2020-01-01",
  "endDate": "2024-12-31",
  "initialCapital": 10000,
  "strategy": "DUAL_LAYER_AI"
}
```

## 🎯 Roadmap

- [x] Dream analysis with AI
- [x] Market intelligence integration
- [x] NFT art generation
- [x] Social media analytics
- [ ] Mobile app (React Native)
- [ ] Telegram bot integration
- [ ] Real-time notifications
- [ ] Multi-language support

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is licensed under the MIT License.

## 👨‍💻 Author

**Mert İpek**
- GitHub: [@mertipekreal](https://github.com/mertipekreal)
- Email: mertqwq24@icloud.com

## 🙏 Acknowledgments

- OpenAI for GPT-4 API
- Google for Gemini AI
- Anthropic for Claude AI
- Polygon.io for market data
- Runway ML for creative AI tools

---

Made with ❤️ and 🧠 by DuyguMotor Team

