import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { EmojiData } from "@shared/schema";
import { Smile } from "lucide-react";

interface EmojiListProps {
  data: EmojiData[];
  isLoading?: boolean;
  title?: string;
  limit?: number;
}

export function EmojiList({
  data,
  isLoading,
  title = "Top Emojis",
  limit = 10,
}: EmojiListProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-28" />
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-5 gap-3">
            {Array.from({ length: 10 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-12" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const emojis = data.slice(0, limit);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-2">
        <Smile className="h-5 w-5 text-primary" />
        <CardTitle className="text-lg font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-5 gap-3">
          {emojis.map((emoji, index) => (
            <div
              key={`${emoji.emoji}-${index}`}
              className="flex flex-col items-center justify-center p-3 rounded-lg bg-muted/30 hover-elevate transition-all duration-200"
              data-testid={`emoji-${index}`}
            >
              <span className="text-2xl mb-1">{emoji.emoji}</span>
              <span className="text-xs text-muted-foreground font-mono">
                {emoji.count}
              </span>
            </div>
          ))}
        </div>
        {data.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-8">
            No emojis found
          </p>
        )}
      </CardContent>
    </Card>
  );
}
