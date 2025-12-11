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
import type { HourData } from "@shared/schema";
import { Clock } from "lucide-react";

interface ActiveHoursChartProps {
  data: HourData[];
  isLoading?: boolean;
  title?: string;
}

export function ActiveHoursChart({
  data,
  isLoading,
  title = "Most Active Hours",
}: ActiveHoursChartProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-40" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-48 w-full" />
        </CardContent>
      </Card>
    );
  }

  const chartData = data.map((item) => ({
    hour: `${item.hour.toString().padStart(2, "0")}:00`,
    count: item.count,
    label: formatHour(item.hour),
  }));

  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-2">
        <Clock className="h-5 w-5 text-primary" />
        <CardTitle className="text-lg font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                className="stroke-border"
              />
              <XAxis
                dataKey="label"
                className="text-xs fill-muted-foreground"
                tick={{ fontSize: 10 }}
                interval={3}
              />
              <YAxis
                className="text-xs fill-muted-foreground"
                width={40}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="bg-popover border border-border rounded-lg p-3 shadow-lg">
                        <p className="font-medium text-sm">{data.hour}</p>
                        <p className="text-muted-foreground text-xs">
                          Activity: {data.count.toLocaleString()}
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
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

function formatHour(hour: number): string {
  if (hour === 0) return "12AM";
  if (hour === 12) return "12PM";
  if (hour < 12) return `${hour}AM`;
  return `${hour - 12}PM`;
}
