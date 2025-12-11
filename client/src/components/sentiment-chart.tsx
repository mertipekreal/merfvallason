import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import type { SentimentBreakdown } from "@shared/schema";

interface SentimentChartProps {
  data: SentimentBreakdown;
  isLoading?: boolean;
  title?: string;
}

const COLORS = {
  positive: "hsl(142, 71%, 45%)",
  negative: "hsl(0, 84%, 60%)",
  neutral: "hsl(220, 9%, 46%)",
};

const DARK_COLORS = {
  positive: "hsl(142, 71%, 50%)",
  negative: "hsl(0, 84%, 60%)",
  neutral: "hsl(215, 20%, 55%)",
};

export function SentimentChart({
  data,
  isLoading,
  title = "Sentiment Analysis",
}: SentimentChartProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-40" />
        </CardHeader>
        <CardContent className="flex items-center justify-center h-64">
          <Skeleton className="h-48 w-48 rounded-full" />
        </CardContent>
      </Card>
    );
  }

  const total = data.positive + data.negative + data.neutral;
  const chartData = [
    {
      name: "Positive",
      value: data.positive,
      percentage: total > 0 ? ((data.positive / total) * 100).toFixed(1) : "0",
      color: COLORS.positive,
    },
    {
      name: "Negative",
      value: data.negative,
      percentage: total > 0 ? ((data.negative / total) * 100).toFixed(1) : "0",
      color: COLORS.negative,
    },
    {
      name: "Neutral",
      value: data.neutral,
      percentage: total > 0 ? ((data.neutral / total) * 100).toFixed(1) : "0",
      color: COLORS.neutral,
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={90}
                paddingAngle={2}
                dataKey="value"
              >
                {chartData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.color}
                    className="transition-all duration-200 hover:opacity-80"
                  />
                ))}
              </Pie>
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="bg-popover border border-border rounded-lg p-3 shadow-lg">
                        <p className="font-medium text-sm">{data.name}</p>
                        <p className="text-muted-foreground text-xs">
                          {data.value} ({data.percentage}%)
                        </p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Legend
                formatter={(value, entry) => {
                  const data = chartData.find((d) => d.name === value);
                  return (
                    <span className="text-sm text-foreground">
                      {value}: {data?.percentage}%
                    </span>
                  );
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="grid grid-cols-3 gap-4 mt-4">
          {chartData.map((item) => (
            <div
              key={item.name}
              className="text-center p-3 rounded-lg bg-muted/50"
              data-testid={`sentiment-${item.name.toLowerCase()}`}
            >
              <div
                className="w-3 h-3 rounded-full mx-auto mb-2"
                style={{ backgroundColor: item.color }}
              />
              <p className="text-xs text-muted-foreground">{item.name}</p>
              <p className="font-semibold font-mono">{item.value}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
