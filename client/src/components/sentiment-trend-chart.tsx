import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import type { SentimentTrendPoint } from "@shared/schema";
import { Heart } from "lucide-react";

interface SentimentTrendChartProps {
  data: SentimentTrendPoint[];
  isLoading?: boolean;
  title?: string;
}

export function SentimentTrendChart({
  data,
  isLoading,
  title = "Sentiment Over Time",
}: SentimentTrendChartProps) {
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
  }));

  return (
    <Card data-testid="sentiment-trend-chart">
      <CardHeader className="flex flex-row items-center gap-2">
        <Heart className="h-5 w-5 text-chart-5" />
        <CardTitle className="text-lg font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="positiveGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(142, 71%, 45%)" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="hsl(142, 71%, 45%)" stopOpacity={0.1} />
                </linearGradient>
                <linearGradient id="negativeGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(0, 84%, 60%)" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="hsl(0, 84%, 60%)" stopOpacity={0.1} />
                </linearGradient>
                <linearGradient id="neutralGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(220, 9%, 46%)" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="hsl(220, 9%, 46%)" stopOpacity={0.1} />
                </linearGradient>
              </defs>
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
                width={35}
              />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    return (
                      <div className="bg-popover border border-border rounded-lg p-3 shadow-lg">
                        <p className="font-medium text-sm mb-2">{label}</p>
                        {payload.map((item: any) => (
                          <div
                            key={item.dataKey}
                            className="flex items-center gap-2 text-xs"
                          >
                            <div
                              className="w-2 h-2 rounded-full"
                              style={{ backgroundColor: item.color }}
                            />
                            <span>{item.name}: {item.value}</span>
                          </div>
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
              <Area
                type="monotone"
                dataKey="positive"
                name="Positive"
                stackId="1"
                stroke="hsl(142, 71%, 45%)"
                fill="url(#positiveGradient)"
              />
              <Area
                type="monotone"
                dataKey="neutral"
                name="Neutral"
                stackId="1"
                stroke="hsl(220, 9%, 46%)"
                fill="url(#neutralGradient)"
              />
              <Area
                type="monotone"
                dataKey="negative"
                name="Negative"
                stackId="1"
                stroke="hsl(0, 84%, 60%)"
                fill="url(#negativeGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="flex justify-center gap-6 mt-4">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-green-500" />
            <span className="text-xs text-muted-foreground">Positive</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-gray-500" />
            <span className="text-xs text-muted-foreground">Neutral</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500" />
            <span className="text-xs text-muted-foreground">Negative</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
