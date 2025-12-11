import { useState } from "react";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Palette,
  Sparkles,
  Image,
  Music,
  FileText,
  Wand2,
  Loader2,
  Heart,
} from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface GeneratedAsset {
  type: "visual" | "audio" | "text";
  name: string;
  description: string;
  emotionalImpact: number;
  content: string;
  tags: string[];
}

export default function DreamStudioPage() {
  const [assetType, setAssetType] = useState<"visual" | "audio" | "text">("visual");
  const [prompt, setPrompt] = useState("");
  const [emotionalIntensity, setEmotionalIntensity] = useState([50]);
  const [generatedAsset, setGeneratedAsset] = useState<GeneratedAsset | null>(null);
  const { toast } = useToast();

  const generateMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/creative/dream", {
        type: assetType,
        prompt,
        emotionalIntensity: emotionalIntensity[0],
      });
      return response.json();
    },
    onSuccess: (data) => {
      setGeneratedAsset(data.asset);
      toast({
        title: "Asset created",
        description: "Your creative asset has been generated",
      });
    },
    onError: () => {
      toast({
        title: "Creation failed",
        description: "Failed to generate asset. Please try again.",
        variant: "destructive",
      });
    },
  });

  const getAssetIcon = (type: string) => {
    switch (type) {
      case "visual":
        return Image;
      case "audio":
        return Music;
      case "text":
        return FileText;
      default:
        return Sparkles;
    }
  };

  const AssetIcon = getAssetIcon(assetType);

  return (
    <div className="p-6 max-w-4xl mx-auto animate-fade-in">
      <PageHeader
        title="Dream Studio"
        description="Create visual, audio, and text assets with emotional AI"
        showBack
      />

      <div className="grid gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center gap-2">
            <Palette className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg font-medium">Asset Creator</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <Tabs value={assetType} onValueChange={(v) => setAssetType(v as typeof assetType)}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="visual" className="flex items-center gap-2" data-testid="tab-visual">
                  <Image className="h-4 w-4" />
                  Visual
                </TabsTrigger>
                <TabsTrigger value="audio" className="flex items-center gap-2" data-testid="tab-audio">
                  <Music className="h-4 w-4" />
                  Audio
                </TabsTrigger>
                <TabsTrigger value="text" className="flex items-center gap-2" data-testid="tab-text">
                  <FileText className="h-4 w-4" />
                  Text
                </TabsTrigger>
              </TabsList>

              <TabsContent value="visual" className="mt-4">
                <p className="text-sm text-muted-foreground mb-4">
                  Describe the visual concept you want to create. Include details about
                  mood, colors, composition, and emotional impact.
                </p>
              </TabsContent>
              <TabsContent value="audio" className="mt-4">
                <p className="text-sm text-muted-foreground mb-4">
                  Describe the audio atmosphere you want to create. Include details about
                  tempo, instruments, mood, and emotional journey.
                </p>
              </TabsContent>
              <TabsContent value="text" className="mt-4">
                <p className="text-sm text-muted-foreground mb-4">
                  Describe the text content you want to generate. This could be poetry,
                  dialogue, descriptions, or any emotionally-driven text.
                </p>
              </TabsContent>
            </Tabs>

            <div>
              <label className="text-sm font-medium text-muted-foreground mb-2 block">
                Creative Prompt
              </label>
              <Textarea
                placeholder={`Describe your ${assetType} concept...`}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                className="min-h-32 resize-none"
                data-testid="input-dream-prompt"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Heart className="h-4 w-4 text-chart-5" />
                  Emotional Intensity
                </label>
                <span className="text-sm font-mono">{emotionalIntensity[0]}%</span>
              </div>
              <Slider
                value={emotionalIntensity}
                onValueChange={setEmotionalIntensity}
                max={100}
                step={5}
                className="w-full"
                data-testid="slider-intensity"
              />
              <div className="flex justify-between text-xs text-muted-foreground mt-1">
                <span>Subtle</span>
                <span>Moderate</span>
                <span>Intense</span>
              </div>
            </div>

            <Button
              onClick={() => generateMutation.mutate()}
              disabled={!prompt.trim() || generateMutation.isPending}
              className="w-full"
              data-testid="button-generate-asset"
            >
              {generateMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Wand2 className="h-4 w-4 mr-2" />
              )}
              Generate {assetType.charAt(0).toUpperCase() + assetType.slice(1)} Asset
            </Button>
          </CardContent>
        </Card>

        {generatedAsset && !generateMutation.isPending && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                    <AssetIcon className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-lg" data-testid="text-asset-name">
                      {generatedAsset.name}
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">
                      {generatedAsset.description}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Heart className="h-4 w-4 text-chart-5" />
                  <span className="text-sm font-mono font-medium">
                    {generatedAsset.emotionalImpact}%
                  </span>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 rounded-lg bg-muted/30">
                <pre className="text-sm whitespace-pre-wrap font-mono">
                  {generatedAsset.content}
                </pre>
              </div>
              <div>
                <h4 className="text-sm font-medium mb-2">Tags</h4>
                <div className="flex flex-wrap gap-2">
                  {generatedAsset.tags.map((tag, i) => (
                    <Badge key={i} variant="secondary">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <Card className="bg-muted/30">
          <CardContent className="p-6">
            <div className="flex items-start gap-3">
              <Sparkles className="h-5 w-5 text-primary shrink-0 mt-0.5" />
              <div className="space-y-2">
                <h4 className="font-medium text-sm">Dream Studio Tips</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>Higher emotional intensity creates more dramatic outputs</li>
                  <li>Be specific about the mood and atmosphere you want</li>
                  <li>Visual prompts work best with color and composition details</li>
                  <li>Audio prompts benefit from tempo and instrument suggestions</li>
                  <li>Text prompts can include style references (poetic, dramatic, etc.)</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
