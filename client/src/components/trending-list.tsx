import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import type { TrendingItem } from "@shared/schema";
import { TrendingUp, Eye, Heart, Flame } from "lucide-react";
import { cn } from "@/lib/utils";

interface TrendingListProps {
  data: TrendingItem[];
  isLoading?: boolean;
  title?: string;
  limit?: number;
}

export function TrendingList({
  data,
  isLoading,
  title = "Trending Content",
  limit = 5,
}: TrendingListProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-40" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Array.from({ length: limit }).map((_, i) => (
              <div key={i} className="p-4 rounded-lg border">
                <Skeleton className="h-4 w-3/4 mb-2" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const items = data.slice(0, limit);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-2">
        <Flame className="h-5 w-5 text-chart-4" />
        <CardTitle className="text-lg font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {items.map((item, index) => (
            <div
              key={item.id}
              className="relative p-4 rounded-lg border border-border hover-elevate transition-all duration-200"
              data-testid={`trending-item-${index}`}
            >
              <Badge
                variant="secondary"
                className="absolute top-2 right-2 font-mono text-xs"
              >
                <TrendingUp className="h-3 w-3 mr-1" />
                {item.trendScore.toFixed(1)}
              </Badge>
              <h4 className="font-medium text-sm pr-16 line-clamp-2 mb-2">
                {item.title}
              </h4>
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Eye className="h-3 w-3" />
                  {formatNumber(item.views)}
                </span>
                <span className="flex items-center gap-1">
                  <Heart className="h-3 w-3" />
                  {formatNumber(item.likes)}
                </span>
                <Badge
                  variant="outline"
                  className={cn(
                    "text-xs",
                    item.sentiment === "positive" &&
                      "border-sentiment-positive text-sentiment-positive",
                    item.sentiment === "negative" &&
                      "border-sentiment-negative text-sentiment-negative",
                    item.sentiment === "neutral" &&
                      "border-sentiment-neutral text-sentiment-neutral"
                  )}
                >
                  {item.sentiment}
                </Badge>
              </div>
            </div>
          ))}
        </div>
        {data.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-8">
            No trending content found
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function formatNumber(num: number): string {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + "M";
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + "K";
  }
  return num.toString();
}
