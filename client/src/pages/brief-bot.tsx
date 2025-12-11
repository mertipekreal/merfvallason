import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { 
  ArrowLeft,
  Sparkles,
  Wand2,
  Copy,
  Check,
  Loader2,
  Lightbulb,
  Target,
  Zap,
  Brain,
  Hash,
  TrendingUp,
  Star,
  RefreshCw
} from "lucide-react";
import { Link } from "wouter";

interface PromptResult {
  optimizedPrompt: string;
  keywords: string[];
  tips: string[];
  score: number;
  variations: string[];
}

type ContentType = "video" | "image" | "text" | "social";
type Platform = "tiktok" | "instagram" | "youtube" | "twitter" | "general";
type Tone = "professional" | "casual" | "creative" | "viral" | "emotional";

export default function BriefBot() {
  const { toast } = useToast();
  const [keywords, setKeywords] = useState("");
  const [contentType, setContentType] = useState<ContentType>("video");
  const [platform, setPlatform] = useState<Platform>("tiktok");
  const [tone, setTone] = useState<Tone>("viral");
  const [context, setContext] = useState("");
  const [result, setResult] = useState<PromptResult | null>(null);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const generateMutation = useMutation({
    mutationFn: async (data: { keywords: string; contentType: string; platform: string; tone: string; context: string }) => {
      const res = await apiRequest("POST", "/api/brief/generate", data);
      return res.json();
    },
    onSuccess: (data: { success: boolean; result: PromptResult }) => {
      if (data.success) {
        setResult(data.result);
        toast({ 
          title: "Prompt Hazır!", 
          description: "AI optimize edilmiş prompt oluşturuldu" 
        });
      }
    },
    onError: (error: any) => {
      toast({ 
        title: "Hata", 
        description: error.message || "Prompt oluşturulamadı",
        variant: "destructive"
      });
    },
  });

  const handleGenerate = () => {
    if (!keywords.trim()) {
      toast({ title: "Hata", description: "Lütfen anahtar kelimeler girin", variant: "destructive" });
      return;
    }
    generateMutation.mutate({ keywords, contentType, platform, tone, context });
  };

  const copyToClipboard = async (text: string, index: number) => {
    await navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    toast({ title: "Kopyalandı!", description: "Prompt panoya kopyalandı" });
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return "text-green-500";
    if (score >= 70) return "text-yellow-500";
    return "text-red-500";
  };

  const getScoreLabel = (score: number) => {
    if (score >= 90) return "Mükemmel";
    if (score >= 80) return "Çok İyi";
    if (score >= 70) return "İyi";
    return "Geliştirilebilir";
  };

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/">
            <Button variant="ghost" size="icon" data-testid="button-back">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-br from-primary/20 to-purple-500/20">
              <Wand2 className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold" data-testid="text-page-title">Brief Bot</h1>
              <p className="text-muted-foreground" data-testid="text-page-subtitle">AI destekli prompt optimizasyonu</p>
            </div>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-5">
          <div className="lg:col-span-2 space-y-4">
            <Card className="border-primary/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Brain className="h-5 w-5 text-primary" />
                  Anahtar Kelimeler
                </CardTitle>
                <CardDescription>
                  İçerik için anahtar kelimeleri girin
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Anahtar Kelimeler</Label>
                  <Textarea
                    placeholder="örnek: dans, müzik, eğlence, viral, Türkiye"
                    value={keywords}
                    onChange={(e) => setKeywords(e.target.value)}
                    className="min-h-[100px]"
                    data-testid="input-keywords"
                  />
                  <p className="text-xs text-muted-foreground">
                    Virgül ile ayırın veya her satıra bir kelime yazın
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>İçerik Türü</Label>
                  <Select value={contentType} onValueChange={(v) => setContentType(v as ContentType)}>
                    <SelectTrigger data-testid="select-content-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="video">Video İçeriği</SelectItem>
                      <SelectItem value="image">Görsel İçerik</SelectItem>
                      <SelectItem value="text">Metin İçeriği</SelectItem>
                      <SelectItem value="social">Sosyal Medya</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Platform</Label>
                  <Select value={platform} onValueChange={(v) => setPlatform(v as Platform)}>
                    <SelectTrigger data-testid="select-platform">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="tiktok">TikTok</SelectItem>
                      <SelectItem value="instagram">Instagram</SelectItem>
                      <SelectItem value="youtube">YouTube</SelectItem>
                      <SelectItem value="twitter">Twitter/X</SelectItem>
                      <SelectItem value="general">Genel</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Ton</Label>
                  <Select value={tone} onValueChange={(v) => setTone(v as Tone)}>
                    <SelectTrigger data-testid="select-tone">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="viral">Viral / Dikkat Çekici</SelectItem>
                      <SelectItem value="emotional">Duygusal</SelectItem>
                      <SelectItem value="creative">Yaratıcı</SelectItem>
                      <SelectItem value="professional">Profesyonel</SelectItem>
                      <SelectItem value="casual">Samimi / Gündelik</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Ek Bağlam (Opsiyonel)</Label>
                  <Textarea
                    placeholder="İçerik hakkında ek bilgi..."
                    value={context}
                    onChange={(e) => setContext(e.target.value)}
                    className="min-h-[60px]"
                    data-testid="input-context"
                  />
                </div>

                <Button 
                  onClick={handleGenerate}
                  disabled={generateMutation.isPending}
                  className="w-full gap-2"
                  data-testid="button-generate"
                >
                  {generateMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Oluşturuluyor...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4" />
                      Prompt Oluştur
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Lightbulb className="h-4 w-4 text-yellow-500" />
                  İpuçları
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-muted-foreground">
                <p data-testid="text-tip-1">• Spesifik ve detaylı anahtar kelimeler kullanın</p>
                <p data-testid="text-tip-2">• Hedef kitlenizi düşünün</p>
                <p data-testid="text-tip-3">• Trend konuları dahil edin</p>
                <p data-testid="text-tip-4">• Duygusal tetikleyiciler ekleyin</p>
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-3 space-y-4">
            {result ? (
              <>
                <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
                  <CardHeader>
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <CardTitle className="flex items-center gap-2">
                        <Target className="h-5 w-5 text-primary" />
                        Optimize Edilmiş Prompt
                      </CardTitle>
                      <div className="flex items-center gap-2">
                        <Star className={`h-5 w-5 ${getScoreColor(result.score)}`} />
                        <span className={`font-bold ${getScoreColor(result.score)}`} data-testid="text-score">
                          {result.score}/100
                        </span>
                        <Badge variant="secondary" data-testid="badge-score-label">{getScoreLabel(result.score)}</Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="relative">
                      <div className="p-4 rounded-lg bg-card border text-sm leading-relaxed" data-testid="text-optimized-prompt">
                        {result.optimizedPrompt}
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="absolute top-2 right-2"
                        onClick={() => copyToClipboard(result.optimizedPrompt, 0)}
                        data-testid="button-copy-main"
                      >
                        {copiedIndex === 0 ? (
                          <Check className="h-4 w-4 text-green-500" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {result.keywords.map((keyword, i) => (
                        <Badge key={i} variant="outline" className="gap-1" data-testid={`badge-keyword-${i}`}>
                          <Hash className="h-3 w-3" />
                          {keyword}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Zap className="h-4 w-4 text-yellow-500" />
                      AI Önerileri
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {result.tips.map((tip, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm" data-testid={`text-ai-tip-${i}`}>
                          <TrendingUp className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                          <span>{tip}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm flex items-center gap-2">
                      <RefreshCw className="h-4 w-4" />
                      Alternatif Varyasyonlar
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {result.variations.map((variation, i) => (
                      <div key={i} className="relative p-3 rounded-lg bg-muted/50 text-sm" data-testid={`text-variation-${i}`}>
                        {variation}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="absolute top-1 right-1 h-7 w-7"
                          onClick={() => copyToClipboard(variation, i + 1)}
                          data-testid={`button-copy-variation-${i}`}
                        >
                          {copiedIndex === i + 1 ? (
                            <Check className="h-3 w-3 text-green-500" />
                          ) : (
                            <Copy className="h-3 w-3" />
                          )}
                        </Button>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </>
            ) : (
              <Card className="h-full min-h-[400px] flex items-center justify-center">
                <div className="text-center space-y-4 p-8">
                  <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                    <Wand2 className="h-8 w-8 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg" data-testid="text-empty-title">Prompt Oluşturmaya Başlayın</h3>
                    <p className="text-muted-foreground text-sm mt-1" data-testid="text-empty-description">
                      Anahtar kelimelerinizi girin ve yapay zekanın sizin için<br />
                      en etkili promptu oluşturmasını izleyin
                    </p>
                  </div>
                  <div className="flex flex-wrap justify-center gap-2 text-xs">
                    <Badge variant="outline" data-testid="badge-feature-1">Yüksek Etkileşim</Badge>
                    <Badge variant="outline" data-testid="badge-feature-2">SEO Uyumlu</Badge>
                    <Badge variant="outline" data-testid="badge-feature-3">Platform Optimize</Badge>
                  </div>
                </div>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
