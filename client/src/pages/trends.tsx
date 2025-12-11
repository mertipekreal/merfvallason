import { useQuery } from "@tanstack/react-query";
import { TrendingList } from "@/components/trending-list";
import { HashtagCloud } from "@/components/hashtag-cloud";
import { CategoryChart } from "@/components/category-chart";
import { PageHeader } from "@/components/page-header";
import { DatasetSelector } from "@/components/dataset-selector";
import { ErrorAlert } from "@/components/error-alert";
import { EmptyState } from "@/components/empty-state";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUp, Flame, Zap, Target } from "lucide-react";
import { useState } from "react";
import type { TrendsData } from "@shared/schema";
import { cn } from "@/lib/utils";

export default function TrendsPage() {
  const [selectedDataset, setSelectedDataset] = useState("tiktok_main");

  const {
    data: trends,
    isLoading,
    error,
    refetch,
  } = useQuery<TrendsData>({
    queryKey: [`/api/trends/${selectedDataset}`],
    enabled: !!selectedDataset,
  });

  if (error) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <PageHeader
          title="Trend Detection"
          description="Discover trending content and patterns"
          showBack
        />
        <ErrorAlert
          message="Failed to load trends. Please try again."
          onRetry={() => refetch()}
        />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto animate-fade-in">
      <PageHeader
        title="Trend Detection"
        description="Discover trending content, hashtags, and patterns"
        showBack
        onRefresh={() => refetch()}
        isRefreshing={isLoading}
        actions={
          <div className="w-48">
            <DatasetSelector
              value={selectedDataset}
              onValueChange={setSelectedDataset}
            />
          </div>
        }
      />

      {!isLoading && !trends && (
        <EmptyState
          icon={TrendingUp}
          title="No trends available"
          description="Select a dataset to discover trending content and patterns."
        />
      )}

      {(isLoading || trends) && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <Card className="hover-elevate transition-all duration-200">
              <CardContent className="p-6">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-chart-4/10">
                    <Flame className="h-6 w-6 text-chart-4" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Trending Items
                    </p>
                    {isLoading ? (
                      <Skeleton className="h-8 w-16 mt-1" />
                    ) : (
                      <p className="text-3xl font-bold font-mono">
                        {trends?.trendingContent?.length || 0}
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="hover-elevate transition-all duration-200">
              <CardContent className="p-6">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                    <Zap className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Hot Hashtags
                    </p>
                    {isLoading ? (
                      <Skeleton className="h-8 w-16 mt-1" />
                    ) : (
                      <p className="text-3xl font-bold font-mono">
                        {trends?.trendingHashtags?.length || 0}
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="hover-elevate transition-all duration-200">
              <CardContent className="p-6">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-chart-2/10">
                    <Target className="h-6 w-6 text-chart-2" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Overall Sentiment
                    </p>
                    {isLoading ? (
                      <Skeleton className="h-8 w-24 mt-1" />
                    ) : (
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-lg font-semibold mt-1",
                          trends?.overallSentiment === "positive" &&
                            "border-sentiment-positive text-sentiment-positive",
                          trends?.overallSentiment === "negative" &&
                            "border-sentiment-negative text-sentiment-negative",
                          trends?.overallSentiment === "neutral" &&
                            "border-sentiment-neutral text-sentiment-neutral"
                        )}
                      >
                        {trends?.overallSentiment || "N/A"}
                      </Badge>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <TrendingList
              data={trends?.trendingContent || []}
              isLoading={isLoading}
              title="Hot Trending Content"
              limit={10}
            />
            <HashtagCloud
              data={trends?.trendingHashtags || []}
              isLoading={isLoading}
              title="Trending Hashtags"
            />
          </div>

          <CategoryChart
            data={trends?.trendingCategories || []}
            isLoading={isLoading}
            title="Trending Categories"
          />
        </>
      )}
    </div>
  );
}
