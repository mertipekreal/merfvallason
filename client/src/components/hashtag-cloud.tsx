import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import type { HashtagData } from "@shared/schema";
import { Hash } from "lucide-react";

interface HashtagCloudProps {
  data: HashtagData[];
  isLoading?: boolean;
  title?: string;
  limit?: number;
}

export function HashtagCloud({
  data,
  isLoading,
  title = "Top Hashtags",
  limit = 15,
}: HashtagCloudProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {Array.from({ length: 12 }).map((_, i) => (
              <Skeleton
                key={i}
                className="h-6 w-20"
                style={{ width: `${Math.random() * 40 + 60}px` }}
              />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const hashtags = data.slice(0, limit);
  const maxCount = Math.max(...hashtags.map((h) => h.count), 1);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-2">
        <Hash className="h-5 w-5 text-primary" />
        <CardTitle className="text-lg font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-2">
          {hashtags.map((hashtag, index) => {
            const intensity = hashtag.count / maxCount;
            const size = intensity > 0.7 ? "default" : "sm";

            return (
              <Badge
                key={`${hashtag.hashtag}-${index}`}
                variant="secondary"
                className="font-mono text-xs cursor-default"
                data-testid={`hashtag-${hashtag.hashtag.replace("#", "")}`}
              >
                {hashtag.hashtag}
                <span className="ml-1.5 text-muted-foreground">
                  {hashtag.count.toLocaleString()}
                </span>
              </Badge>
            );
          })}
        </div>
        {data.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-8">
            No hashtags found
          </p>
        )}
      </CardContent>
    </Card>
  );
}
