import { useQuery } from "@tanstack/react-query";
import { MetricCard } from "@/components/metric-card";
import { SentimentChart } from "@/components/sentiment-chart";
import { PageHeader } from "@/components/page-header";
import { ExportButtons } from "@/components/export-buttons";
import { ErrorAlert } from "@/components/error-alert";
import { EmptyState } from "@/components/empty-state";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import {
  Phone,
  Clock,
  MessageSquare,
  Activity,
  Users,
  Brain,
  Smile,
  Frown,
  Meh,
} from "lucide-react";
import type { AnalyticsData } from "@shared/schema";
import { cn } from "@/lib/utils";

export default function PhoneConversationsPage() {
  const {
    data: analytics,
    isLoading,
    error,
    refetch,
  } = useQuery<AnalyticsData>({
    queryKey: ["/api/analytics/phone_conversations"],
  });

  if (error) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <PageHeader
          title="Phone Conversations"
          description="Analyze emotional patterns in phone conversations"
          showBack
        />
        <ErrorAlert
          message="Failed to load conversation data. Please try again."
          onRetry={() => refetch()}
        />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto animate-fade-in">
      <PageHeader
        title="Phone Conversations"
        description="Emotional analysis of telecommunications data"
        showBack
        onRefresh={() => refetch()}
        isRefreshing={isLoading}
        actions={
          <ExportButtons
            datasetName="phone_conversations"
            disabled={!analytics}
          />
        }
      />

      {!isLoading && !analytics && (
        <EmptyState
          icon={Phone}
          title="No conversation data"
          description="Upload phone conversation data to analyze emotional patterns and insights."
        />
      )}

      {(isLoading || analytics) && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <MetricCard
              title="Total Conversations"
              value={analytics?.totalRecords || 0}
              icon={Phone}
              isLoading={isLoading}
              iconClassName="bg-primary/10 text-primary"
            />
            <MetricCard
              title="Participants"
              value={analytics?.topCreators?.length || 0}
              icon={Users}
              isLoading={isLoading}
              iconClassName="bg-chart-2/10 text-chart-2"
            />
            <MetricCard
              title="Keywords Detected"
              value={analytics?.topHashtags?.length || 0}
              icon={MessageSquare}
              isLoading={isLoading}
              iconClassName="bg-chart-3/10 text-chart-3"
            />
            <MetricCard
              title="Avg Emotion Score"
              value={
                analytics?.avgEngagementRate
                  ? `${analytics.avgEngagementRate.toFixed(1)}%`
                  : "N/A"
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
              title="Conversation Sentiment"
            />

            <Card>
              <CardHeader className="flex flex-row items-center gap-2">
                <Brain className="h-5 w-5 text-primary" />
                <CardTitle className="text-lg font-medium">
                  Emotional Insights
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {isLoading ? (
                  <div className="space-y-4">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <div key={i} className="space-y-2">
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-2 w-full" />
                      </div>
                    ))}
                  </div>
                ) : (
                  <>
                    <EmotionBar
                      label="Positive"
                      value={analytics?.sentimentBreakdown?.positive || 0}
                      total={
                        (analytics?.sentimentBreakdown?.positive || 0) +
                        (analytics?.sentimentBreakdown?.negative || 0) +
                        (analytics?.sentimentBreakdown?.neutral || 0)
                      }
                      icon={Smile}
                      color="sentiment-positive"
                    />
                    <EmotionBar
                      label="Negative"
                      value={analytics?.sentimentBreakdown?.negative || 0}
                      total={
                        (analytics?.sentimentBreakdown?.positive || 0) +
                        (analytics?.sentimentBreakdown?.negative || 0) +
                        (analytics?.sentimentBreakdown?.neutral || 0)
                      }
                      icon={Frown}
                      color="sentiment-negative"
                    />
                    <EmotionBar
                      label="Neutral"
                      value={analytics?.sentimentBreakdown?.neutral || 0}
                      total={
                        (analytics?.sentimentBreakdown?.positive || 0) +
                        (analytics?.sentimentBreakdown?.negative || 0) +
                        (analytics?.sentimentBreakdown?.neutral || 0)
                      }
                      icon={Meh}
                      color="sentiment-neutral"
                    />
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg font-medium">
                  Key Topics Discussed
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="flex flex-wrap gap-2">
                    {Array.from({ length: 8 }).map((_, i) => (
                      <Skeleton key={i} className="h-6 w-20" />
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {analytics?.topHashtags?.slice(0, 12).map((tag, i) => (
                      <Badge
                        key={`${tag.hashtag}-${i}`}
                        variant="secondary"
                        className="text-xs"
                      >
                        {tag.hashtag}
                        <span className="ml-1 text-muted-foreground">
                          ({tag.count})
                        </span>
                      </Badge>
                    ))}
                    {(!analytics?.topHashtags ||
                      analytics.topHashtags.length === 0) && (
                      <p className="text-sm text-muted-foreground">
                        No topics detected
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg font-medium">
                  Active Participants
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="space-y-3">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Skeleton key={i} className="h-10 w-full" />
                    ))}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {analytics?.topCreators?.slice(0, 6).map((creator, i) => (
                      <div
                        key={`${creator.username}-${i}`}
                        className="flex items-center justify-between p-3 rounded-lg bg-muted/30"
                      >
                        <span className="font-medium text-sm">
                          {creator.username}
                        </span>
                        <Badge variant="outline" className="font-mono text-xs">
                          {creator.videoCount} calls
                        </Badge>
                      </div>
                    ))}
                    {(!analytics?.topCreators ||
                      analytics.topCreators.length === 0) && (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        No participants found
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}

interface EmotionBarProps {
  label: string;
  value: number;
  total: number;
  icon: React.ElementType;
  color: string;
}

function EmotionBar({ label, value, total, icon: Icon, color }: EmotionBarProps) {
  const percentage = total > 0 ? (value / total) * 100 : 0;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon className={cn("h-4 w-4", `text-${color}`)} />
          <span className="text-sm font-medium">{label}</span>
        </div>
        <span className="text-sm text-muted-foreground font-mono">
          {value} ({percentage.toFixed(1)}%)
        </span>
      </div>
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div
          className={cn("h-full rounded-full transition-all duration-500", {
            "bg-sentiment-positive": color === "sentiment-positive",
            "bg-sentiment-negative": color === "sentiment-negative",
            "bg-sentiment-neutral": color === "sentiment-neutral",
          })}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
