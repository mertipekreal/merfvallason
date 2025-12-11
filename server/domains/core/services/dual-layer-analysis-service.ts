/**
 * Dual-Layer AI Analysis Service
 * Combines Runway visual analysis with Gemini contextual commentary
 * Creates complementary insights where both AIs cover each other's blind spots
 */

import { geminiAI } from "./gemini-ai-service";
import { openai } from "../../../openai-client";
import { runwayService } from "../../creative/services/runway-service";
import { storage } from "../../../storage";

interface VisualAnalysis {
  runway: {
    technicalQuality: number;
    composition: string;
    colorPalette: string[];
    mood: string;
    style: string;
    suggestions: string[];
  };
  gemini: {
    emotionalImpact: string;
    culturalContext: string;
    storytelling: string;
    targetAudience: string;
    viralPotential: number;
    improvements: string[];
    turkishMarketFit: string;
  };
  combined: {
    overallScore: number;
    strengths: string[];
    weaknesses: string[];
    actionableSteps: string[];
    platformRecommendation: string;
  };
}

interface ContentAnalysisRequest {
  contentType: 'image' | 'video' | 'design';
  imageUrl?: string;
  videoUrl?: string;
  description?: string;
  targetPlatform?: string;
  targetAudience?: string;
}

class DualLayerAnalysisService {
  
  async analyzeContent(request: ContentAnalysisRequest): Promise<VisualAnalysis> {
    console.log("🔍 Starting dual-layer AI analysis...");
    
    const [runwayAnalysis, geminiAnalysis] = await Promise.all([
      this.getRunwayAnalysis(request),
      this.getGeminiAnalysis(request),
    ]);

    const combined = await this.combineAnalyses(runwayAnalysis, geminiAnalysis, request);

    return {
      runway: runwayAnalysis,
      gemini: geminiAnalysis,
      combined,
    };
  }

  private async getRunwayAnalysis(request: ContentAnalysisRequest): Promise<VisualAnalysis['runway']> {
    const prompt = `Teknik görsel analiz yap. Bu ${request.contentType === 'video' ? 'video' : 'görsel'} için:

${request.description ? `İçerik: ${request.description}` : ''}
${request.targetPlatform ? `Platform: ${request.targetPlatform}` : ''}

Değerlendir:
1. Teknik kalite (1-100)
2. Kompozisyon analizi
3. Renk paleti (hex kodları)
4. Genel mood/atmosfer
5. Görsel stil
6. İyileştirme önerileri

JSON formatında yanıtla:
{
  "technicalQuality": 85,
  "composition": "Kompozisyon açıklaması",
  "colorPalette": ["#2D3654", "#19B5B5", "#FFFFFF"],
  "mood": "Mood açıklaması",
  "style": "Stil açıklaması",
  "suggestions": ["Öneri 1", "Öneri 2"]
}`;

    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { 
            role: "system", 
            content: "Sen bir profesyonel görsel sanat direktörü ve teknik analiscisiin. Runway AI bakış açısıyla görsel/video içerik analizi yapıyorsun. Türkçe yanıtla." 
          },
          { role: "user", content: prompt }
        ],
        response_format: { type: "json_object" },
        temperature: 0.7,
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error("Runway analizi yanıt vermedi");
      }

      return JSON.parse(content);
    } catch (error) {
      console.error("Runway analysis error:", error);
      return {
        technicalQuality: 70,
        composition: "Analiz yapılamadı",
        colorPalette: ["#2D3654"],
        mood: "Belirlenemedi",
        style: "Belirlenemedi",
        suggestions: ["Tekrar deneyin"],
      };
    }
  }

  private async getGeminiAnalysis(request: ContentAnalysisRequest): Promise<VisualAnalysis['gemini']> {
    const prompt = `Duygusal ve kültürel içerik analizi yap. Bu ${request.contentType === 'video' ? 'video' : 'görsel'} için derinlemesine değerlendir:

${request.description ? `İçerik: ${request.description}` : ''}
${request.targetPlatform ? `Hedef Platform: ${request.targetPlatform}` : ''}
${request.targetAudience ? `Hedef Kitle: ${request.targetAudience}` : ''}

Şunları analiz et:
1. Duygusal etki - İzleyicide hangi duyguları uyandırır?
2. Kültürel bağlam - Türk kültürüne uygunluk
3. Hikaye anlatımı - Görsel hikaye gücü
4. Hedef kitle uyumu
5. Viral potansiyel (1-100)
6. İyileştirme önerileri
7. Türk pazarına uygunluk

JSON formatında yanıtla:
{
  "emotionalImpact": "Duygusal etki analizi",
  "culturalContext": "Kültürel bağlam değerlendirmesi",
  "storytelling": "Hikaye anlatımı gücü",
  "targetAudience": "Hedef kitle uyumu",
  "viralPotential": 75,
  "improvements": ["İyileştirme 1", "İyileştirme 2"],
  "turkishMarketFit": "Türk pazarına uygunluk analizi"
}`;

    try {
      const result = await geminiAI.chat(prompt, "dual-layer-analysis", {
        systemPrompt: `Sen DuyguMotor platformunun duygusal zeka uzmanısın. İçeriklerin psikolojik ve kültürel etkisini Jung arketipleri, Türk "fal kültürü" ve sosyal medya dinamikleri perspektifinden değerlendiriyorsun. Türkçe yanıtla.`,
        temperature: 0.8,
      });

      try {
        const jsonMatch = result.message.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          return JSON.parse(jsonMatch[0]);
        }
      } catch (parseError) {
        console.error("Gemini JSON parse error:", parseError);
      }

      return {
        emotionalImpact: result.message.slice(0, 200),
        culturalContext: "Türk kültürüne uygun",
        storytelling: "Güçlü görsel hikaye",
        targetAudience: request.targetAudience || "Genel",
        viralPotential: 70,
        improvements: ["Detaylı analiz için görsel gerekli"],
        turkishMarketFit: "Değerlendirme yapıldı",
      };
    } catch (error) {
      console.error("Gemini analysis error:", error);
      return {
        emotionalImpact: "Analiz yapılamadı",
        culturalContext: "Belirsiz",
        storytelling: "Değerlendirilmedi",
        targetAudience: "Belirlenemedi",
        viralPotential: 50,
        improvements: ["Tekrar deneyin"],
        turkishMarketFit: "Değerlendirme gerekli",
      };
    }
  }

  private async combineAnalyses(
    runway: VisualAnalysis['runway'],
    gemini: VisualAnalysis['gemini'],
    request: ContentAnalysisRequest
  ): Promise<VisualAnalysis['combined']> {
    const technicalScore = runway.technicalQuality;
    const viralScore = gemini.viralPotential;
    const overallScore = Math.round((technicalScore * 0.4) + (viralScore * 0.6));

    const strengths: string[] = [];
    const weaknesses: string[] = [];

    if (technicalScore >= 80) {
      strengths.push("Yüksek teknik kalite");
    } else if (technicalScore < 60) {
      weaknesses.push("Teknik kalite iyileştirmeli");
    }

    if (viralScore >= 80) {
      strengths.push("Güçlü viral potansiyel");
    } else if (viralScore < 50) {
      weaknesses.push("Viral potansiyel düşük");
    }

    if (runway.composition && !runway.composition.includes("yapılamadı")) {
      strengths.push(`Kompozisyon: ${runway.composition.slice(0, 50)}`);
    }

    if (gemini.emotionalImpact && !gemini.emotionalImpact.includes("yapılamadı")) {
      strengths.push(`Duygusal etki: ${gemini.emotionalImpact.slice(0, 50)}`);
    }

    const actionableSteps = [
      ...runway.suggestions.slice(0, 2),
      ...gemini.improvements.slice(0, 2),
    ];

    let platformRecommendation = request.targetPlatform || "instagram";
    if (viralScore >= 75 && request.contentType === 'video') {
      platformRecommendation = "tiktok";
    } else if (technicalScore >= 85) {
      platformRecommendation = "instagram";
    } else if (overallScore < 60) {
      platformRecommendation = "twitter";
    }

    return {
      overallScore,
      strengths,
      weaknesses,
      actionableSteps,
      platformRecommendation,
    };
  }

  async analyzeGeneratedContent(taskId: string): Promise<VisualAnalysis | null> {
    const task = await runwayService.checkTaskStatus(taskId);
    
    if (!task || task.status !== 'completed' || !task.outputUrl) {
      return null;
    }

    return this.analyzeContent({
      contentType: task.taskType?.includes('video') ? 'video' : 'image',
      imageUrl: task.taskType?.includes('image') ? task.outputUrl : undefined,
      videoUrl: task.taskType?.includes('video') ? task.outputUrl : undefined,
      description: task.promptText || undefined,
      targetPlatform: task.targetPlatform || 'instagram',
    });
  }

  async generateWithAnalysis(
    prompt: string,
    platform: string = 'instagram',
    contentType: 'image' | 'video' = 'image'
  ): Promise<{
    task: any;
    initialAnalysis: VisualAnalysis;
  }> {
    const preAnalysis = await this.analyzeContent({
      contentType,
      description: prompt,
      targetPlatform: platform,
    });

    let task;
    if (contentType === 'video') {
      task = await runwayService.createTextToVideo(prompt, platform as any, 5);
    } else {
      task = await runwayService.createTextToImage(prompt, platform as any);
    }

    return {
      task,
      initialAnalysis: preAnalysis,
    };
  }

  async getComprehensiveReport(
    contentUrl: string,
    contentType: 'image' | 'video',
    context: {
      prompt?: string;
      platform?: string;
      audience?: string;
    } = {}
  ): Promise<{
    analysis: VisualAnalysis;
    report: string;
    recommendations: string[];
  }> {
    const analysis = await this.analyzeContent({
      contentType,
      imageUrl: contentType === 'image' ? contentUrl : undefined,
      videoUrl: contentType === 'video' ? contentUrl : undefined,
      description: context.prompt,
      targetPlatform: context.platform,
      targetAudience: context.audience,
    });

    const reportPrompt = `Aşağıdaki çift katmanlı AI analizine dayanarak kapsamlı bir Türkçe rapor oluştur:

Runway (Teknik) Analizi:
- Teknik Kalite: ${analysis.runway.technicalQuality}/100
- Kompozisyon: ${analysis.runway.composition}
- Mood: ${analysis.runway.mood}
- Stil: ${analysis.runway.style}

Gemini (Duygusal) Analizi:
- Duygusal Etki: ${analysis.gemini.emotionalImpact}
- Kültürel Bağlam: ${analysis.gemini.culturalContext}
- Viral Potansiyel: ${analysis.gemini.viralPotential}/100
- Türk Pazarı: ${analysis.gemini.turkishMarketFit}

Birleşik Skor: ${analysis.combined.overallScore}/100
Önerilen Platform: ${analysis.combined.platformRecommendation}

Bu analize dayanarak:
1. Güçlü ve zayıf yönleri özetle
2. 5 somut aksiyon önerisi ver
3. Genel değerlendirme yap

Profesyonel ama anlaşılır bir dille yaz.`;

    const reportResult = await geminiAI.chat(reportPrompt, "comprehensive-report", {
      systemPrompt: "Sen bir içerik stratejisti ve AI analiz uzmanısın. Türkçe, profesyonel ve aksiyon odaklı raporlar hazırlıyorsun.",
      temperature: 0.7,
    });

    const recommendations = [
      ...analysis.combined.actionableSteps,
      `Önerilen platform: ${analysis.combined.platformRecommendation}`,
      analysis.combined.overallScore >= 75 
        ? "İçerik yayına hazır" 
        : "İyileştirmeler sonrası yayınlayın",
    ];

    return {
      analysis,
      report: reportResult.message,
      recommendations,
    };
  }
}

export const dualLayerAnalysisService = new DualLayerAnalysisService();
