import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { HeatmapCell } from "@shared/schema";
import { Calendar } from "lucide-react";

interface ActivityHeatmapProps {
  data: HeatmapCell[];
  isLoading?: boolean;
  title?: string;
}

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const HOURS = Array.from({ length: 24 }, (_, i) => i);

export function ActivityHeatmap({
  data,
  isLoading,
  title = "Activity Heatmap",
}: ActivityHeatmapProps) {
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

  const maxValue = Math.max(...data.map((d) => d.value), 1);

  const getCell = (day: number, hour: number) => {
    return data.find((d) => d.day === day && d.hour === hour);
  };

  const getIntensityColor = (value: number) => {
    const intensity = value / maxValue;
    if (intensity === 0) return "bg-muted/30";
    if (intensity < 0.25) return "bg-chart-1/20";
    if (intensity < 0.5) return "bg-chart-1/40";
    if (intensity < 0.75) return "bg-chart-1/60";
    return "bg-chart-1/90";
  };

  return (
    <Card data-testid="activity-heatmap">
      <CardHeader className="flex flex-row items-center gap-2">
        <Calendar className="h-5 w-5 text-chart-2" />
        <CardTitle className="text-lg font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <div className="min-w-[600px]">
            <div className="flex mb-1">
              <div className="w-10" />
              {HOURS.filter((_, i) => i % 3 === 0).map((hour) => (
                <div
                  key={hour}
                  className="flex-1 text-xs text-muted-foreground text-center"
                  style={{ minWidth: "12px" }}
                >
                  {hour.toString().padStart(2, "0")}
                </div>
              ))}
            </div>

            {DAYS.map((dayName, dayIndex) => (
              <div key={dayName} className="flex items-center gap-1 mb-1">
                <div className="w-10 text-xs text-muted-foreground">{dayName}</div>
                <div className="flex gap-[2px] flex-1">
                  {HOURS.map((hour) => {
                    const cell = getCell(dayIndex, hour);
                    const value = cell?.value || 0;
                    return (
                      <Tooltip key={`${dayIndex}-${hour}`}>
                        <TooltipTrigger asChild>
                          <div
                            className={`h-4 flex-1 rounded-sm transition-all cursor-pointer hover:ring-1 hover:ring-primary ${getIntensityColor(value)}`}
                            data-testid={`heatmap-cell-${dayIndex}-${hour}`}
                          />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="font-medium">{dayName} {hour}:00</p>
                          <p className="text-xs text-muted-foreground">
                            Activity: {value}
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    );
                  })}
                </div>
              </div>
            ))}

            <div className="flex items-center justify-end gap-2 mt-4">
              <span className="text-xs text-muted-foreground">Less</span>
              <div className="flex gap-1">
                <div className="w-3 h-3 rounded-sm bg-muted/30" />
                <div className="w-3 h-3 rounded-sm bg-chart-1/20" />
                <div className="w-3 h-3 rounded-sm bg-chart-1/40" />
                <div className="w-3 h-3 rounded-sm bg-chart-1/60" />
                <div className="w-3 h-3 rounded-sm bg-chart-1/90" />
              </div>
              <span className="text-xs text-muted-foreground">More</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
