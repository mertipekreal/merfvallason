import { useQuery } from "@tanstack/react-query";
import { MetricCard } from "@/components/metric-card";
import { SentimentChart } from "@/components/sentiment-chart";
import { CategoryChart } from "@/components/category-chart";
import { HashtagCloud } from "@/components/hashtag-cloud";
import { CreatorList } from "@/components/creator-list";
import { TrendingList } from "@/components/trending-list";
import { PageHeader } from "@/components/page-header";
import { DatasetSelector } from "@/components/dataset-selector";
import { ExportButtons } from "@/components/export-buttons";
import { ErrorAlert } from "@/components/error-alert";
import { EmptyState } from "@/components/empty-state";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Eye,
  Heart,
  MessageCircle,
  Share2,
  Activity,
  BarChart3,
  Brain,
  Sparkles,
} from "lucide-react";
import { useState } from "react";
import type { AnalyticsData, TrendsData } from "@shared/schema";

export default function Dashboard() {
  const [selectedDataset, setSelectedDataset] = useState("tiktok_main");

  const {
    data: analytics,
    isLoading: analyticsLoading,
    error: analyticsError,
    refetch: refetchAnalytics,
  } = useQuery<AnalyticsData>({
    queryKey: [`/api/analytics/${selectedDataset}`],
    enabled: !!selectedDataset,
  });

  const {
    data: trends,
    isLoading: trendsLoading,
    error: trendsError,
    refetch: refetchTrends,
  } = useQuery<TrendsData>({
    queryKey: [`/api/trends/${selectedDataset}`],
    enabled: !!selectedDataset,
  });

  const handleRefresh = () => {
    refetchAnalytics();
    refetchTrends();
  };

  const isLoading = analyticsLoading || trendsLoading;
  const hasError = analyticsError || trendsError;

  return (
    <div className="p-6 max-w-7xl mx-auto animate-fade-in">
      <PageHeader
        title="Dashboard"
        description="Overview of your emotional analytics and insights"
        onRefresh={handleRefresh}
        isRefreshing={isLoading}
        actions={
          <div className="flex items-center gap-4 flex-wrap">
            <div className="w-48">
              <DatasetSelector
                value={selectedDataset}
                onValueChange={setSelectedDataset}
              />
            </div>
            <ExportButtons
              datasetName={selectedDataset}
              disabled={!analytics}
            />
          </div>
        }
      />

      {hasError && (
        <ErrorAlert
          message="Failed to load analytics data. Please try again."
          onRetry={handleRefresh}
        />
      )}

      {!hasError && !isLoading && !analytics && (
        <EmptyState
          icon={BarChart3}
          title="No data available"
          description="Select a dataset to view analytics and insights."
        />
      )}

      {(isLoading || analytics) && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <MetricCard
              title="Total Views"
              value={analytics?.totalViews || 0}
              icon={Eye}
              isLoading={isLoading}
              iconClassName="bg-chart-1/10 text-chart-1"
            />
            <MetricCard
              title="Total Likes"
              value={analytics?.totalLikes || 0}
              icon={Heart}
              isLoading={isLoading}
              iconClassName="bg-chart-5/10 text-chart-5"
            />
            <MetricCard
              title="Total Comments"
              value={analytics?.totalComments || 0}
              icon={MessageCircle}
              isLoading={isLoading}
              iconClassName="bg-chart-2/10 text-chart-2"
            />
            <MetricCard
              title="Engagement Rate"
              value={
                analytics?.avgEngagementRate
                  ? `${analytics.avgEngagementRate.toFixed(2)}%`
                  : "0%"
              }
              icon={Activity}
              isLoading={isLoading}
              iconClassName="bg-chart-3/10 text-chart-3"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <Card className="col-span-1 md:col-span-2 lg:col-span-1">
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                    <Brain className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold">AI-Powered Insights</h3>
                    <p className="text-sm text-muted-foreground">
                      Emotional analysis summary
                    </p>
                  </div>
                </div>
                {isLoading ? (
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-4 w-5/6" />
                  </div>
                ) : analytics ? (
                  <div className="space-y-3 text-sm text-muted-foreground">
                    <p className="flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-primary" />
                      <span>
                        Analyzed <strong className="text-foreground">{analytics.totalRecords.toLocaleString()}</strong> content items
                      </span>
                    </p>
                    <p className="flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-primary" />
                      <span>
                        Dominant sentiment: <strong className="text-foreground capitalize">
                          {getDominantSentiment(analytics.sentimentBreakdown)}
                        </strong>
                      </span>
                    </p>
                    <p className="flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-primary" />
                      <span>
                        Top category: <strong className="text-foreground">
                          {analytics.categoryBreakdown?.[0]?.category || "N/A"}
                        </strong>
                      </span>
                    </p>
                  </div>
                ) : null}
              </CardContent>
            </Card>

            <SentimentChart
              data={
                analytics?.sentimentBreakdown || {
                  positive: 0,
                  negative: 0,
                  neutral: 0,
                }
              }
              isLoading={isLoading}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <CategoryChart
              data={analytics?.categoryBreakdown || []}
              isLoading={isLoading}
            />
            <HashtagCloud
              data={analytics?.topHashtags || []}
              isLoading={isLoading}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <CreatorList
              data={analytics?.topCreators || []}
              isLoading={isLoading}
            />
            <TrendingList
              data={trends?.trendingContent || []}
              isLoading={trendsLoading}
            />
          </div>
        </>
      )}
    </div>
  );
}

function getDominantSentiment(sentiment?: {
  positive: number;
  negative: number;
  neutral: number;
}): string {
  if (!sentiment) return "neutral";
  const { positive, negative, neutral } = sentiment;
  if (positive >= negative && positive >= neutral) return "positive";
  if (negative >= positive && negative >= neutral) return "negative";
  return "neutral";
}
