import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import type { EngagementTrendPoint } from "@shared/schema";
import { TrendingUp } from "lucide-react";

interface EngagementTrendChartProps {
  data: EngagementTrendPoint[];
  isLoading?: boolean;
  title?: string;
}

export function EngagementTrendChart({
  data,
  isLoading,
  title = "Engagement Trends",
}: EngagementTrendChartProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-40" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    );
  }

  const chartData = data.map((point) => ({
    ...point,
    date: formatDate(point.date),
    viewsK: Math.round(point.views / 1000),
    likesK: Math.round(point.likes / 1000),
  }));

  return (
    <Card data-testid="engagement-trend-chart">
      <CardHeader className="flex flex-row items-center gap-2">
        <TrendingUp className="h-5 w-5 text-chart-1" />
        <CardTitle className="text-lg font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                className="stroke-border"
              />
              <XAxis
                dataKey="date"
                className="text-xs fill-muted-foreground"
                tick={{ fontSize: 10 }}
              />
              <YAxis
                className="text-xs fill-muted-foreground"
                width={45}
                tickFormatter={(value) => formatNumber(value)}
              />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    return (
                      <div className="bg-popover border border-border rounded-lg p-3 shadow-lg">
                        <p className="font-medium text-sm mb-2">{label}</p>
                        {payload.map((item: any) => (
                          <p
                            key={item.dataKey}
                            className="text-xs"
                            style={{ color: item.color }}
                          >
                            {item.name}: {formatNumber(item.value)}
                          </p>
                        ))}
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Legend
                formatter={(value) => (
                  <span className="text-xs text-foreground">{value}</span>
                )}
              />
              <Line
                type="monotone"
                dataKey="views"
                name="Views"
                stroke="hsl(var(--chart-1))"
                strokeWidth={2}
                dot={{ r: 3 }}
                activeDot={{ r: 5 }}
              />
              <Line
                type="monotone"
                dataKey="likes"
                name="Likes"
                stroke="hsl(var(--chart-5))"
                strokeWidth={2}
                dot={{ r: 3 }}
                activeDot={{ r: 5 }}
              />
              <Line
                type="monotone"
                dataKey="comments"
                name="Comments"
                stroke="hsl(var(--chart-2))"
                strokeWidth={2}
                dot={{ r: 3 }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatNumber(num: number): string {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toString();
}
