import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Brain, Sparkles, RefreshCw, Zap, Heart, Frown, Meh, TrendingUp, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface DetailedSentiment {
  sentiment: "positive" | "negative" | "neutral";
  confidence: number;
  emotions: string[];
  intensity: "low" | "medium" | "high";
  keywords: string[];
}

interface SentimentResult {
  id: string;
  text: string;
  analysis: DetailedSentiment;
}

interface Dataset {
  id: string;
  name: string;
  displayName: string;
  type: string;
  recordCount: number;
}

function getSentimentIcon(sentiment: string) {
  switch (sentiment) {
    case "positive":
      return <Heart className="h-4 w-4 text-green-500" />;
    case "negative":
      return <Frown className="h-4 w-4 text-red-500" />;
    default:
      return <Meh className="h-4 w-4 text-yellow-500" />;
  }
}

function getSentimentColor(sentiment: string) {
  switch (sentiment) {
    case "positive":
      return "bg-green-500/10 text-green-600 border-green-500/20";
    case "negative":
      return "bg-red-500/10 text-red-600 border-red-500/20";
    default:
      return "bg-yellow-500/10 text-yellow-600 border-yellow-500/20";
  }
}

function getIntensityColor(intensity: string) {
  switch (intensity) {
    case "high":
      return "bg-purple-500/10 text-purple-600";
    case "medium":
      return "bg-blue-500/10 text-blue-600";
    default:
      return "bg-gray-500/10 text-gray-600";
  }
}

function getEmotionColor(emotion: string) {
  const colors: Record<string, string> = {
    joy: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
    love: "bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-300",
    trust: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
    anticipation: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300",
    sadness: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300",
    anger: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
    fear: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
    surprise: "bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-300",
    disgust: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  };
  return colors[emotion.toLowerCase()] || "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300";
}

export default function AISentiment() {
  const [customText, setCustomText] = useState("");
  const [selectedDataset, setSelectedDataset] = useState("tiktok_json");
  const { toast } = useToast();

  const { data: datasets } = useQuery<Dataset[]>({
    queryKey: ["/api/datasets"],
  });

  const { data: batchResults, isLoading: isBatchLoading, refetch: refetchBatch } = useQuery<{
    success: boolean;
    datasetName: string;
    results: SentimentResult[];
  }>({
    queryKey: ["/api/sentiment/batch", selectedDataset],
    queryFn: async () => {
      const response = await fetch(`/api/sentiment/batch/${selectedDataset}?limit=10`);
      if (!response.ok) throw new Error("Failed to fetch batch sentiment");
      return response.json();
    },
    enabled: !!selectedDataset,
  });

  const analyzeMutation = useMutation({
    mutationFn: async (text: string) => {
      const response = await apiRequest("POST", "/api/sentiment/analyze", { text });
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Analysis Complete",
        description: `Sentiment: ${data.result.sentiment} (${Math.round(data.result.confidence * 100)}% confidence)`,
      });
    },
    onError: () => {
      toast({
        title: "Analysis Failed",
        description: "Could not analyze the text. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleAnalyze = () => {
    if (!customText.trim()) {
      toast({
        title: "Empty Text",
        description: "Please enter some text to analyze.",
        variant: "destructive",
      });
      return;
    }
    analyzeMutation.mutate(customText);
  };

  return (
    <div className="flex-1 overflow-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2" data-testid="heading-ai-sentiment">
            <Brain className="h-8 w-8 text-primary" />
            AI Sentiment Analysis
          </h1>
          <p className="text-muted-foreground mt-1">
            Advanced emotion detection powered by GPT-4o
          </p>
        </div>
        <Badge variant="outline" className="flex items-center gap-1">
          <Sparkles className="h-3 w-3" />
          AI-Powered
        </Badge>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-yellow-500" />
              Custom Text Analysis
            </CardTitle>
            <CardDescription>
              Enter any text to analyze its emotional content
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              placeholder="Enter text to analyze... (e.g., 'I absolutely love this product! It exceeded all my expectations.')"
              value={customText}
              onChange={(e) => setCustomText(e.target.value)}
              rows={4}
              data-testid="input-custom-text"
            />
            <Button
              onClick={handleAnalyze}
              disabled={analyzeMutation.isPending || !customText.trim()}
              className="w-full"
              data-testid="button-analyze"
            >
              {analyzeMutation.isPending ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Brain className="h-4 w-4 mr-2" />
                  Analyze Sentiment
                </>
              )}
            </Button>

            {analyzeMutation.data && (
              <div className="mt-4 p-4 rounded-lg border bg-card">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    {getSentimentIcon(analyzeMutation.data.result.sentiment)}
                    <span className="font-semibold capitalize">
                      {analyzeMutation.data.result.sentiment}
                    </span>
                  </div>
                  <Badge className={getIntensityColor(analyzeMutation.data.result.intensity)}>
                    {analyzeMutation.data.result.intensity} intensity
                  </Badge>
                </div>

                <div className="space-y-3">
                  <div>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="text-muted-foreground">Confidence</span>
                      <span className="font-medium">
                        {Math.round(analyzeMutation.data.result.confidence * 100)}%
                      </span>
                    </div>
                    <Progress value={analyzeMutation.data.result.confidence * 100} />
                  </div>

                  {analyzeMutation.data.result.emotions.length > 0 && (
                    <div>
                      <span className="text-sm text-muted-foreground block mb-2">Emotions</span>
                      <div className="flex flex-wrap gap-1">
                        {analyzeMutation.data.result.emotions.map((emotion: string) => (
                          <Badge key={emotion} className={getEmotionColor(emotion)}>
                            {emotion}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {analyzeMutation.data.result.keywords.length > 0 && (
                    <div>
                      <span className="text-sm text-muted-foreground block mb-2">Key Terms</span>
                      <div className="flex flex-wrap gap-1">
                        {analyzeMutation.data.result.keywords.map((keyword: string) => (
                          <Badge key={keyword} variant="outline">
                            {keyword}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-blue-500" />
              Dataset Batch Analysis
            </CardTitle>
            <CardDescription>
              Analyze multiple items from your datasets
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Select value={selectedDataset} onValueChange={setSelectedDataset}>
                <SelectTrigger data-testid="select-dataset">
                  <SelectValue placeholder="Select dataset" />
                </SelectTrigger>
                <SelectContent>
                  {datasets?.map((ds) => (
                    <SelectItem key={ds.id} value={ds.id}>
                      {ds.displayName} ({ds.recordCount})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                onClick={() => refetchBatch()}
                disabled={isBatchLoading}
                data-testid="button-refresh-batch"
              >
                <RefreshCw className={`h-4 w-4 ${isBatchLoading ? "animate-spin" : ""}`} />
              </Button>
            </div>

            <div className="space-y-3 max-h-[400px] overflow-y-auto">
              {isBatchLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="p-3 rounded-lg border">
                    <Skeleton className="h-4 w-3/4 mb-2" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                ))
              ) : batchResults?.results?.length ? (
                batchResults.results.map((result) => (
                  <div
                    key={result.id}
                    className="p-3 rounded-lg border hover-elevate transition-all"
                    data-testid={`sentiment-item-${result.id}`}
                  >
                    <p className="text-sm mb-2 line-clamp-2">{result.text}</p>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge className={getSentimentColor(result.analysis.sentiment)}>
                          {getSentimentIcon(result.analysis.sentiment)}
                          <span className="ml-1">{result.analysis.sentiment}</span>
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {Math.round(result.analysis.confidence * 100)}%
                        </span>
                      </div>
                      <div className="flex gap-1">
                        {result.analysis.emotions.slice(0, 2).map((emotion) => (
                          <Badge
                            key={emotion}
                            variant="outline"
                            className="text-xs"
                          >
                            {emotion}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No results available</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>How It Works</CardTitle>
          <CardDescription>Understanding AI-powered sentiment analysis</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <div className="p-4 rounded-lg bg-muted/50">
              <div className="flex items-center gap-2 mb-2">
                <div className="p-2 rounded-full bg-blue-500/10">
                  <Brain className="h-4 w-4 text-blue-500" />
                </div>
                <h4 className="font-medium">GPT-4o Model</h4>
              </div>
              <p className="text-sm text-muted-foreground">
                Uses OpenAI's advanced language model for accurate analysis
              </p>
            </div>
            <div className="p-4 rounded-lg bg-muted/50">
              <div className="flex items-center gap-2 mb-2">
                <div className="p-2 rounded-full bg-green-500/10">
                  <Heart className="h-4 w-4 text-green-500" />
                </div>
                <h4 className="font-medium">Emotion Detection</h4>
              </div>
              <p className="text-sm text-muted-foreground">
                Identifies specific emotions like joy, trust, and anticipation
              </p>
            </div>
            <div className="p-4 rounded-lg bg-muted/50">
              <div className="flex items-center gap-2 mb-2">
                <div className="p-2 rounded-full bg-purple-500/10">
                  <Zap className="h-4 w-4 text-purple-500" />
                </div>
                <h4 className="font-medium">Intensity Scoring</h4>
              </div>
              <p className="text-sm text-muted-foreground">
                Measures how strong the emotional expression is
              </p>
            </div>
            <div className="p-4 rounded-lg bg-muted/50">
              <div className="flex items-center gap-2 mb-2">
                <div className="p-2 rounded-full bg-orange-500/10">
                  <TrendingUp className="h-4 w-4 text-orange-500" />
                </div>
                <h4 className="font-medium">Keyword Extraction</h4>
              </div>
              <p className="text-sm text-muted-foreground">
                Identifies key sentiment-bearing words and phrases
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
