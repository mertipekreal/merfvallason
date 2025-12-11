import { generativeUI, EmotionalTheme } from "../generative-ui-service";
import type { ToolCallResult, ToolDefinition } from "./index";

export const generativeUIToolDefinitions: ToolDefinition[] = [
  {
    name: "analyze_theme",
    description: "Verilen metni analiz ederek duygusal tema ve renk paleti önerir. Rüya, metin veya herhangi bir içerik için kullanılabilir.",
    parameters: {
      type: "object",
      properties: {
        content: { type: "string", description: "Analiz edilecek metin içeriği" },
      },
      required: ["content"],
    },
  },
  {
    name: "get_dream_theme",
    description: "Belirli bir rüya için önerilen temayı ve renk paletini getirir. Rüya ID'si ile kullanılır.",
    parameters: {
      type: "object",
      properties: {
        dreamId: { type: "string", description: "Rüya ID'si" },
      },
      required: ["dreamId"],
    },
  },
  {
    name: "list_themes",
    description: "Tüm mevcut duygusal temaları listeler. Her tema için isim ve açıklama içerir.",
    parameters: {
      type: "object",
      properties: {},
      required: [],
    },
  },
  {
    name: "get_theme_details",
    description: "Belirli bir temanın detaylı renk paleti, gradyanları ve efektlerini getirir.",
    parameters: {
      type: "object",
      properties: {
        theme: { type: "string", description: "Tema adı (celestial, oceanic, volcanic, verdant, ethereal, shadow, aurora, desert, cosmic, default)" },
      },
      required: ["theme"],
    },
  },
  {
    name: "set_active_theme",
    description: "Aktif temayı değiştirir. UI bu temaya göre dinamik olarak güncellenir.",
    parameters: {
      type: "object",
      properties: {
        theme: { type: "string", description: "Tema adı" },
      },
      required: ["theme"],
    },
  },
  {
    name: "blend_themes",
    description: "İki temayı belirli bir oranda karıştırarak yeni bir tema oluşturur.",
    parameters: {
      type: "object",
      properties: {
        theme1: { type: "string", description: "İlk tema" },
        theme2: { type: "string", description: "İkinci tema" },
        ratio: { type: "number", description: "Karışım oranı (0-1, varsayılan 0.5)" },
      },
      required: ["theme1", "theme2"],
    },
  },
];

export async function executeGenerativeUITool(
  toolName: string,
  args: Record<string, any>
): Promise<ToolCallResult> {
  switch (toolName) {
    case "analyze_theme": {
      const content = args.content as string;
      if (!content) {
        return { success: false, message: "İçerik gerekli", error: "Missing content" };
      }
      
      try {
        const analysis = await generativeUI.analyzeContentForTheme(content);
        
        return {
          success: true,
          data: {
            theme: analysis.theme,
            themeName: analysis.config.name,
            themeDescription: analysis.config.description,
            confidence: (analysis.confidence * 100).toFixed(1) + '%',
            detectedKeywords: analysis.keywords,
            emotionalAnalysis: {
              dominantEmotion: analysis.emotionalAnalysis.dominantEmotion,
              intensity: (analysis.emotionalAnalysis.intensity * 100).toFixed(0) + '%',
              valence: analysis.emotionalAnalysis.valence > 0 ? 'Pozitif' : analysis.emotionalAnalysis.valence < 0 ? 'Negatif' : 'Nötr',
            },
            colors: {
              primary: `hsl(${analysis.config.colors.primary})`,
              accent: `hsl(${analysis.config.colors.accent})`,
              background: `hsl(${analysis.config.colors.background})`,
            },
            effects: analysis.config.effects,
          },
          message: `Tema Analizi: ${analysis.config.name} (${(analysis.confidence * 100).toFixed(0)}% güven) - ${analysis.emotionalAnalysis.dominantEmotion} duygusu baskın`,
        };
      } catch (error: any) {
        return { success: false, message: error.message, error: error.message };
      }
    }
    
    case "get_dream_theme": {
      const dreamId = args.dreamId as string;
      if (!dreamId) {
        return { success: false, message: "Rüya ID'si gerekli", error: "Missing dreamId" };
      }
      
      try {
        const result = await generativeUI.getThemeForDream(dreamId);
        
        if (!result) {
          return { success: false, message: "Rüya bulunamadı", error: "Dream not found" };
        }
        
        return {
          success: true,
          data: {
            dreamTitle: result.dream.title,
            dreamPreview: result.dream.content,
            theme: result.theme,
            themeName: result.config.name,
            themeDescription: result.config.description,
            analysis: result.analysis,
            colorPalette: {
              primary: `hsl(${result.config.colors.primary})`,
              secondary: `hsl(${result.config.colors.secondary})`,
              accent: `hsl(${result.config.colors.accent})`,
              background: `hsl(${result.config.colors.background})`,
              glow: `hsl(${result.config.colors.glow})`,
            },
            gradients: result.config.gradients,
            effects: result.config.effects,
          },
          message: `"${result.dream.title}" için ${result.config.name} teması önerildi (${(result.analysis.confidence * 100).toFixed(0)}% güven)`,
        };
      } catch (error: any) {
        return { success: false, message: error.message, error: error.message };
      }
    }
    
    case "list_themes": {
      try {
        const themes = generativeUI.getAllThemes();
        
        return {
          success: true,
          data: {
            themeCount: themes.length,
            themes: themes.map(t => ({
              id: t.id,
              name: t.name,
              description: t.description,
            })),
            categories: {
              mistik: ['celestial', 'shadow', 'cosmic'],
              dogal: ['oceanic', 'verdant', 'desert'],
              duygusal: ['volcanic', 'ethereal', 'aurora'],
              notr: ['default'],
            },
          },
          message: `${themes.length} duygusal tema mevcut: ${themes.map(t => t.name).join(', ')}`,
        };
      } catch (error: any) {
        return { success: false, message: error.message, error: error.message };
      }
    }
    
    case "get_theme_details": {
      const theme = args.theme as string;
      if (!theme) {
        return { success: false, message: "Tema adı gerekli", error: "Missing theme" };
      }
      
      try {
        const config = generativeUI.getThemePreset(theme as EmotionalTheme);
        
        return {
          success: true,
          data: {
            name: config.name,
            description: config.description,
            colors: {
              primary: `hsl(${config.colors.primary})`,
              secondary: `hsl(${config.colors.secondary})`,
              accent: `hsl(${config.colors.accent})`,
              background: `hsl(${config.colors.background})`,
              foreground: `hsl(${config.colors.foreground})`,
              muted: `hsl(${config.colors.muted})`,
              card: `hsl(${config.colors.card})`,
              border: `hsl(${config.colors.border})`,
              glow: `hsl(${config.colors.glow})`,
            },
            gradients: config.gradients,
            effects: config.effects,
            emotionalProfile: {
              sentiment: (config.emotionalProfile.sentiment * 100).toFixed(0) + '%',
              energy: (config.emotionalProfile.energy * 100).toFixed(0) + '%',
              mystery: (config.emotionalProfile.mystery * 100).toFixed(0) + '%',
              warmth: (config.emotionalProfile.warmth * 100).toFixed(0) + '%',
            },
          },
          message: `${config.name} teması: ${config.description}`,
        };
      } catch (error: any) {
        return { success: false, message: error.message, error: error.message };
      }
    }
    
    case "set_active_theme": {
      const theme = args.theme as string;
      if (!theme) {
        return { success: false, message: "Tema adı gerekli", error: "Missing theme" };
      }
      
      try {
        const config = generativeUI.setTheme(theme as EmotionalTheme);
        
        return {
          success: true,
          data: {
            activeTheme: theme,
            themeName: config.name,
            themeDescription: config.description,
            cssVariables: {
              '--primary': config.colors.primary,
              '--secondary': config.colors.secondary,
              '--accent': config.colors.accent,
              '--background': config.colors.background,
              '--foreground': config.colors.foreground,
              '--card': config.colors.card,
              '--border': config.colors.border,
              '--glow': config.colors.glow,
            },
            shouldApplyImmediately: true,
          },
          message: `Tema ${config.name} olarak ayarlandı. UI güncellenecek.`,
        };
      } catch (error: any) {
        return { success: false, message: error.message, error: error.message };
      }
    }
    
    case "blend_themes": {
      const theme1 = args.theme1 as string;
      const theme2 = args.theme2 as string;
      const ratio = (args.ratio as number) ?? 0.5;
      
      if (!theme1 || !theme2) {
        return { success: false, message: "İki tema adı gerekli", error: "Missing themes" };
      }
      
      try {
        const blended = generativeUI.blendThemes(
          theme1 as EmotionalTheme,
          theme2 as EmotionalTheme,
          ratio
        );
        
        return {
          success: true,
          data: {
            name: blended.name,
            description: blended.description,
            blendRatio: `${theme1}: ${(ratio * 100).toFixed(0)}%, ${theme2}: ${((1 - ratio) * 100).toFixed(0)}%`,
            colors: {
              primary: `hsl(${blended.colors.primary})`,
              accent: `hsl(${blended.colors.accent})`,
              background: `hsl(${blended.colors.background})`,
            },
            emotionalProfile: blended.emotionalProfile,
          },
          message: `${theme1} ve ${theme2} temaları karıştırıldı (${(ratio * 100).toFixed(0)}% / ${((1 - ratio) * 100).toFixed(0)}%)`,
        };
      } catch (error: any) {
        return { success: false, message: error.message, error: error.message };
      }
    }
    
    default:
      return { success: false, message: `Bilinmeyen araç: ${toolName}`, error: `Unknown tool: ${toolName}` };
  }
}
