import { useState, useRef, Suspense, useEffect } from "react";
import { useParams, useNavigate, useLoaderData, Await } from "react-router-dom";
import { Sidebar, SidebarRef } from "@/components/Sidebar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRight, Linkedin, Mail } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { CampaignLoaderData } from "@/lib/loaders";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import apiClient from "@/lib/api";
import { readCache, writeCache, CACHE_KEYS } from "@/lib/cache";

const CampaignPage = () => {
  const params = useParams();
  const navigate = useNavigate();
  const sidebarRef = useRef<SidebarRef>(null);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  
  // Sidebar conversations state (simpler format for sidebar list)
  const [sidebarConversations, setSidebarConversations] = useState<Array<{
    id: number;
    title?: string | null;
    last_message?: string | null;
    updated_at?: string | null;
    created_at?: string | null;
  }>>(() => {
    const cached = readCache<Array<any>>(CACHE_KEYS.CONVERSATIONS);
    if (!cached) return [];
    return cached.map((item: any) => ({
      id: item.id,
      title: item.title ?? item.name ?? null,
      last_message: item.last_message ?? item.lastMessage ?? null,
      updated_at: item.updated_at ?? item.updatedAt ?? null,
      created_at: item.created_at ?? item.createdAt ?? null,
    }));
  });
  const [isLoadingSidebarConversations, setIsLoadingSidebarConversations] = useState(false);

  // Fetch sidebar conversations (simpler format for sidebar list)
  const fetchSidebarConversations = async (options?: { silent?: boolean }) => {
    const silent = options?.silent === true;
    if (!silent) setIsLoadingSidebarConversations(true);
    try {
      const data = await apiClient.get<any>(`/api/conversations/?load_messages=false`);
      let items: Array<{
        id: number;
        title?: string | null;
        last_message?: string | null;
        updated_at?: string | null;
        created_at?: string | null;
      }> = [];

      if (Array.isArray(data)) {
        items = data.map((it: any, idx: number) => ({
          id: Number(it?.id ?? idx + 1),
          title: it?.title ?? it?.name ?? null,
          last_message: it?.last_message ?? it?.lastMessage ?? null,
          updated_at: it?.updated_at ?? it?.updatedAt ?? null,
          created_at: it?.created_at ?? it?.createdAt ?? null,
        }));
      } else if (data && Array.isArray((data as any).items)) {
        items = (data as any).items.map((it: any, idx: number) => ({
          id: Number(it?.id ?? idx + 1),
          title: it?.title ?? it?.name ?? null,
          last_message: it?.last_message ?? it?.lastMessage ?? null,
          updated_at: it?.updated_at ?? it?.updatedAt ?? null,
          created_at: it?.created_at ?? it?.createdAt ?? null,
        }));
      } else if (typeof data === 'string') {
        items = [{ id: 1, title: data, last_message: null, updated_at: null, created_at: null }];
      }

      setSidebarConversations(items);
      writeCache(CACHE_KEYS.CONVERSATIONS, items);
    } catch (err: any) {
      console.error('Failed to load sidebar conversations:', err);
    } finally {
      if (!silent) setIsLoadingSidebarConversations(false);
    }
  };

  // Fetch sidebar conversations on mount
  useEffect(() => {
    fetchSidebarConversations();
  }, []);

  // Expose refresh function via ref
  useEffect(() => {
    if (sidebarRef.current) {
      (sidebarRef.current as any).refreshConversations = fetchSidebarConversations;
    }
  }, []);
  
  // Get deferred data from loader
  const { campaign } = useLoaderData() as { campaign: Promise<CampaignLoaderData> };
  const campaignId = Number(params.id);

  return (
    <div className="min-h-screen bg-background">
      <Sidebar 
        ref={sidebarRef}
        activeTab="campaigns" 
        onTabChange={(tab) => {
          // Navigation is handled by the sidebar itself now
        }}
        onLogout={() => {
          // simple redirect on logout; App guards routes
          navigate('/');
        }}
        onCollapsedChange={setIsSidebarCollapsed}
        conversations={sidebarConversations}
        onSelectConversation={(id) => {
          navigate(`/conversations/${id}`);
        }}
        onSelectCampaign={(id) => {
          navigate(`/campaigns/${id}`);
        }}
      />
      <main className={`${isSidebarCollapsed ? 'ml-16' : 'ml-64'} transition-all duration-300 overflow-auto min-h-screen p-6`}>
        <div className="max-w-4xl mx-auto">
          <Suspense fallback={
            <div className="flex flex-col items-center justify-center min-h-[60vh]">
              <LoadingSpinner size="lg" text="Loading campaign..." />
            </div>
          }>
            <Await resolve={campaign}>
              {(data: CampaignLoaderData) => (
                <>
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
                                    <Badge variant="secondary">Step {step.step_number !== undefined ? step.step_number : index + 1}</Badge>
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
                            {data.leads.map((lead, index) => {
                              const fullName = [lead.first_name, lead.last_name].filter(Boolean).join(' ') || 'Unnamed Lead';
                              return (
                                <Card key={lead.id || index} className="p-3 bg-muted/30">
                                  <div className="space-y-2">
                                    <div className="text-sm font-medium">{fullName}</div>
                                    {lead.job_title && (
                                      <div className="text-xs text-muted-foreground">{lead.job_title}</div>
                                    )}
                                    {lead.email && (
                                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                        <Mail className="w-3 h-3" />
                                        <span>{lead.email}</span>
                                      </div>
                                    )}
                                    {lead.linkedin_url && (
                                      <div className="text-xs">
                                        <a 
                                          href={lead.linkedin_url} 
                                          target="_blank" 
                                          rel="noopener noreferrer"
                                          className="flex items-center gap-1.5 text-primary hover:underline"
                                        >
                                          <Linkedin className="w-3 h-3" />
                                          <span>LinkedIn Profile</span>
                                        </a>
                                      </div>
                                    )}
                                  </div>
                                </Card>
                              );
                            })}
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
                </>
              )}
            </Await>
          </Suspense>
        </div>
      </main>
    </div>
  );
};

export default CampaignPage;
