import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, ArrowLeft, Sparkles } from "lucide-react";

const PaymentSuccess = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get('session_id');

  useEffect(() => {
    // You can verify the payment here with the session_id if needed
    if (sessionId) {
      console.log('Payment successful for session:', sessionId);
    }
  }, [sessionId]);

  const handleGoToChat = () => {
    navigate('/');
  };

  const handleGoToSettings = () => {
    navigate('/settings?tab=billing');
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="max-w-md w-full p-8 text-center space-y-6">
        <div className="flex justify-center">
          <div className="w-20 h-20 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center">
            <CheckCircle2 className="w-10 h-10 text-green-600 dark:text-green-400" />
          </div>
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-bold">Payment Successful!</h1>
          <p className="text-muted-foreground">
            Your payment has been processed successfully. Your credits have been updated and you can now start creating conversations.
          </p>
        </div>

        {sessionId && (
          <div className="p-3 bg-muted rounded-lg">
            <p className="text-xs text-muted-foreground">
              Session ID: <span className="font-mono">{sessionId}</span>
            </p>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3 pt-4">
          <Button onClick={handleGoToChat} className="flex-1 gap-2">
            <Sparkles className="w-4 h-4" />
            Start Conversation
          </Button>
          <Button variant="outline" onClick={handleGoToSettings} className="flex-1 gap-2">
            <ArrowLeft className="w-4 h-4" />
            View Billing
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default PaymentSuccess;
