import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, Home } from "lucide-react";
import { Link } from "wouter";

export default function NotFound() {
  return (
    <div className="min-h-[80vh] w-full flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardContent className="pt-6 text-center">
          <div className="flex flex-col items-center mb-6">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10 mb-4">
              <AlertCircle className="h-8 w-8 text-destructive" />
            </div>
            <h1 className="text-2xl font-bold" data-testid="text-404-title">
              Page Not Found
            </h1>
          </div>

          <p className="text-muted-foreground mb-6">
            The page you're looking for doesn't exist or has been moved.
          </p>

          <Link href="/">
            <Button data-testid="button-go-home">
              <Home className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
