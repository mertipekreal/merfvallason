# Türkçe Duygu Analizi Sistemi

## Genel Bakış

Merf.ai'nin Türkçe Duygu Analizi sistemi, Türk finans piyasaları ve sosyal medya için özelleştirilmiş duygu analizi sağlar. Sistem, Türkçe'nin sondan eklemeli (agglutinative) yapısını ve morfolojik zenginliğini dikkate alarak tasarlanmıştır.

## Özellikler

### 1. Çok Katmanlı Analiz Modeli

- **BERTurk Entegrasyonu**: Hugging Face üzerinden `savasy/bert-base-turkish-sentiment-cased` modeli
- **OpenAI Fallback**: BERTurk yetersiz kaldığında GPT-4 tabanlı Türkçe analiz
- **Hibrit Yaklaşım**: Her iki modelin sonuçlarını birleştirerek daha doğru sonuçlar

### 2. Türkçe NLP Araçları

- **Morfolojik Analiz**: Türkçe ekleri tanıma ve kök çıkarma
- **Dil Tespiti**: Otomatik Türkçe/İngilizce ayırımı
- **Finansal Terim Tanıma**: BIST, TCMB, döviz terimleri

### 3. Veri Kaynakları

| Kaynak | Tür | Açıklama |
|--------|-----|----------|
| Hepsiburada | E-ticaret | Ürün yorumları |
| Trendyol | E-ticaret | Ürün değerlendirmeleri |
| Twitter TR | Sosyal Medya | Türkçe tweetler |
| Ekşi Sözlük | Forum | Entry'ler |
| BIST Haberler | Finans | Borsa haberleri |
| BloombergHT | Finans | Piyasa analizleri |

## API Endpoints

### Türkçe Analiz

```
POST /api/market/emotion/turkish
Body: { "text": "Borsa bugün yükseldi", "symbol": "THYAO" }
```

### Otomatik Dil Tespiti

```
POST /api/market/emotion/auto
Body: { "text": "Any text in Turkish or English" }
```

### BIST Haber Analizi

```
POST /api/market/bist/news
Body: { 
  "headlines": ["Haber 1", "Haber 2"],
  "symbol": "GARAN"
}
```

### Veri Kaynakları Listesi

```
GET /api/market/turkish/data-sources
GET /api/market/turkish/data-sources?type=finans
```

### Sözlük

```
GET /api/market/turkish/lexicon
```

### Sağlık Kontrolü

```
GET /api/market/turkish/health
```

## Duygu Türleri

| Türkçe | İngilizce | Açıklama |
|--------|-----------|----------|
| korku | fear | Piyasa korkusu |
| hırs | greed | Açgözlülük |
| belirsizlik | uncertainty | Kararsızlık |
| umut | optimism | İyimserlik |
| nötr | neutral | Tarafsız |

## Türkçe Finansal Sözlük

### Pozitif Terimler
mükemmel, harika, yükseliş, artış, kar, büyüme, fırsat, boğa, alım, ralli

### Negatif Terimler
düşüş, kayıp, zarar, risk, korku, panik, kriz, ayı, satış, gerileme

### Finansal Terimler
borsa, hisse, dolar, euro, tl, faiz, enflasyon, tcmb, bist, tahvil

## Morfolojik İşleme

Türkçe'nin ekleme yapısı nedeniyle, sistem aşağıdaki ekleri tanır ve işler:

- **İsim Ekleri**: -lar, -ler, -lık, -lik, -lı, -li, -sız, -siz
- **Fiil Ekleri**: -mak, -mek, -yor, -acak, -ecek, -mış, -miş
- **İyelik Ekleri**: -ım, -im, -ın, -in, -ımız, -imiz

## Entegrasyon

```typescript
import { turkishSentimentService } from "./domains/market/services/turkish-sentiment-service";

// Tekli analiz
const result = await turkishSentimentService.analyze("Borsa yükseldi");

// Toplu analiz
const results = await turkishSentimentService.analyzeBatch([
  "BIST 100 rekor kırdı",
  "Dolar düşüşe geçti"
], "THYAO");

// BIST haber analizi
const newsAnalysis = await turkishSentimentService.analyzeBISTNews(
  ["Merkez bankası faiz artırdı"],
  "GARAN"
);
```

## Performans

- **Önbellek**: 10 dakika TTL ile sonuç önbellekleme
- **Batch İşleme**: Paralel metin analizi
- **Hibrit Model**: %70+ güven BERTurk, aksi halde OpenAI

## Gelecek Planlar

1. FinBERT-TR: Finansal metinler için özel eğitilmiş model
2. Gerçek zamanlı Twitter akışı entegrasyonu
3. BIST haber kaynakları otomatik toplama
4. Türkçe ses/video transkript analizi
