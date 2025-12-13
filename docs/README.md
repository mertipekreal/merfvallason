# 📚 DuyguMotor Documentation

Comprehensive documentation for the DuyguMotor AI Platform.

## 🚀 Deployment & Infrastructure

### Quick Start
- **[Cloudflare Quick Start](./CLOUDFLARE_QUICK_START.md)** - 5 dakikada Cloudflare kurulumu
- **[Cloudflare Setup Guide](./CLOUDFLARE_SETUP.md)** - Detaylı Cloudflare konfigürasyonu
- **[Deployment Checklist](./DEPLOYMENT_CHECKLIST.md)** - Production öncesi kontrol listesi

### Configuration Files
- **[cloudflare-page-rules.json](../cloudflare-page-rules.json)** - Cloudflare cache ve güvenlik kuralları
- **[env.cloudflare.example](../env.cloudflare.example)** - Environment variables şablonu

## 🏗️ Architecture

### System Architecture
- **[DFI Architecture](./DFI_ARCHITECTURE.md)** - Dream-based Financial Intelligence
- **[Financial Intelligence Architecture](./FINANCIAL_INTELLIGENCE_ARCHITECTURE.md)**
- **[SAM Architecture (TR)](./SAM_ARCHITECTURE_TR.md)** - Sentiment Analysis Module
- **[SAM Theory](./SAM_THEORY.md)**
- **[Gölge'nin Mimarisi](./golgenin-mimarisi-akademik-ozet.md)**

## 📊 Analysis & Insights
- **[Turkish Sentiment Analysis](./TURKISH_SENTIMENT_ANALYSIS.md)**
- **[Kerem Akar Philosophical Analysis](./kerem-akar-philosophical-analysis.md)**

## 🔧 API Reference
- **[API Quick Reference](./API_QUICK_REFERENCE.md)** - Tüm endpoint'ler ve kullanım

## 📋 Infrastructure Stack

```
┌─────────────────────────────────────┐
│         User's Browser              │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│      Cloudflare CDN/WAF             │
│  • Global CDN                       │
│  • DDoS Protection                  │
│  • SSL/TLS                          │
│  • Caching                          │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│         Railway Platform            │
│  ┌─────────────────────────────┐   │
│  │   Express.js Backend        │   │
│  │   + Vite Frontend           │   │
│  └─────────────────────────────┘   │
│              │                      │
│     ┌────────┴────────┐            │
│     ▼                 ▼            │
│  ┌──────┐      ┌──────────┐       │
│  │ Neon │      │ Upstash  │       │
│  │  DB  │      │  Redis   │       │
│  └──────┘      └──────────┘       │
└─────────────────────────────────────┘
               │
               ▼
         ┌─────────┐
         │ GitHub  │
         └─────────┘
```

## 🌐 Production URLs

- **Railway Direct:** `https://duygumotor-production-xxxx.up.railway.app`
- **Custom Domain (Optional):** `https://yourdomain.com`
- **API Base:** `/api`
- **Health Check:** `/api/health`

## 📱 Core Features

1. **Dream Analysis** - AI-powered dream interpretation
2. **Market Intelligence** - Financial prediction and analysis
3. **Social Media Analytics** - TikTok, Spotify, Instagram insights
4. **Creative Studio** - AI content generation
5. **NFT Reports** - Digital asset valuation
6. **Sentiment Analysis** - Turkish language support

## 🔐 Security Features

- CORS protection with whitelist
- Rate limiting (100 req/min)
- Security headers (HSTS, CSP, etc.)
- Session management
- Authentication middleware
- DDoS protection (Cloudflare)
- SSL/TLS encryption

## 📈 Performance Targets

- **TTFB:** < 200ms (global)
- **FCP:** < 2s
- **LCP:** < 2.5s
- **Cache Hit Rate:** > 80%
- **Uptime:** 99.99%

## 🛠️ Tech Stack

### Frontend
- React 18 + TypeScript
- Vite (bundler)
- TailwindCSS + shadcn/ui
- React Query (data fetching)
- Wouter (routing)

### Backend
- Node.js + Express
- TypeScript
- Drizzle ORM
- PostgreSQL (Neon)
- Redis (Upstash)
- BullMQ (job queue)

### AI/ML
- Anthropic Claude
- Google Gemini
- OpenAI GPT
- Hugging Face models

### Infrastructure
- **Version Control:** GitHub
- **Deployment:** Railway
- **CDN/Security:** Cloudflare
- **Database:** Neon PostgreSQL
- **Cache:** Upstash Redis
- **Storage:** Google Cloud Storage

## 📞 Support & Resources

- **Railway Docs:** https://docs.railway.app
- **Cloudflare Docs:** https://developers.cloudflare.com
- **Status Pages:**
  - Railway: https://railway.app/status
  - Cloudflare: https://www.cloudflarestatus.com

## 🎯 Quick Links

- [Main README](../README.md)
- [System Status](../SYSTEM_STATUS.md)
- [Package.json](../package.json)

---

**Last Updated:** 2025-12-12  
**Version:** 1.0.0  
**Maintainer:** DuyguMotor Team


