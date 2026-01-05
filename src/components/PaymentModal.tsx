import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CreditCard, AlertCircle, CheckCircle2, ExternalLink } from "lucide-react";
import { fetchUserCredits, CreditUsageResponse } from "@/lib/api";
import { readCache, writeCache, CACHE_KEYS } from "@/lib/cache";

interface PaymentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPaymentComplete?: () => void;
}

export const PaymentModal = ({ open, onOpenChange, onPaymentComplete }: PaymentModalProps) => {
  const [credits, setCredits] = useState<CreditUsageResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadCredits = async () => {
    setIsLoading(true);
    setError(null);
    try {
      // Try cache first
      const cachedCredits = readCache<CreditUsageResponse>(CACHE_KEYS.CREDITS);
      if (cachedCredits) {
        setCredits(cachedCredits);
      }

      // Always fetch fresh data
      const data = await fetchUserCredits();
      setCredits(data);
      writeCache(CACHE_KEYS.CREDITS, data);
    } catch (err: any) {
      setError(err?.message || 'Failed to load credit information');
      console.error('Error fetching credits:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      loadCredits();
    }
  }, [open]);

  const hasCredits = credits && credits.credits_remaining > 0;
  const isExceeded = credits && credits.credits_remaining <= 0;
  const isNearLimit = credits && credits.usage_percentage >= 80 && credits.usage_percentage < 100;

  const handleProceed = () => {
    if (hasCredits) {
      onOpenChange(false);
      onPaymentComplete?.();
    }
  };

  const handleUpgrade = () => {
    // Simulate payment flow - in production, this would create a Stripe checkout session
    // For now, we'll simulate success/failure based on a parameter
    // You can replace this with actual Stripe checkout integration
    
    // Simulate payment: randomly show success or failure for demo purposes
    // In production, replace this with actual Stripe checkout redirect
    const simulatePayment = () => {
      // For demo: randomly choose success or failure
      // In production, this would be handled by Stripe webhooks
      const shouldSucceed = Math.random() > 0.5;
      
      if (shouldSucceed) {
        // Simulate successful payment
        window.location.href = '/payment/success?session_id=test_session_' + Date.now();
      } else {
        // Simulate failed payment
        window.location.href = '/payment/failure?session_id=test_session_' + Date.now() + '&error=Payment%20was%20cancelled';
      }
    };

    // Close modal first
    onOpenChange(false);
    
    // Simulate payment flow
    // In production, you would:
    // 1. Create a Stripe checkout session via API
    // 2. Redirect to Stripe checkout
    // 3. Stripe redirects back to /payment/success or /payment/failure
    simulatePayment();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <CreditCard className="w-5 h-5" />
            <span>Payment Required</span>
          </DialogTitle>
          <DialogDescription>
            {isExceeded
              ? "You've reached your credit limit. Please upgrade your plan to continue using the service."
              : "Please verify your payment status before starting a conversation."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="flex space-x-2">
                <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
                <div className="w-2 h-2 bg-primary rounded-full animate-pulse" style={{ animationDelay: '0.2s' }} />
                <div className="w-2 h-2 bg-primary rounded-full animate-pulse" style={{ animationDelay: '0.4s' }} />
              </div>
            </div>
          ) : error ? (
            <Card className="p-4 border-destructive">
              <div className="flex items-center space-x-2 text-destructive">
                <AlertCircle className="w-4 h-4" />
                <span className="text-sm">{error}</span>
              </div>
            </Card>
          ) : credits ? (
            <>
              <Card className="p-4 border-2">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Credit Status</span>
                    {hasCredits ? (
                      <Badge variant="default" className="bg-green-500">
                        <CheckCircle2 className="w-3 h-3 mr-1" />
                        Active
                      </Badge>
                    ) : (
                      <Badge variant="destructive">
                        <AlertCircle className="w-3 h-3 mr-1" />
                        Exceeded
                      </Badge>
                    )}
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Credits Used</span>
                      <span className="font-medium">
                        {credits.credits_used.toFixed(1)} / {credits.plan_limit}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Credits Remaining</span>
                      <span className={`font-medium ${hasCredits ? 'text-green-600' : 'text-destructive'}`}>
                        {credits.credits_remaining.toFixed(1)}
                      </span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2 mt-2">
                      <div
                        className={`h-2 rounded-full transition-all ${
                          isExceeded
                            ? 'bg-destructive'
                            : isNearLimit
                            ? 'bg-yellow-500'
                            : 'bg-green-500'
                        }`}
                        style={{
                          width: `${Math.min(credits.usage_percentage, 100)}%`,
                        }}
                      />
                    </div>
                    <div className="text-xs text-muted-foreground text-center">
                      {credits.usage_percentage.toFixed(1)}% of monthly limit used
                    </div>
                  </div>

                  {isNearLimit && !isExceeded && (
                    <Card className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800">
                      <div className="flex items-start space-x-2">
                        <AlertCircle className="w-4 h-4 text-yellow-600 dark:text-yellow-400 mt-0.5" />
                        <p className="text-xs text-yellow-800 dark:text-yellow-200">
                          You're approaching your credit limit. Consider upgrading your plan.
                        </p>
                      </div>
                    </Card>
                  )}
                </div>
              </Card>

              {isExceeded && (
                <Card className="p-4 bg-destructive/10 border-destructive/20">
                  <div className="flex items-start space-x-2">
                    <AlertCircle className="w-5 h-5 text-destructive mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-destructive mb-1">
                        Credit Limit Exceeded
                      </p>
                      <p className="text-xs text-muted-foreground">
                        You've used all your monthly credits. Please upgrade your plan to continue creating campaigns and conversations.
                      </p>
                    </div>
                  </div>
                </Card>
              )}
            </>
          ) : null}
        </div>

        <DialogFooter className="gap-2">
          {hasCredits ? (
            <>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button onClick={handleProceed}>
                Continue with Conversation
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button onClick={handleUpgrade} className="gap-2">
                <ExternalLink className="w-4 h-4" />
                Upgrade Plan
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

