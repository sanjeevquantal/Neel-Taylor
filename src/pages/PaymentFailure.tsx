import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { XCircle, ArrowLeft, RefreshCw } from "lucide-react";

const PaymentFailure = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get('session_id');
  const error = searchParams.get('error');

  useEffect(() => {
    // Log payment failure for debugging
    if (sessionId) {
      console.error('Payment failed for session:', sessionId);
    }
    if (error) {
      console.error('Payment error:', error);
    }
  }, [sessionId, error]);

  const handleTryAgain = () => {
    navigate('/settings?tab=billing');
  };

  const handleGoBack = () => {
    navigate(-1);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="max-w-md w-full p-8 text-center space-y-6">
        <div className="flex justify-center">
          <div className="w-20 h-20 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center">
            <XCircle className="w-10 h-10 text-red-600 dark:text-red-400" />
          </div>
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-bold">Payment Failed</h1>
          <p className="text-muted-foreground">
            We couldn't process your payment. This could be due to insufficient funds, card issues, or a network error.
          </p>
          {error && (
            <p className="text-sm text-destructive mt-2">
              Error: {error}
            </p>
          )}
        </div>

        {sessionId && (
          <div className="p-3 bg-muted rounded-lg">
            <p className="text-xs text-muted-foreground">
              Session ID: <span className="font-mono">{sessionId}</span>
            </p>
          </div>
        )}

        <div className="space-y-3 pt-4">
          <p className="text-sm text-muted-foreground">
            Please check your payment method and try again, or contact support if the problem persists.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 pt-4">
          <Button onClick={handleTryAgain} className="flex-1 gap-2">
            <RefreshCw className="w-4 h-4" />
            Try Again
          </Button>
          <Button variant="outline" onClick={handleGoBack} className="flex-1 gap-2">
            <ArrowLeft className="w-4 h-4" />
            Go Back
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default PaymentFailure;
