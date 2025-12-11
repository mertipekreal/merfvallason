/**
 * MERF.AI - Servis Kayıt Dosyası (Service Registry)
 * 
 * Bu dosya projedeki tüm servislerin merkezi haritasıdır.
 * IDE'de ServiceRegistry. yazdığınızda tüm servisler otomatik tamamlanır.
 * 
 * Son Güncelleme: 2024-12-09
 */

export const ServiceRegistry = {
  core: {
    geminiAI: {
      name: "Gemini AI Chat",
      path: "server/domains/core/services/gemini-ai-service.ts",
      description: "Türkçe destekli AI sohbet, duygusal durum takibi",
      endpoints: ["/api/ai/chat", "/api/chat"],
      dependencies: ["@google/genai"]
    },
    sentiment: {
      name: "Sentiment Analysis",
      path: "server/domains/core/services/sentiment-service.ts",
      description: "Sosyal medya içerik duygu analizi",
      endpoints: ["/api/analytics"],
      dependencies: ["OpenAI"]
    },
    scraping: {
      name: "Social Media Scraper",
      path: "server/domains/core/services/apify-scraper.ts",
      description: "TikTok, Instagram, Twitter veri toplama",
      endpoints: ["/api/social/scrape", "/api/apify"],
      dependencies: ["Apify"]
    },
    spotify: {
      name: "Spotify Integration",
      path: "server/domains/core/services/spotify-service.ts",
      description: "Müzik analizi, playlist skorlama",
      endpoints: ["/api/spotify"],
      dependencies: ["@spotify/web-api-ts-sdk"]
    },
    automation: {
      name: "24/7 Automation",
      path: "server/domains/core/services/automation-service.ts",
      description: "Arka plan işleri, zamanlanmış görevler",
      endpoints: ["/api/automation"],
      dependencies: ["BullMQ", "Redis"]
    }
  },

  market: {
    samAnalysis: {
      name: "SAM Analysis Service",
      path: "server/domains/market/services/sam-analysis-service.ts",
      description: "Bilinçaltı Analiz Modeli - Night Owl, Dissonance, DFI, HVDC",
      endpoints: ["/api/sam", "/api/market/sam-metrics"],
      dependencies: ["FinBERT", "DreamBank"],
      features: [
        "Night Owl Indicator (02:00-05:00 analizi)",
        "Dissonance Score (söylem-eylem uyumsuzluğu)",
        "Dream Fear Index (HVDC korku analizi)",
        "Temporal Risk Analysis (5 zaman dilimi)",
        "Integrated Risk Report (4 katmanlı risk)"
      ]
    },
    finbert: {
      name: "FinBERT Sentiment",
      path: "server/domains/market/services/finbert-sentiment-service.ts",
      description: "Finansal metin duygu analizi",
      endpoints: ["/api/finbert"],
      dependencies: ["HuggingFace"]
    },
    prediction: {
      name: "Market Prediction Engine",
      path: "server/domains/market/services/prediction-engine-service.ts",
      description: "4 katmanlı piyasa tahmin motoru",
      endpoints: ["/api/market/predictions"],
      dependencies: ["SAMAnalysis", "FRED", "TechnicalAnalysis"]
    },
    backtest: {
      name: "Backtest Service",
      path: "server/domains/market/services/backtest-service.ts",
      description: "Tarihsel veri ile tahmin doğrulama",
      endpoints: ["/api/backtest"],
      dependencies: ["HistoricalData", "DreamBank"]
    },
    fred: {
      name: "FRED Economic Data",
      path: "server/domains/market/services/fred-service.ts",
      description: "Ekonomik göstergeler (VIX, T10Y2Y, UMCSENT)",
      endpoints: ["/api/market/economic-indicators"],
      dependencies: ["FRED API"]
    },
    historicalData: {
      name: "Historical Data Service",
      path: "server/domains/market/services/historical-data-service.ts",
      description: "Yahoo Finance, FRED tarihsel veri",
      endpoints: ["/api/historical"],
      dependencies: ["Yahoo Finance", "FRED"]
    },
    liveSignals: {
      name: "Live Signal Service",
      path: "server/domains/market/services/live-signal-service.ts",
      description: "Gerçek zamanlı trading sinyalleri",
      endpoints: ["/ws/signals"],
      dependencies: ["WebSocket"]
    },
    unusualWhales: {
      name: "Unusual Whales",
      path: "server/domains/market/services/unusual-whales-service.ts",
      description: "Options flow, dark pool, whale trades",
      endpoints: ["/api/unusual-whales"],
      dependencies: ["Unusual Whales API"]
    }
  },

  creative: {
    contentOptimization: {
      name: "Content Optimization",
      path: "server/domains/creative/services/content-optimization-service.ts",
      description: "İçerik optimizasyonu ve dual-layer analiz",
      endpoints: ["/api/content"],
      dependencies: ["OpenAI", "Runway"]
    },
    nftGenesis: {
      name: "NFT Genesis",
      path: "server/domains/creative/services/nft-genesis-service.ts",
      description: "Genesis NFT oluşturma ve ranking",
      endpoints: ["/api/nft"],
      dependencies: ["DALL-E", "Runway"]
    },
    runway: {
      name: "Runway AI",
      path: "server/domains/creative/services/runway-service.ts",
      description: "AI görsel oluşturma",
      endpoints: ["/api/runway"],
      dependencies: ["Runway API"]
    }
  },

  valuation: {
    dreamDejavu: {
      name: "Dream-DejaVu Service",
      path: "server/domains/valuation/services/dream-dejavu-service.ts",
      description: "Rüya analizi, HVDC Index, A/F Index",
      endpoints: ["/api/dreams", "/api/dejavu"],
      dependencies: ["SAMAnalysis"],
      features: [
        "Hall/Van de Castle Index",
        "A/F Index (saldırganlık/dostluk oranı)",
        "Victimization Percent",
        "Dream-Market Correlation"
      ]
    },
    humanProfile: {
      name: "Human CV Profiling",
      path: "server/domains/valuation/services/human-profile-service.ts",
      description: "Kişilik profilleme, Jung arketipleri",
      endpoints: ["/api/fate"],
      dependencies: ["GeminiAI"]
    },
    accountSniper: {
      name: "Account Sniper",
      path: "server/domains/valuation/services/account-sniper-service.ts",
      description: "Sosyal medya hesap değerleme",
      endpoints: ["/api/valuation"],
      dependencies: ["SentimentAnalysis", "EngagementMetrics"]
    }
  }
} as const;

export type ServiceMap = typeof ServiceRegistry;
export type DomainName = keyof ServiceMap;
export type ServiceName<D extends DomainName> = keyof ServiceMap[D];

export function getServiceInfo<D extends DomainName, S extends ServiceName<D>>(
  domain: D,
  service: S
): ServiceMap[D][S] {
  return ServiceRegistry[domain][service];
}

export function listAllServices(): Array<{
  domain: string;
  service: string;
  path: string;
  description: string;
}> {
  const result: Array<{ domain: string; service: string; path: string; description: string }> = [];
  
  for (const [domainName, services] of Object.entries(ServiceRegistry)) {
    for (const [serviceName, info] of Object.entries(services)) {
      result.push({
        domain: domainName,
        service: serviceName,
        path: (info as any).path,
        description: (info as any).description
      });
    }
  }
  
  return result;
}
