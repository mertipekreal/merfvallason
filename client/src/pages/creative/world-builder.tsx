import { useState } from "react";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Globe, Sparkles, MapPin, Sun, Moon, Cloud, Zap, Loader2 } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const WORLD_MOODS = [
  { value: "bright", label: "Bright", icon: Sun, color: "text-chart-3" },
  { value: "dark", label: "Dark", icon: Moon, color: "text-chart-5" },
  { value: "neutral", label: "Neutral", icon: Cloud, color: "text-muted-foreground" },
  { value: "vibrant", label: "Vibrant", icon: Zap, color: "text-chart-1" },
];

interface GeneratedWorld {
  name: string;
  theme: string;
  mood: string;
  description: string;
  keyLocations: { name: string; description: string }[];
  atmosphere: string;
  inhabitants: string[];
  uniqueElements: string[];
}

export default function WorldBuilderPage() {
  const [worldName, setWorldName] = useState("");
  const [worldTheme, setWorldTheme] = useState("");
  const [worldMood, setWorldMood] = useState("bright");
  const [generatedWorld, setGeneratedWorld] = useState<GeneratedWorld | null>(null);
  const { toast } = useToast();

  const generateMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/creative/world", {
        name: worldName,
        theme: worldTheme,
        mood: worldMood,
      });
      return response.json();
    },
    onSuccess: (data) => {
      setGeneratedWorld(data.world);
      toast({
        title: "World created",
        description: `${worldName} has been built`,
      });
    },
    onError: () => {
      toast({
        title: "Creation failed",
        description: "Failed to build world. Please try again.",
        variant: "destructive",
      });
    },
  });

  const selectedMood = WORLD_MOODS.find(m => m.value === worldMood);
  const MoodIcon = selectedMood?.icon || Sun;

  return (
    <div className="p-6 max-w-4xl mx-auto animate-fade-in">
      <PageHeader
        title="World Builder"
        description="Craft expansive and immersive worlds for your narratives"
        showBack
      />

      <div className="grid gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center gap-2">
            <Globe className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg font-medium">World Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground mb-2 block">
                  World Name
                </label>
                <Input
                  placeholder="Enter world name"
                  value={worldName}
                  onChange={(e) => setWorldName(e.target.value)}
                  data-testid="input-world-name"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground mb-2 block">
                  Mood
                </label>
                <Select value={worldMood} onValueChange={setWorldMood}>
                  <SelectTrigger data-testid="select-world-mood">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {WORLD_MOODS.map((mood) => (
                      <SelectItem key={mood.value} value={mood.value}>
                        <div className="flex items-center gap-2">
                          <mood.icon className={cn("h-4 w-4", mood.color)} />
                          {mood.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground mb-2 block">
                Theme / Setting
              </label>
              <Textarea
                placeholder="Describe the theme, era, or style of your world... (e.g., 'post-apocalyptic desert', 'magical underwater kingdom')"
                value={worldTheme}
                onChange={(e) => setWorldTheme(e.target.value)}
                className="min-h-24 resize-none"
                data-testid="input-world-theme"
              />
            </div>
            <Button
              onClick={() => generateMutation.mutate()}
              disabled={!worldName.trim() || generateMutation.isPending}
              data-testid="button-build-world"
            >
              {generateMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Globe className="h-4 w-4 mr-2" />
              )}
              Build World
            </Button>
          </CardContent>
        </Card>

        {generatedWorld && !generateMutation.isPending && (
          <>
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <MoodIcon className={cn("h-6 w-6", selectedMood?.color)} />
                    <CardTitle className="text-xl" data-testid="text-world-name">
                      {generatedWorld.name}
                    </CardTitle>
                  </div>
                  <Badge variant="secondary" className="capitalize">
                    {generatedWorld.mood}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <p className="text-muted-foreground leading-relaxed">
                    {generatedWorld.description}
                  </p>
                </div>

                <div>
                  <h4 className="font-medium text-sm mb-3">Atmosphere</h4>
                  <p className="text-sm text-muted-foreground italic">
                    "{generatedWorld.atmosphere}"
                  </p>
                </div>

                <div>
                  <h4 className="font-medium text-sm mb-3">Unique Elements</h4>
                  <div className="flex flex-wrap gap-2">
                    {generatedWorld.uniqueElements.map((element, i) => (
                      <Badge key={i} variant="outline">
                        <Sparkles className="h-3 w-3 mr-1" />
                        {element}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className="font-medium text-sm mb-3">Inhabitants</h4>
                  <div className="flex flex-wrap gap-2">
                    {generatedWorld.inhabitants.map((inhabitant, i) => (
                      <Badge key={i} variant="secondary">
                        {inhabitant}
                      </Badge>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center gap-2">
                <MapPin className="h-5 w-5 text-primary" />
                <CardTitle className="text-lg font-medium">
                  Key Locations
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4">
                  {generatedWorld.keyLocations.map((location, i) => (
                    <div
                      key={i}
                      className="p-4 rounded-lg bg-muted/30 hover-elevate transition-all duration-200"
                    >
                      <h5 className="font-medium mb-1">{location.name}</h5>
                      <p className="text-sm text-muted-foreground">
                        {location.description}
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}
