# 🚂 Railway Deployment Guide - DuyguMotor

## 📋 Ön Hazırlık

### 1. Railway Hesabı
- [railway.app](https://railway.app) üzerinden GitHub ile giriş yapın
- Kredi kartı ekleyin ($5 başlangıç kredisi ücretsiz)

### 2. Gerekli API Keys
Aşağıdaki servislere kayıt olup API anahtarları alın:

#### Zorunlu:
- **Google AI (Gemini)**: [ai.google.dev](https://ai.google.dev)
- **Anthropic (Claude)**: [console.anthropic.com](https://console.anthropic.com)
- **Neon PostgreSQL**: Railway'de otomatik oluşacak
- **Redis**: Railway'de otomatik oluşacak

#### Opsiyonel:
- **Apify**: [apify.com](https://apify.com) (TikTok/Instagram scraping)
- **Spotify API**: [developer.spotify.com](https://developer.spotify.com)
- **Polygon.io**: [polygon.io](https://polygon.io) (Borsa verileri)
- **HuggingFace**: [huggingface.co](https://huggingface.co) (Embeddings)

---

## 🚀 Deployment Adımları

### Adım 1: Yeni Proje Oluştur

1. Railway Dashboard'a gidin
2. **"New Project"** → **"Deploy from GitHub repo"** seçin
3. `mertipekreal/merfvallason` repository'sini seçin
4. **"Deploy Now"** butonuna tıklayın

### Adım 2: PostgreSQL Ekle

1. Proje içinde **"New"** → **"Database"** → **"Add PostgreSQL"**
2. Railway otomatik olarak `DATABASE_URL` değişkenini oluşturacak

### Adım 3: Redis Ekle

1. Proje içinde **"New"** → **"Database"** → **"Add Redis"**
2. Railway otomatik olarak `REDIS_URL` değişkenini oluşturacak

### Adım 4: Environment Variables Ekle

Projenizin **"Variables"** sekmesine gidin ve aşağıdaki değişkenleri ekleyin:

```bash
# Core
NODE_ENV=production
SESSION_SECRET=your-super-secret-minimum-32-chars-random-string

# AI APIs
GOOGLE_AI_API_KEY=your-gemini-api-key
ANTHROPIC_API_KEY=sk-ant-your-anthropic-key
OPENAI_API_KEY=sk-your-openai-key
HUGGINGFACE_API_KEY=hf_your-key

# Social Media
APIFY_API_TOKEN=apify_api_your-token
SPOTIFY_CLIENT_ID=your-spotify-client-id
SPOTIFY_CLIENT_SECRET=your-spotify-client-secret

# Financial
POLYGON_API_KEY=your-polygon-key
FRED_API_KEY=your-fred-key

# Admin
ADMIN_USERNAME=admin
ADMIN_PASSWORD=your-strong-password

# Redis (Upstash uyumluluğu için)
UPSTASH_REDIS_URL=${{Redis.REDIS_URL}}
UPSTASH_REDIS_TOKEN=${{Redis.REDIS_PASSWORD}}

# CORS
ALLOWED_ORIGINS=https://${{RAILWAY_PUBLIC_DOMAIN}},http://localhost:5173
```

### Adım 5: Build & Deploy Ayarları

1. **"Settings"** sekmesine gidin
2. **Build Command**: `npm run build` (otomatik algılanacak)
3. **Start Command**: `npm start` (otomatik algılanacak)
4. **Health Check**: `/api/health` (railway.json'da tanımlı)
5. **Port**: Railway otomatik `PORT` değişkeni oluşturur

### Adım 6: Domain Ayarları

1. **"Settings"** → **"Networking"**
2. **"Generate Domain"** → Örnek: `duygumotor-production.up.railway.app`
3. (Opsiyonel) Custom domain ekleyin

---

## 🔍 Deployment Sonrası Kontroller

### 1. Logları İzleyin
```bash
# Railway Dashboard > Deployments > View Logs
```

### 2. Health Check
```bash
curl https://your-app.up.railway.app/api/health
```

Beklenen cevap:
```json
{
  "status": "healthy",
  "database": "connected",
  "redis": "connected",
  "timestamp": "2024-12-13T..."
}
```

### 3. Database Migration
İlk deploy'dan sonra veritabanı tablolarını oluşturun:

Railway Dashboard > Project > **"New"** → **"Empty Service"** → **"One-off Command"**
```bash
npm run db:push
```

---

## 💰 Maliyet Tahmini

| Servis | Aylık Maliyet |
|--------|---------------|
| Railway Hosting | ~$5-10 |
| PostgreSQL | ~$5 |
| Redis | ~$3 |
| Gemini API | $0-50 (kullanıma göre) |
| Claude API | $0-100 (kullanıma göre) |
| **TOPLAM** | **~$13-168/ay** |

---

## 🐛 Troubleshooting

### Build Hatası
```bash
# Eğer dependency conflict varsa
# nixpacks.toml dosyasını güncelleyin:
[phases.install]
cmds = ["npm ci --legacy-peer-deps"]
```

### Database Bağlantı Hatası
- `DATABASE_URL` değişkeninin PostgreSQL plugin'den otomatik geldiğinden emin olun
- Değişken adı: `${{Postgres.DATABASE_URL}}`

### Redis Bağlantı Hatası
```bash
# Upstash uyumluluğu için değişkenleri kontrol edin:
UPSTASH_REDIS_URL=${{Redis.REDIS_URL}}
UPSTASH_REDIS_TOKEN=${{Redis.REDIS_PASSWORD}}
```

### Port Hatası
```typescript
// server/index.ts içinde PORT Railway'den alınmalı:
const PORT = process.env.PORT || 8080;
```

---

## 🔄 CI/CD (Otomatik Deploy)

Railway, GitHub'a her push'da otomatik deploy yapar:

```bash
git add .
git commit -m "feat: new feature"
git push origin main
# Railway otomatik deploy başlar ✅
```

---

## 📊 Monitoring

### Railway Metrics
- **CPU Usage**: Dashboard > Metrics
- **Memory Usage**: Dashboard > Metrics
- **Network**: Dashboard > Metrics

### Sentry (Opsiyonel)
```bash
# Environment Variables'a ekleyin:
SENTRY_DSN=your-sentry-dsn
ENABLE_SENTRY=true
```

---

## 🎯 Sonraki Adımlar

1. ✅ Railway'e deploy et
2. ✅ Domain'i test et
3. ✅ Database migration'ı çalıştır
4. ✅ Frontend'i Railway domain'ine bağla
5. 🔜 Cloudflare CDN ekle (opsiyonel)
6. 🔜 Custom domain ekle (opsiyonel)

---

## 📞 Destek

Sorun yaşarsanız:
- Railway Discord: [discord.gg/railway](https://discord.gg/railway)
- Dokümantasyon: [docs.railway.app](https://docs.railway.app)

---

**Son Güncelleme**: Aralık 2024  
**Railway Config**: `railway.json`, `nixpacks.toml`

