import { useState } from "react";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Users, Sparkles, UserPlus, Heart, Zap, Brain, Loader2 } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

const CHARACTER_ROLES = [
  { value: "protagonist", label: "Protagonist", color: "bg-chart-2" },
  { value: "antagonist", label: "Antagonist", color: "bg-chart-5" },
  { value: "supporting", label: "Supporting", color: "bg-chart-1" },
  { value: "background", label: "Background", color: "bg-muted" },
];

interface GeneratedCharacter {
  name: string;
  role: string;
  backstory: string;
  personality: string[];
  emotionalProfile: {
    positive: number;
    negative: number;
    neutral: number;
  };
  motivations: string[];
  quirks: string[];
}

export default function CharacterForgePage() {
  const [characterName, setCharacterName] = useState("");
  const [characterRole, setCharacterRole] = useState("protagonist");
  const [characterDescription, setCharacterDescription] = useState("");
  const [generatedCharacter, setGeneratedCharacter] = useState<GeneratedCharacter | null>(null);
  const { toast } = useToast();

  const generateMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/creative/character", {
        name: characterName,
        role: characterRole,
        description: characterDescription,
      });
      return response.json();
    },
    onSuccess: (data) => {
      setGeneratedCharacter(data.character);
      toast({
        title: "Character created",
        description: `${characterName} has been brought to life`,
      });
    },
    onError: () => {
      toast({
        title: "Creation failed",
        description: "Failed to create character. Please try again.",
        variant: "destructive",
      });
    },
  });

  return (
    <div className="p-6 max-w-4xl mx-auto animate-fade-in">
      <PageHeader
        title="Character Forge"
        description="Create rich, emotionally complex characters for your stories"
        showBack
      />

      <div className="grid gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg font-medium">
              Character Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground mb-2 block">
                  Character Name
                </label>
                <Input
                  placeholder="Enter character name"
                  value={characterName}
                  onChange={(e) => setCharacterName(e.target.value)}
                  data-testid="input-character-name"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground mb-2 block">
                  Role
                </label>
                <Select value={characterRole} onValueChange={setCharacterRole}>
                  <SelectTrigger data-testid="select-character-role">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CHARACTER_ROLES.map((role) => (
                      <SelectItem key={role.value} value={role.value}>
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${role.color}`} />
                          {role.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground mb-2 block">
                Description
              </label>
              <Textarea
                placeholder="Describe your character's background, appearance, or key traits..."
                value={characterDescription}
                onChange={(e) => setCharacterDescription(e.target.value)}
                className="min-h-24 resize-none"
                data-testid="input-character-description"
              />
            </div>
            <Button
              onClick={() => generateMutation.mutate()}
              disabled={!characterName.trim() || generateMutation.isPending}
              data-testid="button-create-character"
            >
              {generateMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <UserPlus className="h-4 w-4 mr-2" />
              )}
              Create Character
            </Button>
          </CardContent>
        </Card>

        {generatedCharacter && !generateMutation.isPending && (
          <Card>
            <CardHeader>
              <div className="flex items-start gap-4">
                <Avatar className="h-16 w-16">
                  <AvatarFallback className="bg-primary/10 text-primary text-xl font-bold">
                    {generatedCharacter.name.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <CardTitle className="text-xl" data-testid="text-character-name">
                      {generatedCharacter.name}
                    </CardTitle>
                    <Badge
                      variant="secondary"
                      className={CHARACTER_ROLES.find(r => r.value === generatedCharacter.role)?.color}
                    >
                      {generatedCharacter.role}
                    </Badge>
                  </div>
                  <p className="text-muted-foreground text-sm">
                    {generatedCharacter.backstory}
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h4 className="font-medium text-sm mb-3 flex items-center gap-2">
                  <Brain className="h-4 w-4 text-primary" />
                  Personality Traits
                </h4>
                <div className="flex flex-wrap gap-2">
                  {generatedCharacter.personality.map((trait, i) => (
                    <Badge key={i} variant="outline">
                      {trait}
                    </Badge>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="font-medium text-sm mb-3 flex items-center gap-2">
                  <Heart className="h-4 w-4 text-chart-5" />
                  Emotional Profile
                </h4>
                <div className="space-y-3">
                  <div className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span>Positive</span>
                      <span className="text-muted-foreground">
                        {generatedCharacter.emotionalProfile.positive}%
                      </span>
                    </div>
                    <Progress value={generatedCharacter.emotionalProfile.positive} className="h-2" />
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span>Negative</span>
                      <span className="text-muted-foreground">
                        {generatedCharacter.emotionalProfile.negative}%
                      </span>
                    </div>
                    <Progress value={generatedCharacter.emotionalProfile.negative} className="h-2" />
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span>Neutral</span>
                      <span className="text-muted-foreground">
                        {generatedCharacter.emotionalProfile.neutral}%
                      </span>
                    </div>
                    <Progress value={generatedCharacter.emotionalProfile.neutral} className="h-2" />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium text-sm mb-3 flex items-center gap-2">
                    <Zap className="h-4 w-4 text-chart-3" />
                    Motivations
                  </h4>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    {generatedCharacter.motivations.map((motivation, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="text-primary mt-1">•</span>
                        {motivation}
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h4 className="font-medium text-sm mb-3 flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-chart-4" />
                    Quirks
                  </h4>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    {generatedCharacter.quirks.map((quirk, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="text-primary mt-1">•</span>
                        {quirk}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
