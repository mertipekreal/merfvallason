import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { ComparisonCard } from "@/components/comparison-card";
import { SentimentChart } from "@/components/sentiment-chart";
import { HashtagCloud } from "@/components/hashtag-cloud";
import { PageHeader } from "@/components/page-header";
import { DatasetSelector } from "@/components/dataset-selector";
import { ErrorAlert } from "@/components/error-alert";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { GitCompare, ArrowRightLeft, Loader2 } from "lucide-react";
import type { ComparisonData } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

export default function ComparePage() {
  const [dataset1, setDataset1] = useState("tiktok_main");
  const [dataset2, setDataset2] = useState("tiktok_poizi");
  const { toast } = useToast();

  const compareMutation = useMutation<ComparisonData, Error, void>({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/compare", {
        dataset1,
        dataset2,
      });
      const data = await response.json();
      return data;
    },
    onError: (error) => {
      toast({
        title: "Comparison failed",
        description: error.message || "Failed to compare datasets",
        variant: "destructive",
      });
    },
  });

  const handleCompare = () => {
    if (dataset1 === dataset2) {
      toast({
        title: "Invalid selection",
        description: "Please select two different datasets to compare",
        variant: "destructive",
      });
      return;
    }
    compareMutation.mutate();
  };

  const comparison = compareMutation.data;
  const isLoading = compareMutation.isPending;

  return (
    <div className="p-6 max-w-7xl mx-auto animate-fade-in">
      <PageHeader
        title="Dataset Comparison"
        description="Compare analytics between two datasets side by side"
        showBack
      />

      <Card className="mb-8">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row items-center gap-4">
            <div className="flex-1 w-full">
              <label className="text-sm font-medium text-muted-foreground mb-2 block">
                First Dataset
              </label>
              <DatasetSelector
                value={dataset1}
                onValueChange={setDataset1}
                excludeDataset={dataset2}
              />
            </div>
            <div className="flex items-center justify-center h-10 mt-6">
              <ArrowRightLeft className="h-5 w-5 text-muted-foreground" />
            </div>
            <div className="flex-1 w-full">
              <label className="text-sm font-medium text-muted-foreground mb-2 block">
                Second Dataset
              </label>
              <DatasetSelector
                value={dataset2}
                onValueChange={setDataset2}
                excludeDataset={dataset1}
              />
            </div>
            <div className="mt-6">
              <Button
                onClick={handleCompare}
                disabled={isLoading || dataset1 === dataset2}
                data-testid="button-compare"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <GitCompare className="h-4 w-4 mr-2" />
                )}
                Compare
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {compareMutation.error && (
        <ErrorAlert
          message="Failed to compare datasets. Please try again."
          onRetry={handleCompare}
        />
      )}

      {!comparison && !isLoading && (
        <EmptyState
          icon={GitCompare}
          title="Ready to compare"
          description="Select two different datasets and click Compare to see side-by-side analytics."
        />
      )}

      {(isLoading || comparison) && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <ComparisonCard
              title="Total Records"
              metric={
                comparison?.totalRecords || {
                  dataset1Value: 0,
                  dataset2Value: 0,
                  difference: 0,
                  percentageChange: 0,
                }
              }
              dataset1Name={comparison?.dataset1Name || dataset1}
              dataset2Name={comparison?.dataset2Name || dataset2}
              isLoading={isLoading}
            />
            <ComparisonCard
              title="Total Views"
              metric={
                comparison?.totalViews || {
                  dataset1Value: 0,
                  dataset2Value: 0,
                  difference: 0,
                  percentageChange: 0,
                }
              }
              dataset1Name={comparison?.dataset1Name || dataset1}
              dataset2Name={comparison?.dataset2Name || dataset2}
              isLoading={isLoading}
              formatValue={formatLargeNumber}
            />
            <ComparisonCard
              title="Total Likes"
              metric={
                comparison?.totalLikes || {
                  dataset1Value: 0,
                  dataset2Value: 0,
                  difference: 0,
                  percentageChange: 0,
                }
              }
              dataset1Name={comparison?.dataset1Name || dataset1}
              dataset2Name={comparison?.dataset2Name || dataset2}
              isLoading={isLoading}
              formatValue={formatLargeNumber}
            />
            <ComparisonCard
              title="Engagement Rate"
              metric={
                comparison?.engagementRate || {
                  dataset1Value: 0,
                  dataset2Value: 0,
                  difference: 0,
                  percentageChange: 0,
                }
              }
              dataset1Name={comparison?.dataset1Name || dataset1}
              dataset2Name={comparison?.dataset2Name || dataset2}
              isLoading={isLoading}
              formatValue={(v) => `${v.toFixed(2)}%`}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg font-medium flex items-center gap-2">
                  <Badge variant="secondary">Dataset 1</Badge>
                  {comparison?.dataset1Name || dataset1}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <SentimentChart
                  data={
                    comparison?.dataset1Sentiment || {
                      positive: 0,
                      negative: 0,
                      neutral: 0,
                    }
                  }
                  isLoading={isLoading}
                  title=""
                />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-lg font-medium flex items-center gap-2">
                  <Badge variant="secondary">Dataset 2</Badge>
                  {comparison?.dataset2Name || dataset2}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <SentimentChart
                  data={
                    comparison?.dataset2Sentiment || {
                      positive: 0,
                      negative: 0,
                      neutral: 0,
                    }
                  }
                  isLoading={isLoading}
                  title=""
                />
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <HashtagCloud
              data={comparison?.dataset1TopHashtags || []}
              isLoading={isLoading}
              title={`Top Hashtags - ${comparison?.dataset1Name || dataset1}`}
              limit={8}
            />
            <HashtagCloud
              data={comparison?.dataset2TopHashtags || []}
              isLoading={isLoading}
              title={`Top Hashtags - ${comparison?.dataset2Name || dataset2}`}
              limit={8}
            />
          </div>
        </>
      )}
    </div>
  );
}

function formatLargeNumber(num: number): string {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + "M";
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + "K";
  }
  return num.toLocaleString();
}
