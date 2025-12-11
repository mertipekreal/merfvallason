import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { CategoryData } from "@shared/schema";

interface CategoryChartProps {
  data: CategoryData[];
  isLoading?: boolean;
  title?: string;
  limit?: number;
}

export function CategoryChart({
  data,
  isLoading,
  title = "Content Categories",
  limit = 6,
}: CategoryChartProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-40" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Array.from({ length: limit }).map((_, i) => (
              <div key={i} className="flex items-center gap-4">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-8 flex-1" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const chartData = data.slice(0, limit).map((item) => ({
    name:
      item.category.length > 12
        ? item.category.slice(0, 12) + "..."
        : item.category,
    fullName: item.category,
    count: item.count,
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              layout="vertical"
              margin={{ top: 5, right: 30, left: 60, bottom: 5 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                horizontal={true}
                vertical={false}
                className="stroke-border"
              />
              <XAxis type="number" className="text-xs fill-muted-foreground" />
              <YAxis
                type="category"
                dataKey="name"
                className="text-xs fill-muted-foreground"
                width={60}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="bg-popover border border-border rounded-lg p-3 shadow-lg">
                        <p className="font-medium text-sm">{data.fullName}</p>
                        <p className="text-muted-foreground text-xs">
                          Count: {data.count.toLocaleString()}
                        </p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Bar
                dataKey="count"
                fill="hsl(252, 87%, 60%)"
                radius={[0, 4, 4, 0]}
                className="transition-all duration-200"
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
