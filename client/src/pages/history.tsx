import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { useState } from "react";
import { 
  Clock, 
  Database, 
  TrendingUp, 
  BarChart3,
  LineChart as LineChartIcon,
  Calendar
} from "lucide-react";
import { format } from "date-fns";

interface HistoryEntry {
  id: string;
  datasetName: string;
  analysisType: string;
  summary: {
    totalRecords: number;
    avgEngagementRate: number;
    dominantSentiment: string;
  };
  createdAt: string;
}

interface HistoryResponse {
  success: boolean;
  history: HistoryEntry[];
}

function getSentimentColor(sentiment: string): "default" | "destructive" | "outline" | "secondary" {
  switch (sentiment) {
    case "positive":
      return "default";
    case "negative":
      return "destructive";
    default:
      return "secondary";
  }
}

function getDatasetDisplayName(name: string): string {
  switch (name) {
    case "tiktok_json":
      return "TikTok JSON";
    case "tiktok_csv":
      return "TikTok CSV";
    case "phone_conversations":
      return "Phone Conversations";
    default:
      return name;
  }
}

function getAnalysisTypeIcon(type: string) {
  switch (type) {
    case "full":
      return <BarChart3 className="h-4 w-4" />;
    case "sentiment":
      return <TrendingUp className="h-4 w-4" />;
    case "trends":
      return <LineChartIcon className="h-4 w-4" />;
    default:
      return <Database className="h-4 w-4" />;
  }
}

export default function HistoryPage() {
  const [datasetFilter, setDatasetFilter] = useState<string>("all");
  const [limitFilter, setLimitFilter] = useState<string>("50");

  const { data, isLoading, error } = useQuery<HistoryResponse>({
    queryKey: ["/api/history", limitFilter],
    queryFn: async () => {
      const response = await fetch(`/api/history?limit=${limitFilter}`);
      if (!response.ok) throw new Error('Failed to fetch history');
      return response.json();
    },
  });

  const filteredHistory = data?.history?.filter((entry) => 
    datasetFilter === "all" || entry.datasetName === datasetFilter
  ) || [];

  if (error) {
    return (
      <div className="container mx-auto p-6" data-testid="page-history">
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="text-destructive">Error Loading History</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">Failed to load analytics history. Please try again later.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6" data-testid="page-history">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Analytics History</h1>
          <p className="text-muted-foreground">
            View past analysis runs and saved results
          </p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <Select value={datasetFilter} onValueChange={setDatasetFilter}>
            <SelectTrigger className="w-[180px]" data-testid="select-dataset-filter">
              <SelectValue placeholder="Filter by dataset" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Datasets</SelectItem>
              <SelectItem value="tiktok_json">TikTok JSON</SelectItem>
              <SelectItem value="tiktok_csv">TikTok CSV</SelectItem>
              <SelectItem value="phone_conversations">Phone Conversations</SelectItem>
            </SelectContent>
          </Select>
          
          <Select value={limitFilter} onValueChange={setLimitFilter}>
            <SelectTrigger className="w-[120px]" data-testid="select-limit-filter">
              <SelectValue placeholder="Show" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="10">Last 10</SelectItem>
              <SelectItem value="25">Last 25</SelectItem>
              <SelectItem value="50">Last 50</SelectItem>
              <SelectItem value="100">Last 100</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
            <CardTitle className="text-sm font-medium">Total Analyses</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-analyses">
              {isLoading ? <Skeleton className="h-8 w-16" /> : data?.history?.length || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Stored in database
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
            <CardTitle className="text-sm font-medium">Filtered Results</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-filtered-count">
              {isLoading ? <Skeleton className="h-8 w-16" /> : filteredHistory.length}
            </div>
            <p className="text-xs text-muted-foreground">
              Matching current filter
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
            <CardTitle className="text-sm font-medium">Last Analysis</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-last-analysis">
              {isLoading ? (
                <Skeleton className="h-8 w-24" />
              ) : filteredHistory.length > 0 ? (
                format(new Date(filteredHistory[0].createdAt), "HH:mm")
              ) : (
                "N/A"
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {filteredHistory.length > 0 && !isLoading
                ? format(new Date(filteredHistory[0].createdAt), "MMM d, yyyy")
                : "No analyses yet"}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Analysis History</CardTitle>
          <CardDescription>
            Browse all saved analytics runs and their summaries
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-center gap-4 p-4 border rounded-lg">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-48" />
                  </div>
                  <Skeleton className="h-6 w-20" />
                </div>
              ))}
            </div>
          ) : filteredHistory.length === 0 ? (
            <div className="text-center py-12">
              <Database className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold">No History Found</h3>
              <p className="text-muted-foreground mt-2">
                Run an analysis with the "Save to Database" option enabled to store results.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredHistory.map((entry) => (
                <div
                  key={entry.id}
                  className="flex flex-col sm:flex-row sm:items-center gap-4 p-4 border rounded-lg hover-elevate transition-all"
                  data-testid={`history-entry-${entry.id}`}
                >
                  <div className="flex items-center gap-3 flex-1">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                      {getAnalysisTypeIcon(entry.analysisType)}
                    </div>
                    <div>
                      <div className="font-medium">
                        {getDatasetDisplayName(entry.datasetName)}
                      </div>
                      <div className="text-sm text-muted-foreground flex items-center gap-2">
                        <Calendar className="h-3 w-3" />
                        {format(new Date(entry.createdAt), "MMM d, yyyy 'at' HH:mm")}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline" className="gap-1">
                      <Database className="h-3 w-3" />
                      {entry.summary.totalRecords} records
                    </Badge>
                    <Badge variant="outline" className="gap-1">
                      <TrendingUp className="h-3 w-3" />
                      {entry.summary.avgEngagementRate.toFixed(1)}% engagement
                    </Badge>
                    <Badge variant={getSentimentColor(entry.summary.dominantSentiment)}>
                      {entry.summary.dominantSentiment}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
