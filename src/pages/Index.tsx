import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Sidebar, SidebarRef } from "@/components/Sidebar";
import { Dashboard } from "@/components/Dashboard";
import { ChatInterface } from "@/components/ChatInterface";
import { CampaignBuilder } from "@/components/CampaignBuilder";
import { Settings } from "@/components/Settings";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { Target, Mail, BarChart3, Users, Zap, ArrowRight, CheckCircle2, Clock, Play, Pause, CheckCircle, Volume2 } from "lucide-react";
import apiClient, { NetworkError } from "@/lib/api";
import { readCache, writeCache, CACHE_KEYS } from "@/lib/cache";
import { toast } from "@/components/ui/sonner";

interface IndexProps {
  onLogout: () => void;
  freshLogin: boolean;
}

const Index = ({ onLogout, freshLogin }: IndexProps) => {
  const sidebarRef = useRef<SidebarRef>(null);
  const location = useLocation();
  const navigate = useNavigate();
  const params = useParams();
  
  // Determine active tab from URL
  const getActiveTabFromPath = (pathname: string) => {
    if (pathname === '/') return 'chat';
    if (pathname.startsWith('/conversations/')) return 'chat';
    if (pathname === '/campaign-builder') return 'campaign-builder';
    if (pathname === '/campaigns') return 'campaigns';
    if (pathname === '/analytics') return 'analytics';
    if (pathname === '/settings') return 'settings';
    if (pathname === '/conversations') return 'conversations';
    return 'chat'; // default fallback
  };

  const [activeTab, setActiveTab] = useState(() => getActiveTabFromPath(location.pathname));
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    // Load the sidebar collapsed state from localStorage, default to false
    try {
      const savedCollapsed = localStorage.getItem('campaigner-sidebar-collapsed');
      return savedCollapsed === 'true';
    } catch (error) {
      console.error('Error loading sidebar state:', error);
      return false;
    }
  });
  const [activeConversationId, setActiveConversationId] = useState<number | null>(() => {
    const urlId = params?.id ? Number(params.id) : null;
    return Number.isFinite(urlId) ? urlId : null;
  });
  const [campaigns, setCampaigns] = useState<Array<{
    id: number;
    name?: string;
    status?: string;
    created_at?: string;
    tone?: string;
    leads?: Array<any>;
  }>>(() => {
    // Initialize from cache like sidebar does
    // Handle both sidebar format (id, name) and full format
    const cached = readCache<Array<any>>(CACHE_KEYS.CAMPAIGNS);
    if (!cached) return [];
    
    // If cached data has full structure, use it; otherwise it's sidebar format
    return cached.map((item: any) => ({
      id: item.id,
      name: item.name || `Campaign ${item.id}`,
      status: item.status,
      created_at: item.created_at,
      tone: item.tone,
      leads: item.leads || [],
    }));
  });
  const [isLoadingCampaigns, setIsLoadingCampaigns] = useState(false);
  const [campaignsError, setCampaignsError] = useState<string | null>(null);
  
  const [conversations, setConversations] = useState<Array<{
    id: number;
    title?: string;
    description?: string;
    status?: string;
    tone?: string;
    job_titles?: Array<string>;
    message_count?: number;
    created_at?: string;
    last_active?: string;
  }>>(() => {
    // Initialize from cache
    const cached = readCache<Array<any>>(CACHE_KEYS.CONVERSATIONS_PAGE);
    if (!cached) return [];
    return cached.map((item: any) => ({
      id: item.id,
      title: item.title || `Conversation ${item.id}`,
      description: item.description,
      status: item.status,
      tone: item.tone,
      job_titles: item.job_titles || [],
      message_count: item.message_count || 0,
      created_at: item.created_at,
      last_active: item.last_active,
    }));
  });
  const [isLoadingConversations, setIsLoadingConversations] = useState(false);
  const [conversationsError, setConversationsError] = useState<string | null>(null);

  // Update active tab when URL changes
  useEffect(() => {
    const newActiveTab = getActiveTabFromPath(location.pathname);
    if (newActiveTab !== activeTab) {
      setActiveTab(newActiveTab);
    }
  }, [location.pathname, activeTab]);

  // Save active tab to localStorage whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem('campaigner-active-tab', activeTab);
    } catch (error) {
      console.error('Error saving active tab:', error);
    }
  }, [activeTab]);

  // Save sidebar collapsed state to localStorage whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem('campaigner-sidebar-collapsed', isSidebarCollapsed.toString());
    } catch (error) {
      console.error('Error saving sidebar state:', error);
    }
  }, [isSidebarCollapsed]);

  // Sync URL param conversation id into local state
  useEffect(() => {
    const urlId = params.id ? Number(params.id) : null;
    if (urlId !== activeConversationId) {
      setActiveConversationId(urlId);
    }
  }, [params.id, activeConversationId]);

  // Fetch campaigns when campaigns tab is active - only sync new campaigns, don't replace
  // Use a ref to track if we've loaded initially to avoid refetching on every tab switch
  const campaignsLoadedRef = useRef(false);
  
  useEffect(() => {
    if (activeTab === 'campaigns' && !campaignsLoadedRef.current) {
      campaignsLoadedRef.current = true;
      
      const fetchCampaigns = async () => {
        // Only show loading if we don't have cached campaigns
        if (campaigns.length === 0) {
          setIsLoadingCampaigns(true);
        }
        setCampaignsError(null);
        try {
          const data = await apiClient.get<any>(`/api/campaigns/?load_leads=false&load_email_sequence=false`);
          let newItems: Array<{
            id: number;
            name?: string;
            status?: string;
            created_at?: string;
            tone?: string;
            leads?: Array<any>;
          }> = [];
          
          if (Array.isArray(data)) {
            newItems = data.map((it: any, idx: number) => ({
              id: Number(it?.id ?? idx + 1),
              name: it?.name || `Campaign ${it?.id ?? idx + 1}`,
              status: it?.status || 'draft',
              created_at: it?.created_at,
              tone: it?.tone,
              leads: it?.leads || [],
            }));
          } else if (data && Array.isArray((data as any).items)) {
            newItems = (data as any).items.map((it: any, idx: number) => ({
              id: Number(it?.id ?? idx + 1),
              name: it?.name || `Campaign ${it?.id ?? idx + 1}`,
              status: it?.status || 'draft',
              created_at: it?.created_at,
              tone: it?.tone,
              leads: it?.leads || [],
            }));
          }
          
          // Merge new campaigns with existing ones - only add campaigns that don't exist
          // Also update existing campaigns with fresh data if available
          setCampaigns(prevCampaigns => {
            const existingIds = new Set(prevCampaigns.map(c => c.id));
            const campaignsToAdd = newItems.filter(item => !existingIds.has(item.id));
            
            // Update existing campaigns with fresh data (in case status, tone, etc. changed)
            const updatedCampaigns = prevCampaigns.map(existing => {
              const freshData = newItems.find(item => item.id === existing.id);
              if (freshData) {
                // Merge fresh data with existing, preserving all fields
                return {
                  ...existing,
                  ...freshData,
                  // Preserve leads if they exist in existing but not in fresh
                  leads: freshData.leads?.length > 0 ? freshData.leads : existing.leads,
                };
              }
              return existing;
            });
            
            // If we have existing campaigns and no new ones to add, return updated existing
            if (prevCampaigns.length > 0 && campaignsToAdd.length === 0) {
              const merged = updatedCampaigns;
              writeCache(CACHE_KEYS.CAMPAIGNS, merged);
              return merged;
            }
            
            // Merge: updated existing + new, or if no existing, use new items
            const merged = prevCampaigns.length > 0 
              ? [...updatedCampaigns, ...campaignsToAdd]
              : newItems;
            
            // Update cache with full data structure
            writeCache(CACHE_KEYS.CAMPAIGNS, merged);
            return merged;
          });
        } catch (err: any) {
          let errorMessage = 'Failed to load campaigns';
          
          if (err instanceof NetworkError) {
            switch (err.type) {
              case 'OFFLINE':
                errorMessage = 'You appear to be offline. Please check your internet connection.';
                break;
              case 'NETWORK_ERROR':
                errorMessage = 'Unable to connect to the server. Please check your connection.';
                break;
              case 'TIMEOUT':
                errorMessage = 'Request timed out. Please try again.';
                break;
              case 'SERVER_ERROR':
                errorMessage = 'Server error occurred. Please try again later.';
                break;
              default:
                errorMessage = err.message || 'Failed to load campaigns';
            }
          } else {
            errorMessage = err?.message || 'Failed to load campaigns';
          }
          
          setCampaignsError(errorMessage);
        } finally {
          setIsLoadingCampaigns(false);
        }
      };

      fetchCampaigns();
    }
    // Reset the ref when switching away from campaigns tab
    if (activeTab !== 'campaigns') {
      campaignsLoadedRef.current = false;
    }
  }, [activeTab, campaigns.length]);

  // Fetch conversations when conversations tab is active - similar pattern to campaigns
  const conversationsLoadedRef = useRef(false);
  
  useEffect(() => {
    if (activeTab === 'conversations' && !conversationsLoadedRef.current) {
      conversationsLoadedRef.current = true;
      
      const fetchConversations = async () => {
        // Only show loading if we don't have cached conversations
        if (conversations.length === 0) {
          setIsLoadingConversations(true);
        }
        setConversationsError(null);
        try {
          const data = await apiClient.get<any>(`/api/conversations/`);
          let newItems: Array<{
            id: number;
            title?: string;
            description?: string;
            status?: string;
            tone?: string;
            job_titles?: Array<string>;
            message_count?: number;
            created_at?: string;
            last_active?: string;
          }> = [];
          
          if (Array.isArray(data)) {
            newItems = data.map((it: any, idx: number) => ({
              id: Number(it?.id ?? idx + 1),
              title: it?.title || `Conversation ${it?.id ?? idx + 1}`,
              description: it?.description || '',
              status: it?.status || 'draft',
              tone: it?.tone || 'Not set',
              job_titles: it?.job_titles || [],
              message_count: it?.message_count || 0,
              created_at: it?.created_at,
              last_active: it?.last_active || it?.created_at,
            }));
          } else if (data && Array.isArray((data as any).items)) {
            newItems = (data as any).items.map((it: any, idx: number) => ({
              id: Number(it?.id ?? idx + 1),
              title: it?.title || `Conversation ${it?.id ?? idx + 1}`,
              description: it?.description || '',
              status: it?.status || 'draft',
              tone: it?.tone || 'Not set',
              job_titles: it?.job_titles || [],
              message_count: it?.message_count || 0,
              created_at: it?.created_at,
              last_active: it?.last_active || it?.created_at,
            }));
          }
          
          // Merge new conversations with existing ones - only add conversations that don't exist
          // Also update existing conversations with fresh data if available
          setConversations(prevConversations => {
            const existingIds = new Set(prevConversations.map(c => c.id));
            const conversationsToAdd = newItems.filter(item => !existingIds.has(item.id));
            
            // Update existing conversations with fresh data
            const updatedConversations = prevConversations.map(existing => {
              const freshData = newItems.find(item => item.id === existing.id);
              if (freshData) {
                return {
                  ...existing,
                  ...freshData,
                };
              }
              return existing;
            });
            
            // If we have existing conversations and no new ones to add, return updated existing
            if (prevConversations.length > 0 && conversationsToAdd.length === 0) {
              const merged = updatedConversations;
              writeCache(CACHE_KEYS.CONVERSATIONS_PAGE, merged);
              return merged;
            }
            
            // Merge: updated existing + new, or if no existing, use new items
            const merged = prevConversations.length > 0 
              ? [...updatedConversations, ...conversationsToAdd]
              : newItems;
            
            // Update cache with full data structure
            writeCache(CACHE_KEYS.CONVERSATIONS_PAGE, merged);
            return merged;
          });
        } catch (err: any) {
          let errorMessage = 'Failed to load conversations';
          
          if (err instanceof NetworkError) {
            switch (err.type) {
              case 'OFFLINE':
                errorMessage = 'You appear to be offline. Please check your internet connection.';
                break;
              case 'NETWORK_ERROR':
                errorMessage = 'Unable to connect to the server. Please check your connection.';
                break;
              case 'TIMEOUT':
                errorMessage = 'Request timed out. Please try again.';
                break;
              case 'SERVER_ERROR':
                errorMessage = 'Server error occurred. Please try again later.';
                break;
              default:
                errorMessage = err.message || 'Failed to load conversations';
            }
          } else {
            errorMessage = err?.message || 'Failed to load conversations';
          }
          
          setConversationsError(errorMessage);
        } finally {
          setIsLoadingConversations(false);
        }
      };

      fetchConversations();
    }
    // Reset the ref when switching away from conversations tab
    if (activeTab !== 'conversations') {
      conversationsLoadedRef.current = false;
    }
  }, [activeTab, conversations.length]);

  const renderContent = () => {
    switch (activeTab) {
      case 'chat':
        return (
          <ChatInterface 
            freshLogin={freshLogin} 
            isSidebarCollapsed={isSidebarCollapsed} 
            initialConversationId={activeConversationId} 
            onConversationIdChange={(id) => {
              setActiveConversationId(id);
              // Refresh sidebar conversations when a new conversation is created
              if (id) {
                sidebarRef.current?.refreshConversations({ silent: true });
                sidebarRef.current?.refreshCampaigns({ silent: true });
                navigate(`/conversations/${id}`, { replace: true });
              }
            }} 
            onNewChat={() => {
              setActiveConversationId(null);
              navigate('/', { replace: true });
            }} 
          />
        );
      case 'campaign-builder':
        return <CampaignBuilder />;
      case 'campaigns':
        // Helper function to format date
        const formatDate = (dateString?: string) => {
          if (!dateString) return 'Unknown date';
          try {
            const date = new Date(dateString);
            const now = new Date();
            const diffMs = now.getTime() - date.getTime();
            const diffMins = Math.floor(diffMs / 60000);
            const diffHours = Math.floor(diffMs / 3600000);
            const diffDays = Math.floor(diffMs / 86400000);
            
            if (diffMins < 1) return 'Just now';
            if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
            if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
            if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
            return date.toLocaleDateString();
          } catch {
            return 'Unknown date';
          }
        };

        const getStatusColor = (status?: string) => {
          switch (status?.toLowerCase()) {
            case 'active':
            case 'running':
              return 'bg-green-100 text-green-700 border border-green-200';
            case 'completed':
            case 'finished':
              return 'bg-blue-100 text-blue-700 border border-blue-200';
            case 'scheduled':
              return 'bg-yellow-100 text-yellow-700 border border-yellow-200';
            case 'draft':
              return 'bg-gray-100 text-gray-700 border border-gray-200';
            default:
              return 'bg-gray-100 text-gray-700 border border-gray-200';
          }
        };

        return (
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-3xl font-bold">Campaigns</h2>
                <p className="text-muted-foreground mt-1">Manage and track all your marketing campaigns</p>
              </div>
              <div className="flex items-center space-x-3">
                <Button variant="outline" size="sm">
                  Filter
                </Button>
                <Button variant="outline" size="sm">
                  Export All
                </Button>
              </div>
            </div>

            {isLoadingCampaigns && (
              <div className="text-center py-12">
                <p className="text-muted-foreground">Loading campaigns...</p>
              </div>
            )}

            {campaignsError && (
              <div className="text-center py-12">
                <p className="text-destructive">{campaignsError}</p>
              </div>
            )}

            {!isLoadingCampaigns && !campaignsError && campaigns.length > 0 && (
              <div className="grid gap-4">
                {campaigns.map((campaign) => (
                  <div 
                    key={campaign.id} 
                    className="p-6 border rounded-lg hover:bg-muted/50 cursor-pointer transition-smooth bg-gradient-card shadow-soft"
                    onClick={() => navigate(`/campaigns/${campaign.id}`)}
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <h3 className="font-semibold text-lg">{campaign.name || `Campaign ${campaign.id}`}</h3>
                          <span className={`text-xs px-2 py-1 rounded-full font-medium ${getStatusColor(campaign.status)}`}>
                            {campaign.status || 'draft'}
                          </span>
                        </div>
                        
                        <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                          {campaign.leads && campaign.leads.length > 0 && (
                            <span className="flex items-center">
                              <Users className="w-4 h-4 mr-1" />
                              {campaign.leads.length} lead{campaign.leads.length > 1 ? 's' : ''}
                            </span>
                          )}
                          {campaign.tone && (
                            <span className="flex items-center">
                              <Target className="w-4 h-4 mr-1" />
                              {campaign.tone} tone
                            </span>
                          )}
                          {campaign.created_at && (
                            <span className="flex items-center">
                              <Clock className="w-4 h-4 mr-1" />
                              {formatDate(campaign.created_at)}
                            </span>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2 ml-4">
                        <Button 
                          variant="default" 
                          size="sm" 
                          className="bg-gradient-primary !shadow-none hover:!shadow-none hover:!scale-100 hover:brightness-90 active:scale-95 transition-all"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/campaigns/${campaign.id}`);
                          }}
                        >
                          View
                        </Button>
                        <Button 
                          variant="destructive" 
                          size="sm" 
                          className="!shadow-none hover:!shadow-none hover:bg-destructive/80 active:scale-95 transition-all"
                          onClick={(e) => {
                            e.stopPropagation();
                            const campaignName = campaign.name || `Campaign ${campaign.id}`;
                            toast.custom((t) => (
                              <div className="bg-background border border-border rounded-lg shadow-lg p-4 min-w-[300px]">
                                <div className="mb-3">
                                  <h3 className="font-semibold text-foreground mb-1">Delete Campaign</h3>
                                  <p className="text-sm text-muted-foreground">
                                    Are you sure you want to delete "{campaignName}"? This action cannot be undone.
                                  </p>
                                </div>
                                <div className="flex justify-end gap-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => toast.dismiss(t)}
                                  >
                                    Cancel
                                  </Button>
                                  <Button
                                    variant="destructive"
                                    size="sm"
                                    onClick={async () => {
                                      toast.dismiss(t);
                                      try {
                                        await apiClient.delete(`/api/campaigns/${campaign.id}`);
                                        // Remove campaign from state
                                        setCampaigns(prevCampaigns => {
                                          const updated = prevCampaigns.filter(c => c.id !== campaign.id);
                                          writeCache(CACHE_KEYS.CAMPAIGNS, updated);
                                          return updated;
                                        });
                                        // Refresh sidebar campaigns
                                        sidebarRef.current?.refreshCampaigns({ silent: true });
                                        toast.success(`Campaign "${campaignName}" deleted successfully`);
                                      } catch (err: any) {
                                        let errorMessage = 'Failed to delete campaign';
                                        if (err instanceof NetworkError) {
                                          switch (err.type) {
                                            case 'OFFLINE':
                                              errorMessage = 'You appear to be offline. Please check your internet connection.';
                                              break;
                                            case 'NETWORK_ERROR':
                                              errorMessage = 'Unable to connect to the server. Please check your connection.';
                                              break;
                                            case 'TIMEOUT':
                                              errorMessage = 'Request timed out. Please try again.';
                                              break;
                                            case 'SERVER_ERROR':
                                              errorMessage = 'Server error occurred. Please try again later.';
                                              break;
                                            default:
                                              errorMessage = err.message || 'Failed to delete campaign';
                                          }
                                        } else {
                                          errorMessage = err?.message || 'Failed to delete campaign';
                                        }
                                        toast.error(errorMessage);
                                      }
                                    }}
                                  >
                                    Delete
                                  </Button>
                                </div>
                              </div>
                            ), {
                              duration: Infinity, // Keep open until user interacts
                            });
                          }}
                        >
                          Delete
                        </Button>
                        {/* <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/campaign-builder?campaign=${campaign.id}`);
                          }}
                        >
                          Edit
                        </Button> */}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {!isLoadingCampaigns && !campaignsError && campaigns.length === 0 && (
              <div className="flex flex-col items-center justify-center min-h-[60vh] py-12">
              <div className="relative mb-8">
                <div className="w-32 h-32 bg-gradient-primary/20 rounded-full flex items-center justify-center shadow-glow">
                  <Target className="w-16 h-16 text-primary" />
                </div>
                <div className="absolute -top-2 -right-2 w-8 h-8 bg-primary rounded-full flex items-center justify-center shadow-soft">
                  <Zap className="w-4 h-4 text-primary-foreground" />
                </div>
              </div>

              <div className="text-center max-w-2xl mb-8">
                <h2 className="text-2xl font-semibold mb-3">No campaigns yet</h2>
                <p className="text-muted-foreground text-lg mb-2">
                  Campaigns will be shown here once created
                </p>
                <p className="text-muted-foreground mb-6">
                  Start building your first campaign to see it appear in this dashboard
                </p>
                <Button 
                  onClick={() => navigate('/campaign-builder')}
                  className="bg-gradient-primary shadow-soft hover:shadow-medium transition-smooth"
                  size="lg"
                >
                  Create Your First Campaign
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>

              {/* Feature Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12 w-full max-w-4xl">
                <Card className="p-6 bg-gradient-card shadow-soft hover:shadow-medium transition-smooth border-border/50">
                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                    <Mail className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="font-semibold mb-2">Email Campaigns</h3>
                  <p className="text-sm text-muted-foreground">
                    Create targeted email sequences with AI-powered personalization
                  </p>
                </Card>

                <Card className="p-6 bg-gradient-card shadow-soft hover:shadow-medium transition-smooth border-border/50">
                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                    <Users className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="font-semibold mb-2">Targeted Outreach</h3>
                  <p className="text-sm text-muted-foreground">
                    Reach the right audience with persona-based campaign targeting
                  </p>
                </Card>

                <Card className="p-6 bg-gradient-card shadow-soft hover:shadow-medium transition-smooth border-border/50">
                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                    <BarChart3 className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="font-semibold mb-2">Track Performance</h3>
                  <p className="text-sm text-muted-foreground">
                    Monitor campaign metrics and optimize your marketing efforts
                  </p>
                </Card>
              </div>

              {/* Benefits List */}
              <div className="mt-12 w-full max-w-2xl">
                <Card className="p-6 bg-muted/30 border-border/50">
                  <h3 className="font-semibold mb-4 text-center">What you can do with campaigns</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[
                      "AI-powered campaign creation",
                      "Multi-channel marketing support",
                      "Automated email sequences",
                      "Real-time performance tracking",
                      "Persona-based targeting",
                      "A/B testing capabilities"
                    ].map((benefit, index) => (
                      <div key={index} className="flex items-center space-x-2">
                        <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0" />
                        <span className="text-sm text-muted-foreground">{benefit}</span>
                      </div>
                    ))}
                  </div>
                </Card>
              </div>
            </div>
            )}
          </div>
        );
      case 'analytics':
        return <Dashboard />;
      case 'settings':
        return <Settings />;
      case 'conversations':
        // Helper function to format date
        const formatConversationDate = (dateString?: string) => {
          if (!dateString) return 'Unknown date';
          try {
            const date = new Date(dateString);
            const now = new Date();
            const diffMs = now.getTime() - date.getTime();
            const diffMins = Math.floor(diffMs / 60000);
            const diffHours = Math.floor(diffMs / 3600000);
            const diffDays = Math.floor(diffMs / 86400000);
            
            if (diffMins < 1) return 'Just now';
            if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
            if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
            if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
            return date.toLocaleDateString();
          } catch {
            return 'Unknown date';
          }
        };

        const getConversationStatusColor = (status?: string) => {
          switch (status?.toLowerCase()) {
            case 'active':
            case 'running':
              return 'bg-green-100 text-green-700 border border-green-200';
            case 'completed':
            case 'finished':
              return 'bg-blue-100 text-blue-700 border border-blue-200';
            case 'scheduled':
              return 'bg-yellow-100 text-yellow-700 border border-yellow-200';
            case 'draft':
            case 'paused':
              return 'bg-gray-100 text-gray-700 border border-gray-200';
            default:
              return 'bg-gray-100 text-gray-700 border border-gray-200';
          }
        };

        return (
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-3xl font-bold">Conversation History</h2>
                <p className="text-muted-foreground mt-1">View and manage all your AI conversations</p>
              </div>
              <div className="flex items-center space-x-3">
                <Button variant="outline" size="sm">
                  Filter
                </Button>
                <Button variant="outline" size="sm">
                  Export All
                </Button>
              </div>
            </div>

            {isLoadingConversations && (
              <div className="text-center py-12">
                <p className="text-muted-foreground">Loading conversations...</p>
              </div>
            )}

            {conversationsError && (
              <div className="text-center py-12">
                <p className="text-destructive">{conversationsError}</p>
              </div>
            )}

            {!isLoadingConversations && !conversationsError && conversations.length > 0 && (
              <div className="grid gap-4">
                {conversations.map((conversation) => (
                  <div 
                    key={conversation.id} 
                    className="p-6 border rounded-lg hover:bg-muted/50 cursor-pointer transition-smooth bg-gradient-card shadow-soft"
                    onClick={() => navigate(`/conversations/${conversation.id}`)}
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <h3 className="font-semibold text-lg">{conversation.title || `Conversation #${conversation.id}`}</h3>
                          <span className={`text-xs px-2 py-1 rounded-full font-medium ${getConversationStatusColor(conversation.status)}`}>
                            {conversation.status || 'draft'}
                          </span>
                        </div>
                        {conversation.description && (
                          <p className="text-muted-foreground mb-3">{conversation.description}</p>
                        )}
                        
                        <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                          <span className="flex items-center">
                            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                            </svg>
                            {conversation.message_count || 0} message{conversation.message_count !== 1 ? 's' : ''}
                          </span>
                          {conversation.tone && conversation.tone !== 'Not set' && (
                            <span className="flex items-center">
                              <Volume2 className="w-4 h-4 mr-1" />
                              {conversation.tone} tone
                            </span>
                          )}
                          {conversation.last_active && (
                            <span className="flex items-center">
                              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              {formatConversationDate(conversation.last_active)}
                            </span>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2 ml-4">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/conversations/${conversation.id}`);
                          }}
                        >
                          Continue
                        </Button>
                        {/* <Button variant="ghost" size="sm" onClick={(e) => e.stopPropagation()}>
                          Export
                        </Button> */}
                        <Button variant="ghost" size="sm" onClick={(e) => e.stopPropagation()}>
                          Delete
                        </Button>
                      </div>
                    </div>
                    
                    {conversation.job_titles && conversation.job_titles.length > 0 && (
                      <div className="flex items-center space-x-2">
                        {conversation.job_titles.map((tag) => (
                          <span key={tag} className="text-xs px-2 py-1 bg-primary/10 text-primary rounded-md">
                            #{tag.toLowerCase().replace(/\s+/g, '-')}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {!isLoadingConversations && !conversationsError && conversations.length === 0 && (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium mb-2">No conversations yet</h3>
                <p className="text-muted-foreground mb-4">Start your first AI conversation to see it here</p>
                <Button onClick={() => navigate('/')}>Start New Conversation</Button>
              </div>
            )}
          </div>
        );
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Sidebar 
        ref={sidebarRef}
        activeTab={activeTab} 
        onTabChange={setActiveTab} 
        onLogout={onLogout} 
        onCollapsedChange={setIsSidebarCollapsed}
        onSelectConversation={(id) => {
          setActiveConversationId(id);
          navigate(`/conversations/${id}`);
        }}
        onSelectCampaign={(id) => {
          navigate(`/campaigns/${id}`);
        }}
      />
      <main className={`${isSidebarCollapsed ? 'ml-16' : 'ml-64'} transition-all duration-300 overflow-auto min-h-screen`}>
        {renderContent()}
      </main>
      {/* Campaign details modal removed in favor of dedicated route */}
    </div>
  );
};

export default Index;