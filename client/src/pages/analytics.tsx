import { useQuery, useMutation } from "@tanstack/react-query";
import { MetricCard } from "@/components/metric-card";
import { SentimentChart } from "@/components/sentiment-chart";
import { CategoryChart } from "@/components/category-chart";
import { HashtagCloud } from "@/components/hashtag-cloud";
import { CreatorList } from "@/components/creator-list";
import { EmojiList } from "@/components/emoji-list";
import { ActiveHoursChart } from "@/components/active-hours-chart";
import { PageHeader } from "@/components/page-header";
import { DatasetSelector } from "@/components/dataset-selector";
import { ExportButtons } from "@/components/export-buttons";
import { ErrorAlert } from "@/components/error-alert";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import {
  Eye,
  Heart,
  MessageCircle,
  Share2,
  Activity,
  FileText,
  BarChart3,
  Database,
  Loader2,
} from "lucide-react";
import { useState } from "react";
import type { AnalyticsData } from "@shared/schema";

export default function AnalyticsPage() {
  const [selectedDataset, setSelectedDataset] = useState("tiktok_main");
  const { toast } = useToast();

  const {
    data: analytics,
    isLoading,
    error,
    refetch,
  } = useQuery<AnalyticsData>({
    queryKey: [`/api/analytics/${selectedDataset}`],
    enabled: !!selectedDataset,
  });

  const saveToDatabase = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/analytics/${selectedDataset}?save=true`);
      if (!response.ok) throw new Error('Failed to save');
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Saved to Database",
        description: "Analytics results have been stored successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/history"] });
    },
    onError: () => {
      toast({
        title: "Save Failed",
        description: "Could not save analytics to database.",
        variant: "destructive",
      });
    },
  });

  if (error) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <PageHeader
          title="Analytics"
          description="Deep dive into your data insights"
          showBack
        />
        <ErrorAlert
          message="Failed to load analytics. Please try again."
          onRetry={() => refetch()}
        />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto animate-fade-in">
      <PageHeader
        title="Analytics"
        description="Comprehensive data analysis and insights"
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
            <Button
              variant="outline"
              onClick={() => saveToDatabase.mutate()}
              disabled={!analytics || saveToDatabase.isPending}
              data-testid="button-save-to-db"
            >
              {saveToDatabase.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Database className="h-4 w-4 mr-2" />
              )}
              Save to Database
            </Button>
            <ExportButtons
              datasetName={selectedDataset}
              disabled={!analytics}
            />
          </div>
        }
      />

      {!isLoading && !analytics && (
        <EmptyState
          icon={BarChart3}
          title="No analytics data"
          description="Select a dataset to view detailed analytics."
        />
      )}

      {(isLoading || analytics) && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-8">
            <MetricCard
              title="Total Records"
              value={analytics?.totalRecords || 0}
              icon={FileText}
              isLoading={isLoading}
              iconClassName="bg-primary/10 text-primary"
            />
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
              title="Comments"
              value={analytics?.totalComments || 0}
              icon={MessageCircle}
              isLoading={isLoading}
              iconClassName="bg-chart-2/10 text-chart-2"
            />
            <MetricCard
              title="Shares"
              value={analytics?.totalShares || 0}
              icon={Share2}
              isLoading={isLoading}
              iconClassName="bg-chart-3/10 text-chart-3"
            />
            <MetricCard
              title="Engagement"
              value={
                analytics?.avgEngagementRate
                  ? `${analytics.avgEngagementRate.toFixed(2)}%`
                  : "0%"
              }
              icon={Activity}
              isLoading={isLoading}
              iconClassName="bg-chart-4/10 text-chart-4"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <SentimentChart
              data={
                analytics?.sentimentBreakdown || {
                  positive: 0,
                  negative: 0,
                  neutral: 0,
                }
              }
              isLoading={isLoading}
              title="Sentiment Distribution"
            />
            <CategoryChart
              data={analytics?.categoryBreakdown || []}
              isLoading={isLoading}
              title="Content by Category"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <HashtagCloud
              data={analytics?.topHashtags || []}
              isLoading={isLoading}
              title="Trending Hashtags"
            />
            <EmojiList
              data={analytics?.topEmojis || []}
              isLoading={isLoading}
              title="Popular Emojis"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <CreatorList
              data={analytics?.topCreators || []}
              isLoading={isLoading}
              title="Top Performing Creators"
            />
            <ActiveHoursChart
              data={analytics?.activeHours || []}
              isLoading={isLoading}
              title="Peak Activity Hours"
            />
          </div>
        </>
      )}
    </div>
  );
}
