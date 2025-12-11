import { db } from "./db";
import { dreams } from "@shared/schema";
import { eq } from "drizzle-orm";

export interface ThemeConfig {
  name: string;
  description: string;
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    foreground: string;
    muted: string;
    card: string;
    cardForeground: string;
    destructive: string;
    border: string;
    glow: string;
  };
  gradients: {
    hero: string;
    card: string;
    overlay: string;
  };
  effects: {
    blur: number;
    glow: boolean;
    particles: boolean;
    animation: string;
  };
  emotionalProfile: {
    sentiment: number;
    energy: number;
    mystery: number;
    warmth: number;
  };
}

export type EmotionalTheme = 
  | 'celestial'     // Mystical, cosmic dreams (mor/lacivert)
  | 'oceanic'       // Calm, water-related dreams (mavi/cyan)
  | 'volcanic'      // Intense, passionate dreams (kırmızı/turuncu)
  | 'verdant'       // Nature, growth dreams (yeşil/altın)
  | 'ethereal'      // Light, spiritual dreams (beyaz/gümüş)
  | 'shadow'        // Dark, mysterious dreams (siyah/mor)
  | 'aurora'        // Transformative dreams (çok renkli)
  | 'desert'        // Journey, solitude dreams (kumlu/bronz)
  | 'cosmic'        // Space, infinity dreams (koyu mavi/yıldız)
  | 'default';      // Neutral state

const THEME_PRESETS: Record<EmotionalTheme, ThemeConfig> = {
  celestial: {
    name: 'Göksel',
    description: 'Mistik ve kozmik rüyalar için mor-lacivert tonları',
    colors: {
      primary: '270 70% 50%',
      secondary: '240 60% 40%',
      accent: '280 80% 60%',
      background: '240 30% 8%',
      foreground: '270 30% 95%',
      muted: '240 20% 30%',
      card: '250 35% 12%',
      cardForeground: '270 20% 90%',
      destructive: '0 80% 50%',
      border: '260 40% 25%',
      glow: '270 100% 70%',
    },
    gradients: {
      hero: 'linear-gradient(135deg, hsl(270 70% 20%), hsl(240 60% 15%))',
      card: 'linear-gradient(180deg, hsl(250 35% 15%), hsl(250 35% 10%))',
      overlay: 'radial-gradient(circle at 50% 0%, hsl(270 80% 30% / 0.3), transparent 70%)',
    },
    effects: {
      blur: 80,
      glow: true,
      particles: true,
      animation: 'float',
    },
    emotionalProfile: {
      sentiment: 0.6,
      energy: 0.7,
      mystery: 0.9,
      warmth: 0.4,
    },
  },
  oceanic: {
    name: 'Okyanus',
    description: 'Sakin ve su temalı rüyalar için mavi-cyan tonları',
    colors: {
      primary: '195 90% 50%',
      secondary: '200 70% 35%',
      accent: '180 80% 45%',
      background: '200 40% 6%',
      foreground: '190 30% 95%',
      muted: '200 25% 25%',
      card: '200 35% 10%',
      cardForeground: '190 20% 90%',
      destructive: '0 80% 50%',
      border: '195 35% 22%',
      glow: '180 100% 60%',
    },
    gradients: {
      hero: 'linear-gradient(180deg, hsl(200 50% 15%), hsl(195 60% 8%))',
      card: 'linear-gradient(180deg, hsl(200 35% 12%), hsl(200 35% 8%))',
      overlay: 'radial-gradient(ellipse at 50% 100%, hsl(195 80% 40% / 0.2), transparent 60%)',
    },
    effects: {
      blur: 60,
      glow: true,
      particles: false,
      animation: 'wave',
    },
    emotionalProfile: {
      sentiment: 0.7,
      energy: 0.3,
      mystery: 0.5,
      warmth: 0.4,
    },
  },
  volcanic: {
    name: 'Volkanik',
    description: 'Yoğun ve tutkulu rüyalar için kırmızı-turuncu tonları',
    colors: {
      primary: '15 90% 55%',
      secondary: '0 70% 45%',
      accent: '30 85% 50%',
      background: '0 30% 7%',
      foreground: '20 30% 95%',
      muted: '10 25% 25%',
      card: '5 35% 11%',
      cardForeground: '20 20% 90%',
      destructive: '0 90% 60%',
      border: '10 40% 22%',
      glow: '20 100% 55%',
    },
    gradients: {
      hero: 'linear-gradient(135deg, hsl(0 50% 18%), hsl(20 60% 12%))',
      card: 'linear-gradient(180deg, hsl(5 35% 14%), hsl(5 35% 9%))',
      overlay: 'radial-gradient(circle at 30% 80%, hsl(20 80% 40% / 0.25), transparent 50%)',
    },
    effects: {
      blur: 100,
      glow: true,
      particles: true,
      animation: 'pulse',
    },
    emotionalProfile: {
      sentiment: 0.5,
      energy: 0.95,
      mystery: 0.4,
      warmth: 0.9,
    },
  },
  verdant: {
    name: 'Bereketli',
    description: 'Doğa ve büyüme temalı rüyalar için yeşil-altın tonları',
    colors: {
      primary: '140 70% 45%',
      secondary: '120 50% 35%',
      accent: '45 80% 50%',
      background: '140 30% 6%',
      foreground: '130 30% 95%',
      muted: '130 20% 25%',
      card: '135 30% 10%',
      cardForeground: '130 20% 90%',
      destructive: '0 80% 50%',
      border: '135 35% 22%',
      glow: '130 80% 55%',
    },
    gradients: {
      hero: 'linear-gradient(180deg, hsl(130 40% 12%), hsl(140 50% 8%))',
      card: 'linear-gradient(180deg, hsl(135 30% 12%), hsl(135 30% 8%))',
      overlay: 'radial-gradient(ellipse at 70% 30%, hsl(45 70% 40% / 0.15), transparent 50%)',
    },
    effects: {
      blur: 50,
      glow: false,
      particles: true,
      animation: 'grow',
    },
    emotionalProfile: {
      sentiment: 0.85,
      energy: 0.6,
      mystery: 0.3,
      warmth: 0.7,
    },
  },
  ethereal: {
    name: 'Uhrevi',
    description: 'Hafif ve ruhani rüyalar için beyaz-gümüş tonları',
    colors: {
      primary: '0 0% 95%',
      secondary: '210 15% 80%',
      accent: '40 30% 70%',
      background: '220 15% 12%',
      foreground: '0 0% 98%',
      muted: '220 10% 35%',
      card: '220 15% 16%',
      cardForeground: '0 0% 95%',
      destructive: '0 80% 50%',
      border: '220 15% 28%',
      glow: '0 0% 100%',
    },
    gradients: {
      hero: 'linear-gradient(180deg, hsl(220 15% 18%), hsl(220 15% 10%))',
      card: 'linear-gradient(180deg, hsl(220 15% 18%), hsl(220 15% 14%))',
      overlay: 'radial-gradient(circle at 50% 20%, hsl(0 0% 100% / 0.1), transparent 60%)',
    },
    effects: {
      blur: 120,
      glow: true,
      particles: true,
      animation: 'float',
    },
    emotionalProfile: {
      sentiment: 0.9,
      energy: 0.2,
      mystery: 0.6,
      warmth: 0.5,
    },
  },
  shadow: {
    name: 'Gölge',
    description: 'Karanlık ve gizemli rüyalar için siyah-mor tonları',
    colors: {
      primary: '280 50% 40%',
      secondary: '260 40% 30%',
      accent: '320 60% 45%',
      background: '270 30% 4%',
      foreground: '280 15% 90%',
      muted: '270 20% 20%',
      card: '270 25% 8%',
      cardForeground: '280 15% 85%',
      destructive: '0 80% 50%',
      border: '270 30% 18%',
      glow: '280 70% 50%',
    },
    gradients: {
      hero: 'linear-gradient(180deg, hsl(270 30% 8%), hsl(280 35% 3%))',
      card: 'linear-gradient(180deg, hsl(270 25% 10%), hsl(270 25% 6%))',
      overlay: 'radial-gradient(circle at 50% 50%, hsl(280 50% 20% / 0.2), transparent 70%)',
    },
    effects: {
      blur: 150,
      glow: true,
      particles: false,
      animation: 'shadow',
    },
    emotionalProfile: {
      sentiment: 0.3,
      energy: 0.4,
      mystery: 1.0,
      warmth: 0.2,
    },
  },
  aurora: {
    name: 'Aurora',
    description: 'Dönüşüm ve değişim rüyaları için çok renkli tonlar',
    colors: {
      primary: '160 80% 50%',
      secondary: '280 70% 55%',
      accent: '45 90% 55%',
      background: '220 35% 7%',
      foreground: '180 30% 95%',
      muted: '200 25% 25%',
      card: '210 30% 11%',
      cardForeground: '180 20% 92%',
      destructive: '0 80% 50%',
      border: '200 30% 22%',
      glow: '160 100% 60%',
    },
    gradients: {
      hero: 'linear-gradient(135deg, hsl(280 50% 20%), hsl(180 60% 15%), hsl(45 50% 20%))',
      card: 'linear-gradient(180deg, hsl(210 30% 13%), hsl(210 30% 9%))',
      overlay: 'linear-gradient(180deg, hsl(160 70% 40% / 0.1), hsl(280 70% 50% / 0.1), transparent)',
    },
    effects: {
      blur: 100,
      glow: true,
      particles: true,
      animation: 'aurora',
    },
    emotionalProfile: {
      sentiment: 0.75,
      energy: 0.8,
      mystery: 0.7,
      warmth: 0.6,
    },
  },
  desert: {
    name: 'Çöl',
    description: 'Yolculuk ve yalnızlık rüyaları için kumlu-bronz tonları',
    colors: {
      primary: '35 70% 55%',
      secondary: '25 55% 40%',
      accent: '45 80% 45%',
      background: '30 25% 7%',
      foreground: '35 25% 93%',
      muted: '30 20% 28%',
      card: '30 25% 11%',
      cardForeground: '35 20% 88%',
      destructive: '0 80% 50%',
      border: '30 30% 22%',
      glow: '40 90% 55%',
    },
    gradients: {
      hero: 'linear-gradient(180deg, hsl(25 40% 15%), hsl(35 50% 10%))',
      card: 'linear-gradient(180deg, hsl(30 25% 13%), hsl(30 25% 9%))',
      overlay: 'radial-gradient(ellipse at 80% 20%, hsl(45 70% 50% / 0.15), transparent 60%)',
    },
    effects: {
      blur: 40,
      glow: false,
      particles: true,
      animation: 'drift',
    },
    emotionalProfile: {
      sentiment: 0.5,
      energy: 0.4,
      mystery: 0.6,
      warmth: 0.8,
    },
  },
  cosmic: {
    name: 'Kozmik',
    description: 'Uzay ve sonsuzluk rüyaları için koyu mavi-yıldız tonları',
    colors: {
      primary: '220 80% 55%',
      secondary: '230 60% 40%',
      accent: '200 90% 60%',
      background: '230 40% 5%',
      foreground: '220 30% 95%',
      muted: '225 25% 22%',
      card: '230 35% 9%',
      cardForeground: '220 20% 92%',
      destructive: '0 80% 50%',
      border: '225 35% 20%',
      glow: '210 100% 65%',
    },
    gradients: {
      hero: 'linear-gradient(180deg, hsl(230 50% 12%), hsl(225 45% 5%))',
      card: 'linear-gradient(180deg, hsl(230 35% 11%), hsl(230 35% 7%))',
      overlay: 'radial-gradient(circle at 30% 30%, hsl(200 80% 50% / 0.1), transparent 50%), radial-gradient(circle at 70% 70%, hsl(280 60% 40% / 0.08), transparent 40%)',
    },
    effects: {
      blur: 80,
      glow: true,
      particles: true,
      animation: 'stars',
    },
    emotionalProfile: {
      sentiment: 0.6,
      energy: 0.5,
      mystery: 0.95,
      warmth: 0.3,
    },
  },
  default: {
    name: 'Varsayılan',
    description: 'DuyguMotor standart tema - koyu mavi tonları',
    colors: {
      primary: '185 80% 50%',
      secondary: '227 31% 25%',
      accent: '185 70% 45%',
      background: '227 31% 8%',
      foreground: '185 30% 95%',
      muted: '227 20% 25%',
      card: '227 31% 13%',
      cardForeground: '185 20% 92%',
      destructive: '0 80% 50%',
      border: '227 25% 20%',
      glow: '185 80% 50%',
    },
    gradients: {
      hero: 'linear-gradient(180deg, hsl(227 31% 15%), hsl(227 31% 8%))',
      card: 'linear-gradient(180deg, hsl(227 31% 15%), hsl(227 31% 11%))',
      overlay: 'radial-gradient(circle at 50% 0%, hsl(185 60% 40% / 0.15), transparent 60%)',
    },
    effects: {
      blur: 60,
      glow: true,
      particles: false,
      animation: 'none',
    },
    emotionalProfile: {
      sentiment: 0.5,
      energy: 0.5,
      mystery: 0.5,
      warmth: 0.5,
    },
  },
};

const EMOTION_KEYWORDS: Record<EmotionalTheme, string[]> = {
  celestial: ['yıldız', 'ay', 'gökyüzü', 'uzay', 'galaksi', 'gezegen', 'melek', 'kanat', 'ışık', 'parlak', 'aydınlık', 'tanrı', 'ilahi', 'mistik', 'büyü', 'sihir'],
  oceanic: ['deniz', 'okyanus', 'su', 'dalga', 'yüzmek', 'balık', 'mavi', 'derin', 'gemi', 'plaj', 'kumsal', 'göl', 'nehir', 'akarsu', 'yunus', 'balina'],
  volcanic: ['ateş', 'alev', 'yanmak', 'sıcak', 'öfke', 'kızgın', 'volkan', 'patlama', 'kavga', 'savaş', 'kan', 'kırmızı', 'turuncu', 'tutku', 'aşk', 'enerji'],
  verdant: ['orman', 'ağaç', 'çiçek', 'bahçe', 'yeşil', 'doğa', 'bitki', 'yaprak', 'toprak', 'büyümek', 'filiz', 'bahar', 'yaz', 'tarla', 'çimen', 'hayvan'],
  ethereal: ['bulut', 'cennet', 'ruh', 'masum', 'beyaz', 'temiz', 'saf', 'huzur', 'sessiz', 'hafif', 'uçmak', 'melek', 'kanat', 'nur', 'aydınlık', 'güzel'],
  shadow: ['karanlık', 'gece', 'korku', 'kabus', 'gölge', 'siyah', 'ölüm', 'mezar', 'hayalet', 'canavar', 'şeytan', 'lanet', 'kötü', 'karmaşık', 'kayıp', 'yalnız'],
  aurora: ['değişim', 'dönüşüm', 'renk', 'gökkuşağı', 'dans', 'müzik', 'parti', 'kutlama', 'doğum', 'yeni', 'farklı', 'çeşitli', 'karma', 'birleşme', 'evlilik'],
  desert: ['çöl', 'kum', 'sıcak', 'yolculuk', 'yürümek', 'araba', 'tren', 'uçak', 'seyahat', 'yalnız', 'susuz', 'kayıp', 'arayış', 'keşif', 'macera', 'deve'],
  cosmic: ['uzay', 'yıldız', 'galaksi', 'evren', 'sonsuz', 'zaman', 'geçmiş', 'gelecek', 'boyut', 'paralel', 'bilim', 'teknoloji', 'robot', 'uzaylı', 'roket', 'astronot'],
  default: [],
};

const SENTIMENT_THEMES: Record<string, EmotionalTheme[]> = {
  very_positive: ['ethereal', 'verdant', 'aurora'],
  positive: ['oceanic', 'celestial', 'aurora'],
  neutral: ['default', 'cosmic', 'desert'],
  negative: ['shadow', 'volcanic', 'desert'],
  very_negative: ['shadow', 'volcanic'],
};

export class GenerativeUIService {
  private currentTheme: EmotionalTheme = 'default';
  
  async analyzeContentForTheme(content: string): Promise<{
    theme: EmotionalTheme;
    config: ThemeConfig;
    confidence: number;
    keywords: string[];
    emotionalAnalysis: {
      dominantEmotion: string;
      intensity: number;
      valence: number;
    };
  }> {
    const contentLower = content.toLowerCase();
    const matchedKeywords: { theme: EmotionalTheme; keywords: string[] }[] = [];
    
    for (const [theme, keywords] of Object.entries(EMOTION_KEYWORDS)) {
      const matches = keywords.filter(kw => contentLower.includes(kw));
      if (matches.length > 0) {
        matchedKeywords.push({
          theme: theme as EmotionalTheme,
          keywords: matches,
        });
      }
    }
    
    matchedKeywords.sort((a, b) => b.keywords.length - a.keywords.length);
    
    let selectedTheme: EmotionalTheme = 'default';
    let confidence = 0.5;
    let detectedKeywords: string[] = [];
    
    if (matchedKeywords.length > 0) {
      selectedTheme = matchedKeywords[0].theme;
      detectedKeywords = matchedKeywords[0].keywords;
      confidence = Math.min(0.95, 0.5 + (matchedKeywords[0].keywords.length * 0.1));
    }
    
    const sentimentScore = this.analyzeSentiment(content);
    const emotion = this.detectDominantEmotion(content, sentimentScore);
    
    if (confidence < 0.7) {
      const sentimentThemes = this.getThemesForSentiment(sentimentScore);
      if (sentimentThemes.length > 0 && !sentimentThemes.includes(selectedTheme)) {
        selectedTheme = sentimentThemes[0];
        confidence = Math.min(confidence + 0.15, 0.8);
      }
    }
    
    this.currentTheme = selectedTheme;
    
    return {
      theme: selectedTheme,
      config: THEME_PRESETS[selectedTheme],
      confidence,
      keywords: detectedKeywords,
      emotionalAnalysis: {
        dominantEmotion: emotion.emotion,
        intensity: emotion.intensity,
        valence: sentimentScore,
      },
    };
  }
  
  private analyzeSentiment(content: string): number {
    const positiveWords = ['mutlu', 'güzel', 'harika', 'sevgi', 'aşk', 'huzur', 'neşe', 'sevinç', 'umut', 'başarı', 'güven', 'iyi', 'tatlı', 'sıcak', 'parlak'];
    const negativeWords = ['üzgün', 'korku', 'kabus', 'kötü', 'ölüm', 'acı', 'kayıp', 'yalnız', 'karanlık', 'soğuk', 'kırık', 'ağlamak', 'öfke', 'nefret', 'endişe'];
    
    const contentLower = content.toLowerCase();
    let positiveCount = 0;
    let negativeCount = 0;
    
    positiveWords.forEach(word => {
      if (contentLower.includes(word)) positiveCount++;
    });
    
    negativeWords.forEach(word => {
      if (contentLower.includes(word)) negativeCount++;
    });
    
    const total = positiveCount + negativeCount;
    if (total === 0) return 0;
    
    return (positiveCount - negativeCount) / total;
  }
  
  private detectDominantEmotion(content: string, sentiment: number): { emotion: string; intensity: number } {
    const emotions: Record<string, string[]> = {
      'sevinç': ['mutlu', 'neşeli', 'gülen', 'eğlence', 'parti', 'kutlama'],
      'huzur': ['sakin', 'rahat', 'dinlenme', 'uyku', 'sessiz', 'barış'],
      'korku': ['korku', 'kabus', 'kaçmak', 'tehlike', 'panik', 'endişe'],
      'üzüntü': ['ağlamak', 'kayıp', 'ayrılık', 'ölüm', 'yalnız', 'kırık'],
      'öfke': ['kızgın', 'kavga', 'savaş', 'öfke', 'nefret', 'bağırmak'],
      'merak': ['keşif', 'yeni', 'bilinmeyen', 'soru', 'arayış', 'düşünce'],
      'aşk': ['aşk', 'sevgi', 'öpücük', 'sarılmak', 'kalp', 'romantik'],
    };
    
    const contentLower = content.toLowerCase();
    let maxEmotion = 'nötr';
    let maxCount = 0;
    
    for (const [emotion, keywords] of Object.entries(emotions)) {
      const count = keywords.filter(kw => contentLower.includes(kw)).length;
      if (count > maxCount) {
        maxCount = count;
        maxEmotion = emotion;
      }
    }
    
    return {
      emotion: maxEmotion,
      intensity: Math.min(1, maxCount * 0.2 + Math.abs(sentiment) * 0.5),
    };
  }
  
  private getThemesForSentiment(sentiment: number): EmotionalTheme[] {
    if (sentiment > 0.5) return SENTIMENT_THEMES.very_positive;
    if (sentiment > 0.2) return SENTIMENT_THEMES.positive;
    if (sentiment < -0.5) return SENTIMENT_THEMES.very_negative;
    if (sentiment < -0.2) return SENTIMENT_THEMES.negative;
    return SENTIMENT_THEMES.neutral;
  }
  
  async getThemeForDream(dreamId: string): Promise<{
    theme: EmotionalTheme;
    config: ThemeConfig;
    dream: { title: string; content: string };
    analysis: {
      keywords: string[];
      confidence: number;
      dominantEmotion: string;
    };
  } | null> {
    if (!db) return null;
    
    const [dream] = await db.select().from(dreams).where(eq(dreams.id, dreamId)).limit(1);
    
    if (!dream) return null;
    
    const content = `${dream.title || ''} ${dream.description}`;
    const analysis = await this.analyzeContentForTheme(content);
    
    return {
      theme: analysis.theme,
      config: analysis.config,
      dream: {
        title: dream.title || 'İsimsiz Rüya',
        content: dream.description.substring(0, 200) + '...',
      },
      analysis: {
        keywords: analysis.keywords,
        confidence: analysis.confidence,
        dominantEmotion: analysis.emotionalAnalysis.dominantEmotion,
      },
    };
  }
  
  getThemePreset(theme: EmotionalTheme): ThemeConfig {
    return THEME_PRESETS[theme] || THEME_PRESETS.default;
  }
  
  getAllThemes(): { id: EmotionalTheme; name: string; description: string }[] {
    return Object.entries(THEME_PRESETS).map(([id, config]) => ({
      id: id as EmotionalTheme,
      name: config.name,
      description: config.description,
    }));
  }
  
  getCurrentTheme(): EmotionalTheme {
    return this.currentTheme;
  }
  
  setTheme(theme: EmotionalTheme): ThemeConfig {
    this.currentTheme = theme;
    return THEME_PRESETS[theme];
  }
  
  async generateThemeFromText(text: string): Promise<ThemeConfig> {
    const analysis = await this.analyzeContentForTheme(text);
    return analysis.config;
  }
  
  blendThemes(theme1: EmotionalTheme, theme2: EmotionalTheme, ratio: number = 0.5): ThemeConfig {
    const t1 = THEME_PRESETS[theme1];
    const t2 = THEME_PRESETS[theme2];
    
    return {
      name: `${t1.name}-${t2.name} Karışım`,
      description: `${t1.description} ve ${t2.description} karışımı`,
      colors: this.blendColors(t1.colors, t2.colors, ratio),
      gradients: t1.gradients,
      effects: ratio > 0.5 ? t1.effects : t2.effects,
      emotionalProfile: {
        sentiment: t1.emotionalProfile.sentiment * ratio + t2.emotionalProfile.sentiment * (1 - ratio),
        energy: t1.emotionalProfile.energy * ratio + t2.emotionalProfile.energy * (1 - ratio),
        mystery: t1.emotionalProfile.mystery * ratio + t2.emotionalProfile.mystery * (1 - ratio),
        warmth: t1.emotionalProfile.warmth * ratio + t2.emotionalProfile.warmth * (1 - ratio),
      },
    };
  }
  
  private blendColors(c1: ThemeConfig['colors'], c2: ThemeConfig['colors'], ratio: number): ThemeConfig['colors'] {
    const blend = (hsl1: string, hsl2: string): string => {
      const parse = (hsl: string) => {
        const parts = hsl.split(' ').map(p => parseFloat(p.replace('%', '')));
        return { h: parts[0], s: parts[1], l: parts[2] };
      };
      
      const a = parse(hsl1);
      const b = parse(hsl2);
      
      return `${Math.round(a.h * ratio + b.h * (1 - ratio))} ${Math.round(a.s * ratio + b.s * (1 - ratio))}% ${Math.round(a.l * ratio + b.l * (1 - ratio))}%`;
    };
    
    return {
      primary: blend(c1.primary, c2.primary),
      secondary: blend(c1.secondary, c2.secondary),
      accent: blend(c1.accent, c2.accent),
      background: blend(c1.background, c2.background),
      foreground: blend(c1.foreground, c2.foreground),
      muted: blend(c1.muted, c2.muted),
      card: blend(c1.card, c2.card),
      cardForeground: blend(c1.cardForeground, c2.cardForeground),
      destructive: c1.destructive,
      border: blend(c1.border, c2.border),
      glow: blend(c1.glow, c2.glow),
    };
  }
}

export const generativeUI = new GenerativeUIService();
