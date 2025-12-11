import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import type { CreatorData } from "@shared/schema";
import { Users, Eye, Video } from "lucide-react";

interface CreatorListProps {
  data: CreatorData[];
  isLoading?: boolean;
  title?: string;
  limit?: number;
}

export function CreatorList({
  data,
  isLoading,
  title = "Top Creators",
  limit = 10,
}: CreatorListProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-3 w-32" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const creators = data.slice(0, limit);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-2">
        <Users className="h-5 w-5 text-primary" />
        <CardTitle className="text-lg font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {creators.map((creator, index) => (
            <div
              key={`${creator.username}-${index}`}
              className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 hover-elevate transition-all duration-200"
              data-testid={`creator-${creator.username}`}
            >
              <div className="relative">
                <Avatar className="h-10 w-10">
                  <AvatarFallback className="bg-primary/10 text-primary font-medium">
                    {getInitials(creator.username)}
                  </AvatarFallback>
                </Avatar>
                {index < 3 && (
                  <Badge
                    variant="default"
                    className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-[10px]"
                  >
                    {index + 1}
                  </Badge>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">
                  @{creator.username}
                </p>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Video className="h-3 w-3" />
                    {creator.videoCount}
                  </span>
                  <span className="flex items-center gap-1">
                    <Eye className="h-3 w-3" />
                    {formatNumber(creator.totalViews)}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
        {data.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-8">
            No creators found
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function getInitials(username: string): string {
  return username.slice(0, 2).toUpperCase();
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
