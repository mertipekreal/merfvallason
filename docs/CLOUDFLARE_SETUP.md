# 🌐 Cloudflare Kurulum Rehberi

DuyguMotor projesi için Cloudflare CDN, güvenlik ve performans konfigürasyonu.

## 📋 Kurulum Adımları

### 1️⃣ Railway Domain Bilgisini Al

Railway dashboard'a git:
```
https://railway.app/project/[PROJECT_ID]
```

- Settings → Domains bölümünde Railway domain'ini kopyala
- Örnek: `duygumotor-production-xxxx.up.railway.app`

### 2️⃣ Cloudflare'de Domain Ekle

#### Option A: Kendi Domain'in Varsa
1. Cloudflare Dashboard → **Add Site**
2. Domain adını gir (örn: `duygumotor.com`)
3. Free planı seç
4. Nameserver'ları domain registrar'ına ekle (Cloudflare'in verdiği)
5. DNS propagation bekle (5-60 dakika)

#### Option B: Cloudflare Pages için Subdomain
1. Cloudflare Workers & Pages → Create
2. Connect to Git → GitHub repo'nu seç
3. Build settings:
   ```
   Framework preset: Vite
   Build command: npm run build
   Build output: dist
   ```

### 3️⃣ DNS Kayıtlarını Ayarla

Cloudflare DNS bölümünde:

**A Record (Kendi domain'in varsa):**
```
Type: CNAME
Name: @ (veya subdomain)
Target: duygumotor-production-xxxx.up.railway.app
Proxy status: ✅ Proxied (turuncu bulut)
TTL: Auto
```

**API Subdomain (Opsiyonel):**
```
Type: CNAME
Name: api
Target: duygumotor-production-xxxx.up.railway.app
Proxy status: ✅ Proxied
```

### 4️⃣ Railway'de Custom Domain Ekle

Railway Dashboard:
1. Settings → **Domains**
2. **+ Custom Domain** tıkla
3. Domain'i gir: `duygumotor.com` veya `yourdomain.com`
4. Railway otomatik SSL sertifikası oluşturur

### 5️⃣ SSL/TLS Ayarları

**Cloudflare → SSL/TLS:**
- **Encryption Mode:** `Full (strict)` ✅
- **Always Use HTTPS:** ✅ ON
- **Automatic HTTPS Rewrites:** ✅ ON
- **Minimum TLS Version:** TLS 1.2
- **TLS 1.3:** ✅ ON

### 6️⃣ Caching Rules (Performans)

**Cloudflare → Rules → Page Rules veya Cache Rules:**

#### Rule 1: Static Assets Cache
```
If: Dosya uzantısı matches
(jpg|jpeg|png|gif|webp|svg|css|js|woff|woff2|ttf|eot|ico)

Then:
- Cache Level: Standard
- Edge Cache TTL: 1 month
- Browser Cache TTL: 1 hour
```

#### Rule 2: API No Cache
```
If: URI Path starts with /api

Then:
- Cache Level: Bypass
```

#### Rule 3: HTML Cache
```
If: Dosya uzantısı matches (html)

Then:
- Cache Level: Standard
- Edge Cache TTL: 2 hours
- Browser Cache TTL: 30 minutes
```

### 7️⃣ Security Rules

**Cloudflare → Security → WAF:**

#### Custom Rule 1: Rate Limiting
```
Name: API Rate Limit
If: URI Path starts with /api
Then: Rate limit 100 requests per minute
Action: Challenge
```

#### Custom Rule 2: Block Bad Bots
```
Name: Block Known Bots
If: Known Bot Score < 30
Then: Block
```

#### Custom Rule 3: Country Allow (Opsiyonel)
```
Name: Türkiye Priority
If: Country is not in [TR, US, EU]
Then: Challenge (veya Allow hepsine)
```

### 8️⃣ Transform Rules (Headers)

**Cloudflare → Rules → Transform Rules → Modify Response Header:**

```
Rule Name: Security Headers
If: All incoming requests

Set Static Headers:
- X-Frame-Options: DENY
- X-Content-Type-Options: nosniff
- Referrer-Policy: strict-origin-when-cross-origin
- Permissions-Policy: geolocation=(), camera=(), microphone=()
```

### 9️⃣ Speed Optimizations

**Cloudflare → Speed:**
- **Auto Minify:** ✅ JavaScript, CSS, HTML
- **Brotli:** ✅ ON
- **Rocket Loader:** ⚠️ OFF (React ile uyumsuz olabilir)
- **Early Hints:** ✅ ON
- **HTTP/3 (with QUIC):** ✅ ON

### 🔟 Analytics & Monitoring

**Cloudflare → Analytics:**
- Traffic grafikleri
- Security events
- Cache analytics
- Performance insights

## 🔧 İleri Seviye Konfigürasyonlar

### Workers (Opsiyonel)

Edge'de özel logic için Cloudflare Worker oluşturabilirsin:

```javascript
// cloudflare-worker.js
export default {
  async fetch(request, env) {
    // Custom logic
    const response = await fetch(request);
    
    // Add custom headers
    const newResponse = new Response(response.body, response);
    newResponse.headers.set('X-Custom-Header', 'DuyguMotor');
    
    return newResponse;
  }
}
```

### Argo Smart Routing (Ücretli)

Daha hızlı routing için:
- Network → Argo Smart Routing → Enable
- ~$5/ay + $0.10/GB

### Load Balancing (Ücretli)

Multiple Railway instance'lar için:
- Traffic → Load Balancing
- Health checks
- Failover

## ✅ Test Et

### DNS Propagation
```bash
nslookup yourdomain.com
dig yourdomain.com
```

### SSL Test
```
https://www.ssllabs.com/ssltest/
```

### Performance Test
```
https://www.webpagetest.org/
https://pagespeed.web.dev/
```

### Cloudflare Analytics
- Real-time traffic
- Cache hit rate (hedef: >80%)
- Bandwidth savings

## 🎯 Beklenen Sonuçlar

✅ **SSL/TLS:** A+ Rating  
✅ **Cache Hit Rate:** %80-95  
✅ **TTFB:** <200ms (dünya çapında)  
✅ **DDoS Protection:** Otomatik  
✅ **Bandwidth Tasarrufu:** %60-80  
✅ **Uptime:** %99.99  

## 🆘 Sorun Giderme

### "Too Many Redirects"
- SSL/TLS mode'u `Full (strict)` yap
- Railway'de HTTPS zorlamasını kontrol et

### "Cache Her Zaman Miss"
- Cache rules'u kontrol et
- Cache-Control headers'ı logla

### "CORS Errors"
- security.ts'deki CORS ayarlarını kontrol et
- Cloudflare domain'i `ALLOWED_ORIGINS`'e ekle

### "Slow API Responses"
- `/api/*` için cache bypass'ı kontrol et
- Railway logs'u incele

## 📚 Kaynaklar

- [Cloudflare Docs](https://developers.cloudflare.com/)
- [Railway Docs - Custom Domains](https://docs.railway.app/deploy/custom-domains)
- [Cloudflare Page Rules](https://developers.cloudflare.com/rules/page-rules/)

## 🎉 Tamamlandı!

Artık DuyguMotor:
- 🌍 Global CDN ile hızlı
- 🔒 DDoS korumalı
- 📊 Analytics'e sahip
- 🚀 Production-ready!


