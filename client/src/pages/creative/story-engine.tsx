import { useState } from "react";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BookOpen, Sparkles, Wand2, Lightbulb, Loader2 } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

const EMOTIONAL_TONES = [
  { value: "happy", label: "Happy", description: "Uplifting and joyful" },
  { value: "sad", label: "Sad", description: "Melancholic and touching" },
  { value: "exciting", label: "Exciting", description: "Thrilling and dynamic" },
  { value: "mysterious", label: "Mysterious", description: "Intriguing and suspenseful" },
  { value: "romantic", label: "Romantic", description: "Heartfelt and passionate" },
];

export default function StoryEnginePage() {
  const [storyPrompt, setStoryPrompt] = useState("");
  const [emotionalTone, setEmotionalTone] = useState("exciting");
  const [generatedStory, setGeneratedStory] = useState<string | null>(null);
  const { toast } = useToast();

  const generateMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/creative/story", {
        prompt: storyPrompt,
        emotionalTone,
      });
      return response.json();
    },
    onSuccess: (data) => {
      setGeneratedStory(data.story);
      toast({
        title: "Story generated",
        description: "Your story has been created with emotional AI",
      });
    },
    onError: () => {
      toast({
        title: "Generation failed",
        description: "Failed to generate story. Please try again.",
        variant: "destructive",
      });
    },
  });

  return (
    <div className="p-6 max-w-4xl mx-auto animate-fade-in">
      <PageHeader
        title="Story Engine"
        description="Create emotionally resonant narratives with AI assistance"
        showBack
      />

      <div className="grid gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center gap-2">
            <BookOpen className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg font-medium">Story Prompt</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              placeholder="Describe your story idea... What characters, settings, or themes do you want to explore?"
              value={storyPrompt}
              onChange={(e) => setStoryPrompt(e.target.value)}
              className="min-h-32 resize-none"
              data-testid="input-story-prompt"
            />
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <label className="text-sm font-medium text-muted-foreground mb-2 block">
                  Emotional Tone
                </label>
                <Select value={emotionalTone} onValueChange={setEmotionalTone}>
                  <SelectTrigger data-testid="select-emotional-tone">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {EMOTIONAL_TONES.map((tone) => (
                      <SelectItem key={tone.value} value={tone.value}>
                        <div className="flex flex-col">
                          <span>{tone.label}</span>
                          <span className="text-xs text-muted-foreground">
                            {tone.description}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                onClick={() => generateMutation.mutate()}
                disabled={!storyPrompt.trim() || generateMutation.isPending}
                className="sm:self-end"
                data-testid="button-generate-story"
              >
                {generateMutation.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Wand2 className="h-4 w-4 mr-2" />
                )}
                Generate Story
              </Button>
            </div>
          </CardContent>
        </Card>

        {generateMutation.isPending && (
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <Sparkles className="h-5 w-5 text-primary animate-pulse-glow" />
                <span className="text-sm font-medium">
                  AI is crafting your story...
                </span>
              </div>
              <div className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6" />
                <Skeleton className="h-4 w-4/5" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            </CardContent>
          </Card>
        )}

        {generatedStory && !generateMutation.isPending && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                <CardTitle className="text-lg font-medium">
                  Generated Story
                </CardTitle>
              </div>
              <Badge variant="secondary" className="capitalize">
                {emotionalTone}
              </Badge>
            </CardHeader>
            <CardContent>
              <div className="prose prose-sm dark:prose-invert max-w-none">
                <p className="whitespace-pre-wrap leading-relaxed" data-testid="text-generated-story">
                  {generatedStory}
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        <Card className="bg-muted/30">
          <CardContent className="p-6">
            <div className="flex items-start gap-3">
              <Lightbulb className="h-5 w-5 text-chart-3 shrink-0 mt-0.5" />
              <div className="space-y-2">
                <h4 className="font-medium text-sm">Story Tips</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>Be specific about your characters and their motivations</li>
                  <li>Include sensory details to make the story immersive</li>
                  <li>The emotional tone will influence word choice and pacing</li>
                  <li>Try different tones for the same prompt to explore variations</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
