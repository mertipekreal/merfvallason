import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { LucideIcon, TrendingUp, TrendingDown } from "lucide-react";

interface MetricCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  description?: string;
  isLoading?: boolean;
  className?: string;
  iconClassName?: string;
}

export function MetricCard({
  title,
  value,
  icon: Icon,
  trend,
  description,
  isLoading,
  className,
  iconClassName,
}: MetricCardProps) {
  if (isLoading) {
    return (
      <Card className={cn("", className)}>
        <CardContent className="p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-2 flex-1">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-8 w-32" />
              <Skeleton className="h-3 w-20" />
            </div>
            <Skeleton className="h-10 w-10 rounded-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("hover-elevate transition-all duration-200", className)}>
      <CardContent className="p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2 flex-1 min-w-0">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-3xl font-bold tracking-tight font-mono truncate" data-testid={`metric-${title.toLowerCase().replace(/\s+/g, "-")}`}>
              {typeof value === "number" ? formatNumber(value) : value}
            </p>
            {trend && (
              <div className="flex items-center gap-1">
                {trend.isPositive ? (
                  <TrendingUp className="h-3 w-3 text-sentiment-positive" />
                ) : (
                  <TrendingDown className="h-3 w-3 text-sentiment-negative" />
                )}
                <span
                  className={cn(
                    "text-xs font-medium",
                    trend.isPositive
                      ? "text-sentiment-positive"
                      : "text-sentiment-negative"
                  )}
                >
                  {trend.isPositive ? "+" : ""}
                  {trend.value.toFixed(1)}%
                </span>
                {description && (
                  <span className="text-xs text-muted-foreground">
                    {description}
                  </span>
                )}
              </div>
            )}
            {!trend && description && (
              <p className="text-xs text-muted-foreground">{description}</p>
            )}
          </div>
          <div
            className={cn(
              "flex h-10 w-10 shrink-0 items-center justify-center rounded-full",
              iconClassName || "bg-primary/10"
            )}
          >
            <Icon className={cn("h-5 w-5", iconClassName ? "text-current" : "text-primary")} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function formatNumber(num: number): string {
  if (num >= 1000000000) {
    return (num / 1000000000).toFixed(1) + "B";
  }
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + "M";
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + "K";
  }
  return num.toLocaleString();
}
