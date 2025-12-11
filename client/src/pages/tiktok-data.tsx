import { useQuery } from "@tanstack/react-query";
import { MetricCard } from "@/components/metric-card";
import { SentimentChart } from "@/components/sentiment-chart";
import { HashtagCloud } from "@/components/hashtag-cloud";
import { CreatorList } from "@/components/creator-list";
import { TrendingList } from "@/components/trending-list";
import { PageHeader } from "@/components/page-header";
import { ExportButtons } from "@/components/export-buttons";
import { ErrorAlert } from "@/components/error-alert";
import { EmptyState } from "@/components/empty-state";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Eye,
  Heart,
  MessageCircle,
  Share2,
  FileJson,
  FileSpreadsheet,
  Play,
} from "lucide-react";
import type { AnalyticsData, TrendsData } from "@shared/schema";

export default function TikTokDataPage() {
  const {
    data: jsonAnalytics,
    isLoading: jsonLoading,
    error: jsonError,
    refetch: refetchJson,
  } = useQuery<AnalyticsData>({
    queryKey: ["/api/analytics/tiktok_main"],
  });

  const {
    data: csvAnalytics,
    isLoading: csvLoading,
    error: csvError,
    refetch: refetchCsv,
  } = useQuery<AnalyticsData>({
    queryKey: ["/api/analytics/tiktok_poizi"],
  });

  const {
    data: jsonTrends,
    isLoading: jsonTrendsLoading,
  } = useQuery<TrendsData>({
    queryKey: ["/api/trends/tiktok_main"],
  });

  const handleRefresh = () => {
    refetchJson();
    refetchCsv();
  };

  const hasError = jsonError || csvError;

  return (
    <div className="p-6 max-w-7xl mx-auto animate-fade-in">
      <PageHeader
        title="TikTok Data"
        description="Analyze TikTok content and engagement patterns"
        showBack
        onRefresh={handleRefresh}
        isRefreshing={jsonLoading || csvLoading}
      />

      {hasError && (
        <ErrorAlert
          message="Failed to load TikTok data. Please try again."
          onRetry={handleRefresh}
        />
      )}

      <Tabs defaultValue="json" className="space-y-6">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="json" className="flex items-center gap-2" data-testid="tab-json">
            <FileJson className="h-4 w-4" />
            Ana Veri
          </TabsTrigger>
          <TabsTrigger value="csv" className="flex items-center gap-2" data-testid="tab-csv">
            <FileSpreadsheet className="h-4 w-4" />
            Poizi Hesabı
          </TabsTrigger>
        </TabsList>

        <TabsContent value="json" className="space-y-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Badge variant="secondary">
                {jsonAnalytics?.totalRecords || 0} records
              </Badge>
            </div>
            <ExportButtons datasetName="tiktok_main" disabled={!jsonAnalytics} />
          </div>

          {!jsonLoading && !jsonAnalytics && (
            <EmptyState
              icon={Play}
              title="No TikTok JSON data"
              description="Upload TikTok data to start analyzing content performance."
            />
          )}

          {(jsonLoading || jsonAnalytics) && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <MetricCard
                  title="Total Views"
                  value={jsonAnalytics?.totalViews || 0}
                  icon={Eye}
                  isLoading={jsonLoading}
                  iconClassName="bg-chart-1/10 text-chart-1"
                />
                <MetricCard
                  title="Total Likes"
                  value={jsonAnalytics?.totalLikes || 0}
                  icon={Heart}
                  isLoading={jsonLoading}
                  iconClassName="bg-chart-5/10 text-chart-5"
                />
                <MetricCard
                  title="Comments"
                  value={jsonAnalytics?.totalComments || 0}
                  icon={MessageCircle}
                  isLoading={jsonLoading}
                  iconClassName="bg-chart-2/10 text-chart-2"
                />
                <MetricCard
                  title="Shares"
                  value={jsonAnalytics?.totalShares || 0}
                  icon={Share2}
                  isLoading={jsonLoading}
                  iconClassName="bg-chart-3/10 text-chart-3"
                />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <SentimentChart
                  data={
                    jsonAnalytics?.sentimentBreakdown || {
                      positive: 0,
                      negative: 0,
                      neutral: 0,
                    }
                  }
                  isLoading={jsonLoading}
                />
                <HashtagCloud
                  data={jsonAnalytics?.topHashtags || []}
                  isLoading={jsonLoading}
                />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <CreatorList
                  data={jsonAnalytics?.topCreators || []}
                  isLoading={jsonLoading}
                />
                <TrendingList
                  data={jsonTrends?.trendingContent || []}
                  isLoading={jsonTrendsLoading}
                />
              </div>
            </>
          )}
        </TabsContent>

        <TabsContent value="csv" className="space-y-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Badge variant="secondary">
                {csvAnalytics?.totalRecords || 0} records
              </Badge>
            </div>
            <ExportButtons datasetName="tiktok_poizi" disabled={!csvAnalytics} />
          </div>

          {!csvLoading && !csvAnalytics && (
            <EmptyState
              icon={Play}
              title="No TikTok CSV data"
              description="Upload TikTok sound scraper data to analyze audio trends."
            />
          )}

          {(csvLoading || csvAnalytics) && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <MetricCard
                  title="Total Views"
                  value={csvAnalytics?.totalViews || 0}
                  icon={Eye}
                  isLoading={csvLoading}
                  iconClassName="bg-chart-1/10 text-chart-1"
                />
                <MetricCard
                  title="Total Likes"
                  value={csvAnalytics?.totalLikes || 0}
                  icon={Heart}
                  isLoading={csvLoading}
                  iconClassName="bg-chart-5/10 text-chart-5"
                />
                <MetricCard
                  title="Comments"
                  value={csvAnalytics?.totalComments || 0}
                  icon={MessageCircle}
                  isLoading={csvLoading}
                  iconClassName="bg-chart-2/10 text-chart-2"
                />
                <MetricCard
                  title="Shares"
                  value={csvAnalytics?.totalShares || 0}
                  icon={Share2}
                  isLoading={csvLoading}
                  iconClassName="bg-chart-3/10 text-chart-3"
                />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <SentimentChart
                  data={
                    csvAnalytics?.sentimentBreakdown || {
                      positive: 0,
                      negative: 0,
                      neutral: 0,
                    }
                  }
                  isLoading={csvLoading}
                />
                <HashtagCloud
                  data={csvAnalytics?.topHashtags || []}
                  isLoading={csvLoading}
                />
              </div>

              <CreatorList
                data={csvAnalytics?.topCreators || []}
                isLoading={csvLoading}
              />
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
