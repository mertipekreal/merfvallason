import { Button } from "@/components/ui/button";
import { ArrowLeft, RefreshCw, Loader2 } from "lucide-react";
import { useLocation } from "wouter";

interface PageHeaderProps {
  title: string;
  description?: string;
  showBack?: boolean;
  backPath?: string;
  onRefresh?: () => void;
  isRefreshing?: boolean;
  actions?: React.ReactNode;
}

export function PageHeader({
  title,
  description,
  showBack = false,
  backPath = "/",
  onRefresh,
  isRefreshing,
  actions,
}: PageHeaderProps) {
  const [, navigate] = useLocation();

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
      <div className="flex items-center gap-4">
        {showBack && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(backPath)}
            data-testid="button-back"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
        )}
        <div>
          <h1 className="text-2xl font-bold tracking-tight" data-testid="text-page-title">
            {title}
          </h1>
          {description && (
            <p className="text-muted-foreground text-sm mt-1">{description}</p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        {onRefresh && (
          <Button
            variant="outline"
            size="icon"
            onClick={onRefresh}
            disabled={isRefreshing}
            data-testid="button-refresh"
          >
            {isRefreshing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
          </Button>
        )}
        {actions}
      </div>
    </div>
  );
}
