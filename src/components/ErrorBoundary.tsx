import { useRouteError, isRouteErrorResponse } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Home } from "lucide-react";

export const ErrorBoundary = () => {
  const error = useRouteError();

  let errorMessage = "An unexpected error occurred";
  let errorStatus = 500;
  let friendlyMessage: string | null = null;

  if (isRouteErrorResponse(error)) {
    // Prefer clean string data; avoid dumping raw JSON structures
    const data = typeof error.data === 'string' ? error.data : '';
    errorMessage = data || error.statusText || `Error ${error.status}`;
    errorStatus = error.status;
  } else if (error instanceof Error) {
    errorMessage = error.message;
  }

  // Map common statuses to user friendly messages
  if (errorStatus === 404) {
    // If backend provided specific resource not found text, use it; otherwise generic
    friendlyMessage = errorMessage && /not found/i.test(errorMessage)
      ? errorMessage
      : 'We couldn\'t find what you\'re looking for.';
  } else if (errorStatus === 401) {
    friendlyMessage = 'Your session expired. Please sign in again.';
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="max-w-md w-full p-6 text-center">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center">
            <AlertTriangle className="w-8 h-8 text-destructive" />
          </div>
          
          <div>
            <h1 className="text-2xl font-bold text-foreground mb-2">
              {errorStatus === 404 ? "Not found" : "Error"}
            </h1>
            <p className="text-muted-foreground mb-4">
              {friendlyMessage || errorMessage}
            </p>
          </div>

          <div className="flex space-x-2">
            <Button 
              variant="outline" 
              onClick={() => window.history.back()}
            >
              Go Back
            </Button>
            <Button 
              onClick={() => window.location.href = '/'}
            >
              <Home className="w-4 h-4 mr-2" />
              Go Home
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
};
