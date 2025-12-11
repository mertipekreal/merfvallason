import { useState, useEffect, useCallback } from 'react';

export type EmotionalTheme = 
  | 'celestial'     
  | 'oceanic'       
  | 'volcanic'      
  | 'verdant'       
  | 'ethereal'      
  | 'shadow'        
  | 'aurora'        
  | 'desert'        
  | 'cosmic'        
  | 'default';

export interface ThemeColors {
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
}

export interface ThemeConfig {
  name: string;
  description: string;
  colors: ThemeColors;
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

const DEFAULT_THEME: ThemeConfig = {
  name: 'Varsayılan',
  description: 'DuyguMotor standart tema',
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
};

export function useGenerativeTheme() {
  const [currentTheme, setCurrentTheme] = useState<EmotionalTheme>('default');
  const [themeConfig, setThemeConfig] = useState<ThemeConfig>(DEFAULT_THEME);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [themeHistory, setThemeHistory] = useState<EmotionalTheme[]>(['default']);

  const applyTheme = useCallback((config: ThemeConfig, animate = true) => {
    if (animate) {
      setIsTransitioning(true);
    }

    const root = document.documentElement;
    
    Object.entries(config.colors).forEach(([key, value]) => {
      const cssVar = `--${key.replace(/([A-Z])/g, '-$1').toLowerCase()}`;
      root.style.setProperty(cssVar, value);
    });

    root.style.setProperty('--theme-blur', `${config.effects.blur}px`);
    root.style.setProperty('--theme-glow', config.effects.glow ? '1' : '0');
    root.style.setProperty('--theme-animation', config.effects.animation);

    root.setAttribute('data-theme', currentTheme);
    root.setAttribute('data-theme-animation', config.effects.animation);

    if (animate) {
      setTimeout(() => setIsTransitioning(false), 500);
    }

    setThemeConfig(config);
  }, [currentTheme]);

  const setTheme = useCallback(async (theme: EmotionalTheme) => {
    if (theme === currentTheme) return;

    setCurrentTheme(theme);
    setThemeHistory(prev => [...prev.slice(-9), theme]);

    try {
      const response = await fetch(`/api/tools/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          toolName: 'get_theme_details', 
          args: { theme } 
        }),
      });
      
      const result = await response.json();
      
      if (result.success && result.data) {
        const cssColors: ThemeColors = {
          primary: result.data.colors.primary.replace('hsl(', '').replace(')', ''),
          secondary: result.data.colors.secondary.replace('hsl(', '').replace(')', ''),
          accent: result.data.colors.accent.replace('hsl(', '').replace(')', ''),
          background: result.data.colors.background.replace('hsl(', '').replace(')', ''),
          foreground: result.data.colors.foreground.replace('hsl(', '').replace(')', ''),
          muted: result.data.colors.muted.replace('hsl(', '').replace(')', ''),
          card: result.data.colors.card.replace('hsl(', '').replace(')', ''),
          cardForeground: result.data.colors.foreground.replace('hsl(', '').replace(')', ''),
          destructive: '0 80% 50%',
          border: result.data.colors.border.replace('hsl(', '').replace(')', ''),
          glow: result.data.colors.glow.replace('hsl(', '').replace(')', ''),
        };

        const config: ThemeConfig = {
          name: result.data.name,
          description: result.data.description,
          colors: cssColors,
          gradients: result.data.gradients,
          effects: result.data.effects,
          emotionalProfile: {
            sentiment: parseFloat(result.data.emotionalProfile.sentiment) / 100,
            energy: parseFloat(result.data.emotionalProfile.energy) / 100,
            mystery: parseFloat(result.data.emotionalProfile.mystery) / 100,
            warmth: parseFloat(result.data.emotionalProfile.warmth) / 100,
          },
        };

        applyTheme(config);
      }
    } catch (error) {
      console.error('Theme fetch error:', error);
    }
  }, [currentTheme, applyTheme]);

  const analyzeAndApplyTheme = useCallback(async (content: string) => {
    try {
      const response = await fetch(`/api/tools/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          toolName: 'analyze_theme', 
          args: { content } 
        }),
      });
      
      const result = await response.json();
      
      if (result.success && result.data?.theme) {
        await setTheme(result.data.theme);
        return result.data;
      }
    } catch (error) {
      console.error('Theme analysis error:', error);
    }
    return null;
  }, [setTheme]);

  const resetTheme = useCallback(() => {
    setCurrentTheme('default');
    applyTheme(DEFAULT_THEME);
  }, [applyTheme]);

  const goToPreviousTheme = useCallback(() => {
    if (themeHistory.length > 1) {
      const prevTheme = themeHistory[themeHistory.length - 2];
      setThemeHistory(prev => prev.slice(0, -1));
      setTheme(prevTheme);
    }
  }, [themeHistory, setTheme]);

  useEffect(() => {
    applyTheme(DEFAULT_THEME, false);
  }, []);

  return {
    currentTheme,
    themeConfig,
    isTransitioning,
    themeHistory,
    setTheme,
    analyzeAndApplyTheme,
    resetTheme,
    goToPreviousTheme,
    applyTheme,
  };
}

export function extractThemeFromResponse(response: any): EmotionalTheme | null {
  if (!response) return null;

  if (response.toolResults) {
    for (const result of response.toolResults) {
      if (result.data?.theme && typeof result.data.theme === 'string') {
        return result.data.theme as EmotionalTheme;
      }
      if (result.data?.activeTheme && typeof result.data.activeTheme === 'string') {
        return result.data.activeTheme as EmotionalTheme;
      }
    }
  }

  if (response.data?.theme) {
    return response.data.theme as EmotionalTheme;
  }

  return null;
}
