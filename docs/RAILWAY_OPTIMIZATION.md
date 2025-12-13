# 🚂 Railway Optimization Guide

Railway ücretsiz tier'da nasıl optimize çalıştırılır.

## 💰 Free Tier Limitleri

- **$5 free credit/month**
- **500 execution hours/month**
- **512MB RAM** (shared)
- **1 GB Disk** (ephemeral)

## 📊 Mevcut Durum: AĞIR

```
53 aktif servis
~300-400MB RAM kullanımı
Tüm AI provider'lar aktif
Tüm market data servisleri çalışıyor
```

**Sonuç:** 2-3 günde $5 biter! 💸

## ✂️ Optimizasyon Stratejileri

### 1️⃣ Minimal Mode (En Hafif)

**Sadece şunlar aktif:**
- ✅ Frontend (React)
- ✅ Backend API (Express)
- ✅ Database (Neon)
- ✅ Chat AI (Gemini - free tier)
- ✅ Session management

**Devre dışı:**
- ❌ Market data servisleri (26 servis)
- ❌ Creative tools (7 servis)
- ❌ Ağır analytics (5 servis)
- ❌ Auto-scraping
- ❌ Bull Board

**Sonuç:**
- ~150MB RAM
- $5 kreди ~15-20 gün yeter

### 2️⃣ Standard Mode (Dengeli)

**Aktif:**
- ✅ Core features
- ✅ AI Chat (Gemini + Claude)
- ✅ Basic market data (BIST, Polygon)
- ✅ TikTok/Spotify analytics
- ✅ Dream analysis

**Devre dışı:**
- ❌ Advanced market tools
- ❌ Creative generation (ağır)
- ❌ Auto-scraping (scheduled jobs)

**Sonuç:**
- ~250MB RAM
- $5 kredi ~7-10 gün yeter

### 3️⃣ Full Mode (Şu Anki)

**Hepsi aktif:**
- ✅ 53 servis
- ✅ Tüm AI provider'lar
- ✅ Tüm market data
- ✅ Auto-scraping
- ✅ Analytics engine

**Sonuç:**
- ~400MB RAM
- $5 kredi ~2-3 gün yeter 💸

## 🎯 Önerilen Kurulum: Minimal Mode

### Adım 1: Gereksiz Servisleri Kapat

Railway Variables'a ekle:

```env
# Disable heavy features
ENABLE_BULL_BOARD=false
ENABLE_ANALYTICS_ENGINE=false
ENABLE_AUTO_SCRAPING=false
ENABLE_MARKET_BOTS=false
ENABLE_CREATIVE_GENERATION=false

# Use only Gemini (free tier)
GOOGLE_AI_API_KEY=your-key
# ANTHROPIC_API_KEY=  # Comment out
# OPENAI_API_KEY=     # Comment out

# Disable unused market data
# POLYGON_API_KEY=    # Comment out if not needed
# QUIVER_QUANT_API_KEY=
# UNUSUAL_WHALES_API_KEY=
```

### Adım 2: Code'da Conditional Loading

Service'leri lazy load yap - sadece kullanıldığında yükle.

### Adım 3: Monitor Et

Railway Dashboard → Metrics:
- CPU usage
- Memory usage
- Build minutes

## 🔧 Hızlı Optimizasyon Komutları

### Railway Variables'ı Güncelle

Railway Dashboard → Variables → Edit:

```bash
# Heavy features OFF
ENABLE_BULL_BOARD=false
ENABLE_ANALYTICS_ENGINE=false
ENABLE_AUTO_SCRAPING=false

# Only essential AI
GOOGLE_AI_API_KEY=keep-this
```

### Local Test

```bash
# Minimal mode ile local test
NODE_ENV=production \
ENABLE_BULL_BOARD=false \
ENABLE_ANALYTICS_ENGINE=false \
npm run build && npm start
```

## 📊 Kaynak Kullanımı Karşılaştırması

| Mode | RAM | CPU | Aylık Maliyet |
|------|-----|-----|---------------|
| **Minimal** | 150MB | 10% | $0 (free tier) |
| **Standard** | 250MB | 25% | $3-5 |
| **Full** | 400MB | 50% | $15-20 |

## 🎨 Hangi Mode'u Seçmeliyim?

### Minimal Mode → Şunlar için yeterli:
- ✅ AI Chat (Gemini)
- ✅ Frontend UI
- ✅ Basic API calls
- ✅ User authentication
- ✅ Database queries

### Standard Mode → İhtiyacın varsa:
- ✅ Market data (stocks)
- ✅ TikTok analytics
- ✅ Dream analysis
- ✅ Multiple AI models

### Full Mode → Sadece şu durumlarda:
- ✅ Production app
- ✅ Çok kullanıcı
- ✅ Ücretli plan

## 💡 İpuçları

### 1. Lazy Loading
Servisleri sadece kullanıldığında yükle:

```typescript
// ❌ Kötü: Tüm servisleri baştan yükle
import allServices from './services';

// ✅ İyi: Sadece gerektiğinde yükle
const service = await import('./services/chat-service');
```

### 2. Caching
Sık kullanılan data'yı cache'le (Redis):

```typescript
// Cache API responses for 5 minutes
const cachedData = await redis.get('market-data');
if (cachedData) return cachedData;
```

### 3. Rate Limiting
API call'ları sınırla:

```typescript
// Max 10 requests per minute per user
const limiter = rateLimit({
  windowMs: 60000,
  max: 10
});
```

### 4. Background Jobs'ı Kapat
Scheduled task'lar memory yer:

```typescript
// ❌ Auto-scraping her 5 dakikada
setInterval(() => scrape(), 300000);

// ✅ Manuel trigger yap
app.post('/api/scrape', async (req, res) => {
  await scrape();
});
```

## 🆘 Acil Durum: Railway Paused

Eğer free tier dolarsa:

1. **Railway Dashboard** → Service → **Restart**
2. **Environment Variables** → Unused servisleri kapat
3. **Deploy** → Yeni optimize versiyonu deploy et
4. **Wait** → Ay sonunu bekle (credit reset)

## 🎯 Sonuç

**Minimal Mode önerilir:**
- Free tier'da çalışır
- Chat, frontend, database yeterli
- İleride upgrade edersin

**Not:** Production'da kullanıcı arttıkça Railway Pro'ya ($5-20/ay) geçebilirsin.

## 📚 Kaynaklar

- [Railway Pricing](https://railway.app/pricing)
- [Railway Free Tier](https://railway.app/legal/fair-use)
- [Optimize Node.js](https://nodejs.org/en/docs/guides/simple-profiling/)


