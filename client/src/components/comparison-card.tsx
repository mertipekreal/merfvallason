import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import type { ComparisonMetric } from "@shared/schema";

interface ComparisonCardProps {
  title: string;
  metric: ComparisonMetric;
  dataset1Name: string;
  dataset2Name: string;
  isLoading?: boolean;
  formatValue?: (value: number) => string;
}

export function ComparisonCard({
  title,
  metric,
  dataset1Name,
  dataset2Name,
  isLoading,
  formatValue = (v) => v.toLocaleString(),
}: ComparisonCardProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-32" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-8 w-full" />
        </CardContent>
      </Card>
    );
  }

  const isPositive = metric.percentageChange > 0;
  const isNeutral = metric.percentageChange === 0;

  return (
    <Card className="hover-elevate transition-all duration-200">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-medium text-muted-foreground">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground truncate">
              {dataset1Name}
            </p>
            <p className="text-2xl font-bold font-mono">
              {formatValue(metric.dataset1Value)}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground truncate">
              {dataset2Name}
            </p>
            <p className="text-2xl font-bold font-mono">
              {formatValue(metric.dataset2Value)}
            </p>
          </div>
        </div>
        <div
          className={cn(
            "flex items-center justify-between p-3 rounded-lg",
            isPositive && "bg-sentiment-positive/10",
            !isPositive && !isNeutral && "bg-sentiment-negative/10",
            isNeutral && "bg-muted"
          )}
        >
          <div className="flex items-center gap-2">
            {isPositive ? (
              <TrendingUp className="h-4 w-4 text-sentiment-positive" />
            ) : isNeutral ? (
              <Minus className="h-4 w-4 text-muted-foreground" />
            ) : (
              <TrendingDown className="h-4 w-4 text-sentiment-negative" />
            )}
            <span className="text-sm font-medium">
              {isPositive ? "+" : ""}
              {formatValue(metric.difference)}
            </span>
          </div>
          <span
            className={cn(
              "text-sm font-semibold",
              isPositive && "text-sentiment-positive",
              !isPositive && !isNeutral && "text-sentiment-negative",
              isNeutral && "text-muted-foreground"
            )}
          >
            {isPositive ? "+" : ""}
            {metric.percentageChange.toFixed(1)}%
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
