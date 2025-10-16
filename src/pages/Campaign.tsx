import { useState } from "react";
import { useParams, useNavigate, useLoaderData } from "react-router-dom";
import { Sidebar } from "@/components/Sidebar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { CampaignLoaderData } from "@/lib/loaders";

type CampaignResponse = {
  id?: number;
  conversation_id?: number;
  status?: string;
  created_at?: string;
  tone?: string;
  leads?: Array<{ id?: number; email?: string; name?: string }>;
  email_sequence?: {
    sequence_id?: number;
    campaign_id?: number;
    steps?: Array<{
      sequence_step_id?: number;
      step_number?: number;
      subject_line?: string;
      body_template?: string;
      created_at?: string;
    }>;
  };
};

const CampaignPage = () => {
  const params = useParams();
  const navigate = useNavigate();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  
  // Get data from loader
  const data = useLoaderData() as CampaignLoaderData;
  const campaignId = Number(params.id);

  return (
    <div className="min-h-screen bg-background">
      <Sidebar 
        activeTab="campaigns" 
        onTabChange={(tab) => {
          // Navigation is handled by the sidebar itself now
        }}
        onLogout={() => {
          // simple redirect on logout; App guards routes
          navigate('/');
        }}
        onCollapsedChange={setIsSidebarCollapsed}
      />
      <main className={`${isSidebarCollapsed ? 'ml-16' : 'ml-64'} transition-all duration-300 overflow-auto min-h-screen p-6`}>
        <div className="max-w-4xl">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-3xl font-bold">Campaign Details</h2>
              <p className="text-muted-foreground mt-1">ID #{campaignId}</p>
            </div>
            <div className="space-x-2">
              <Button variant="outline" onClick={() => navigate(-1)}>Back</Button>
            </div>
          </div>

          <Card className="bg-gradient-card shadow-soft">
            <div className="p-4 border-b border-border/50">
              <div>
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold">Campaign #{data?.id || campaignId}</h3>
                    <div className="text-xs text-muted-foreground">
                      Created: {data?.created_at ? new Date(data.created_at).toLocaleDateString() : '—'}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge variant={data?.status === 'scheduled' ? 'default' : 'secondary'}>
                      {data?.status || 'Unknown'}
                    </Badge>
                  {data?.conversation_id && (
                    <Button 
                      variant="ghost" 
                      size="sm"
                      className="h-8 px-2 text-primary hover:text-primary/80"
                      onClick={() => navigate(`/conversations/${data.conversation_id}`)}
                      title={`View Conversation #${data.conversation_id}`}
                    >
                      <span className="mr-1">View conversation</span>
                      <ArrowRight className="w-4 h-4" />
                    </Button>
                  )}
                  </div>
                </div>
              </div>
            </div>

            <div className="p-4 space-y-6">
              {/* Campaign Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-muted-foreground mb-1">Leads</div>
                  <div className="text-sm">{(data?.leads?.length ?? 0)} leads</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground mb-1">Tone</div>
                  <div className="text-sm capitalize">{data?.tone || '—'}</div>
                </div>
              </div>

              <Separator />

              {/* Email Sequence */}
              {data?.email_sequence?.steps && data.email_sequence.steps.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-lg font-semibold">Email Sequence</h4>
                    <Badge variant="outline">{data.email_sequence.steps.length} steps</Badge>
                  </div>
                  
                  <div className="space-y-4">
                    {data.email_sequence.steps.map((step, index) => (
                      <Card key={step.sequence_step_id || index} className="p-4 bg-muted/30">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center space-x-2">
                            <Badge variant="secondary">Step {step.step_number !== undefined ? step.step_number + 1 : index + 1}</Badge>
                            <span className="text-xs text-muted-foreground">
                              {step.created_at ? new Date(step.created_at).toLocaleDateString() : ''}
                            </span>
                          </div>
                        </div>
                        
                        <div className="space-y-3">
                          <div>
                            <div className="text-sm font-medium text-muted-foreground mb-1">Subject Line</div>
                            <div className="text-sm font-medium">{step.subject_line || '—'}</div>
                          </div>
                          
                          <div>
                            <div className="text-sm font-medium text-muted-foreground mb-2">Email Body</div>
                            <div className="text-sm whitespace-pre-wrap bg-background/50 p-3 rounded-md border">
                              {step.body_template || '—'}
                            </div>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {/* Leads */}
              {data?.leads && data.leads.length > 0 && (
                <div>
                  <h4 className="text-lg font-semibold mb-4">Leads ({data.leads.length})</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {data.leads.map((lead, index) => (
                      <Card key={lead.id || index} className="p-3 bg-muted/30">
                        <div className="text-sm font-medium">{lead.name || 'Unnamed Lead'}</div>
                        <div className="text-xs text-muted-foreground">{lead.email || 'No email'}</div>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {(!data?.email_sequence?.steps || data.email_sequence.steps.length === 0) && 
               (!data?.leads || data.leads.length === 0) && (
                <div className="text-center py-8 text-muted-foreground">
                  <div className="text-sm">No email sequence or leads data available</div>
                </div>
              )}
            </div>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default CampaignPage;


