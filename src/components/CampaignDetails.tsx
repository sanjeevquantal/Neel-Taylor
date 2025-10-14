import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";
import apiClient from "@/lib/api";

interface CampaignDetailsProps {
  campaignId: number;
  onClose: () => void;
}

type CampaignResponse = {
  id?: number;
  conversation_id?: number;
  status?: string;
  created_at?: string;
  tone?: string;
  [key: string]: any;
};

export const CampaignDetails = ({ campaignId, onClose }: CampaignDetailsProps) => {
  const [data, setData] = useState<CampaignResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      setError(null);
      try {
        const resp = await apiClient.get<CampaignResponse>(`/campaigns/${campaignId}`);
        setData(resp);
      } catch (err: any) {
        setError(err?.message || "Failed to load campaign");
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [campaignId]);

  return (
    <div className="fixed top-0 right-0 h-screen w-full max-w-md z-[60] p-4 md:p-6">
      <Card className="h-full bg-gradient-card shadow-soft border-l">
        <div className="flex items-center justify-between p-4 border-b border-border/50">
          <div>
            <h3 className="text-lg font-semibold">Campaign Details</h3>
            <p className="text-xs text-muted-foreground">ID #{campaignId}</p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close details">
            <X className="w-4 h-4" />
          </Button>
        </div>

        <div className="p-4 space-y-4 overflow-auto h-[calc(100%-4rem)]">
          {loading && <div className="text-sm text-muted-foreground">Loading…</div>}
          {error && <div className="text-sm text-destructive">{error}</div>}

          {!loading && !error && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="text-xs text-muted-foreground">Campaign ID</div>
                  <div className="text-sm font-medium">{data?.id ?? campaignId}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Conversation ID</div>
                  <div className="text-sm font-medium">{data?.conversation_id ?? '-'}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Status</div>
                  <div className="text-sm font-medium">
                    {data?.status ? <Badge variant="outline">{String(data.status)}</Badge> : '-'}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Tone</div>
                  <div className="text-sm font-medium">{data?.tone ?? '-'}</div>
                </div>
              </div>

              <Separator />

              <div>
                <div className="text-xs text-muted-foreground mb-1">Created At</div>
                <div className="text-sm font-medium">{data?.created_at ? new Date(data.created_at).toLocaleString() : '-'}</div>
              </div>

              {/* Raw JSON for debugging/visibility if backend expands */}
              <div>
                <div className="text-xs text-muted-foreground mb-1">Raw</div>
                <pre className="text-xs p-3 rounded bg-muted/40 overflow-auto max-h-64">
{JSON.stringify(data, null, 2)}
                </pre>
              </div>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};

export default CampaignDetails;


