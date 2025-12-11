import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { DatasetSelector } from "@/components/dataset-selector";
import { PageHeader } from "@/components/page-header";
import { EngagementTrendChart } from "@/components/engagement-trend-chart";
import { ActivityHeatmap } from "@/components/activity-heatmap";
import { SentimentTrendChart } from "@/components/sentiment-trend-chart";
import { ErrorAlert } from "@/components/error-alert";
import { EmptyState } from "@/components/empty-state";
import { LineChart, BarChart3, Grid3X3, TrendingUp, Activity } from "lucide-react";
import type { AdvancedVisualizationData } from "@shared/schema";

export default function VisualizationsPage() {
  const [selectedDataset, setSelectedDataset] = useState("tiktok_main");

  const {
    data: visualizations,
    isLoading,
    error,
    refetch,
  } = useQuery<AdvancedVisualizationData & { success: boolean; datasetName: string }>({
    queryKey: [`/api/visualizations/${selectedDataset}`],
    enabled: !!selectedDataset,
  });

  if (error) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <PageHeader
          title="Advanced Visualizations"
          description="Interactive data exploration"
          showBack
        />
        <ErrorAlert
          message="Failed to load visualizations. Please try again."
          onRetry={() => refetch()}
        />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto animate-fade-in">
      <PageHeader
        title="Advanced Visualizations"
        description="Interactive charts and heatmaps for deep data exploration"
        showBack
        onRefresh={() => refetch()}
        isRefreshing={isLoading}
        actions={
          <div className="flex items-center gap-4 flex-wrap">
            <div className="w-48">
              <DatasetSelector
                value={selectedDataset}
                onValueChange={setSelectedDataset}
              />
            </div>
            <Badge variant="outline" className="flex items-center gap-1">
              <BarChart3 className="h-3 w-3" />
              Interactive
            </Badge>
          </div>
        }
      />

      {!isLoading && !visualizations && (
        <EmptyState
          icon={LineChart}
          title="No visualization data"
          description="Select a dataset to view advanced charts."
        />
      )}

      {(isLoading || visualizations) && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-primary" />
                Overview
              </CardTitle>
              <CardDescription>
                Explore engagement patterns, sentiment trends, and activity distribution
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="p-4 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className="h-4 w-4 text-chart-1" />
                    <span className="text-sm font-medium">Engagement Trends</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Track views, likes, and comments over time with interactive line charts
                  </p>
                </div>
                <div className="p-4 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-2 mb-2">
                    <Grid3X3 className="h-4 w-4 text-chart-2" />
                    <span className="text-sm font-medium">Activity Heatmap</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Discover peak activity hours and days with visual intensity mapping
                  </p>
                </div>
                <div className="p-4 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-2 mb-2">
                    <LineChart className="h-4 w-4 text-chart-5" />
                    <span className="text-sm font-medium">Sentiment Flow</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Visualize emotional sentiment changes with stacked area charts
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-6 lg:grid-cols-2">
            {isLoading ? (
              <>
                <Card>
                  <CardHeader>
                    <Skeleton className="h-6 w-40" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-64 w-full" />
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <Skeleton className="h-6 w-40" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-64 w-full" />
                  </CardContent>
                </Card>
              </>
            ) : (
              <>
                <EngagementTrendChart
                  data={visualizations?.engagementTrends || []}
                  isLoading={isLoading}
                  title="Engagement Over Time"
                />
                <SentimentTrendChart
                  data={visualizations?.sentimentTrends || []}
                  isLoading={isLoading}
                  title="Sentiment Timeline"
                />
              </>
            )}
          </div>

          <div>
            {isLoading ? (
              <Card>
                <CardHeader>
                  <Skeleton className="h-6 w-40" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-48 w-full" />
                </CardContent>
              </Card>
            ) : (
              <ActivityHeatmap
                data={visualizations?.activityHeatmap || []}
                isLoading={isLoading}
                title="Weekly Activity Pattern"
              />
            )}
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Insights</CardTitle>
              <CardDescription>Key findings from the visualization data</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-3">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-5/6" />
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  <InsightCard
                    title="Peak Engagement"
                    value={getPeakEngagement(visualizations?.engagementTrends || [])}
                    description="Highest recorded engagement day"
                  />
                  <InsightCard
                    title="Sentiment Ratio"
                    value={getSentimentRatio(visualizations?.sentimentTrends || [])}
                    description="Positive to negative content ratio"
                  />
                  <InsightCard
                    title="Most Active Period"
                    value={getMostActivePeriod(visualizations?.activityHeatmap || [])}
                    description="Peak activity time slot"
                  />
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

function InsightCard({
  title,
  value,
  description,
}: {
  title: string;
  value: string;
  description: string;
}) {
  return (
    <div className="p-4 rounded-lg border bg-card" data-testid={`insight-${title.toLowerCase().replace(/\s+/g, '-')}`}>
      <p className="text-sm text-muted-foreground">{title}</p>
      <p className="text-2xl font-bold mt-1">{value}</p>
      <p className="text-xs text-muted-foreground mt-1">{description}</p>
    </div>
  );
}

function getPeakEngagement(data: any[]): string {
  if (!data.length) return "N/A";
  const peak = data.reduce((max, curr) =>
    (curr.views + curr.likes) > (max.views + max.likes) ? curr : max
  );
  return formatDate(peak.date);
}

function getSentimentRatio(data: any[]): string {
  if (!data.length) return "N/A";
  const totals = data.reduce(
    (acc, curr) => ({
      positive: acc.positive + curr.positive,
      negative: acc.negative + curr.negative,
    }),
    { positive: 0, negative: 0 }
  );
  if (totals.negative === 0) return `${totals.positive}:0`;
  const ratio = (totals.positive / totals.negative).toFixed(1);
  return `${ratio}:1`;
}

function getMostActivePeriod(data: any[]): string {
  if (!data.length) return "N/A";
  const peak = data.reduce((max, curr) => (curr.value > max.value ? curr : max));
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  return `${days[peak.day]} ${peak.hour}:00`;
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
