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
import apiClient, { NetworkError, fetchUserCredits, CreditUsageResponse } from "@/lib/api";
import { readCache, writeCache, CACHE_KEYS } from "@/lib/cache";
import { toast } from "@/components/ui/sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

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
    title?: string;
    status?: string;
    created_at?: string;
    tone?: string;
    leads?: Array<any>;
    conversation_id?: number;
  }>>(() => {
    // Initialize from cache like sidebar does
    // Handle both sidebar format (id, title) and full format
    const cached = readCache<Array<any>>(CACHE_KEYS.CAMPAIGNS);
    if (!cached) return [];

    // If cached data has full structure, use it; otherwise it's sidebar format
    return cached.map((item: any) => ({
      id: item.id,
      title: item.title || `Campaign ${item.id}`,
      status: item.status,
      created_at: item.created_at,
      tone: item.tone,
      leads: item.leads || [],
      conversation_id: item.conversation_id,
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
    has_campaign?: boolean;
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
      has_campaign: item.has_campaign || false,
    }));
  });
  const [isLoadingConversations, setIsLoadingConversations] = useState(false);
  const [conversationsError, setConversationsError] = useState<string | null>(null);

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

      // Filter out pending deletions
      const filtered = items.filter(item => !pendingDeletedConversations.current.has(item.id));
      setSidebarConversations(filtered);
      writeCache(CACHE_KEYS.CONVERSATIONS, filtered);
    } catch (err: any) {
      console.error('Failed to load sidebar conversations:', err);
    } finally {
      if (!silent) setIsLoadingSidebarConversations(false);
    }
  };

  // Fetch sidebar campaigns (for sidebar list)
  const fetchSidebarCampaigns = async (options?: { silent?: boolean }) => {
    const silent = options?.silent === true;
    try {
      const data = await apiClient.get<any>(`/api/campaigns/?load_leads=false&load_email_sequence=false`);
      let items: Array<{
        id: number;
        title?: string;
        status?: string;
        created_at?: string;
        tone?: string;
        leads?: Array<any>;
      }> = [];

      if (Array.isArray(data)) {
        items = data.map((it: any, idx: number) => ({
          id: Number(it?.id ?? idx + 1),
          title: it?.title || `Campaign ${it?.id ?? idx + 1}`,
          status: it?.status || 'draft',
          created_at: it?.created_at,
          tone: it?.tone,
          leads: it?.leads || [],
        }));
      } else if (data && Array.isArray((data as any).items)) {
        items = (data as any).items.map((it: any, idx: number) => ({
          id: Number(it?.id ?? idx + 1),
          title: it?.title || `Campaign ${it?.id ?? idx + 1}`,
          status: it?.status || 'draft',
          created_at: it?.created_at,
          tone: it?.tone,
          leads: it?.leads || [],
        }));
      } else if (typeof data === 'string') {
        items = [{ id: 1, title: data }];
      }

      // Filter out pending deletions
      const filtered = items.filter(item => !pendingDeletedCampaigns.current.has(item.id));
      // Note: campaigns state is managed by the campaigns tab useEffect, but we update cache here
      writeCache(CACHE_KEYS.CAMPAIGNS, filtered);

      // Fetch credits when campaigns are refreshed
      fetchUserCredits()
        .then(data => writeCache(CACHE_KEYS.CREDITS, data))
        .catch(err => {
          console.error('Failed to fetch credits after campaign refresh:', err);
        });
    } catch (err: any) {
      console.error('Failed to load sidebar campaigns:', err);
    }
  };

  // Fetch sidebar conversations on mount
  useEffect(() => {
    fetchSidebarConversations();
  }, []);

  // Expose refresh functions via ref
  useEffect(() => {
    if (sidebarRef.current) {
      (sidebarRef.current as any).refreshConversations = fetchSidebarConversations;
      (sidebarRef.current as any).refreshCampaigns = fetchSidebarCampaigns;
    }
  }, []);

  // Periodic refresh every 5 minutes
  useEffect(() => {
    const interval = setInterval(() => {
      fetchSidebarConversations({ silent: true });
      fetchSidebarCampaigns({ silent: true });
    }, 5 * 60 * 1000); // 5 minutes

    return () => clearInterval(interval);
  }, []);

  // Refresh on window focus
  useEffect(() => {
    const handleFocus = () => {
      fetchSidebarConversations({ silent: true });
      fetchSidebarCampaigns({ silent: true });
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, []);

  // Listen for cache invalidation events
  useEffect(() => {
    const handleCacheInvalidate = (event: Event) => {
      const customEvent = event as CustomEvent<{ type: 'conversations' | 'campaigns' | 'all' }>;
      const { type } = customEvent.detail || { type: 'all' };

      if (type === 'conversations' || type === 'all') {
        fetchSidebarConversations({ silent: true });
      }
      if (type === 'campaigns' || type === 'all') {
        fetchSidebarCampaigns({ silent: true });
      }
    };

    window.addEventListener('cache-invalidate', handleCacheInvalidate);
    return () => window.removeEventListener('cache-invalidate', handleCacheInvalidate);
  }, []);

  // Delete dialog states
  const [deleteCampaignDialog, setDeleteCampaignDialog] = useState<{
    open: boolean;
    campaignId: number | null;
    campaignName: string;
    conversationTitle: string | null;
  }>({ open: false, campaignId: null, campaignName: "", conversationTitle: null });

  const [deleteConversationDialog, setDeleteConversationDialog] = useState<{
    open: boolean;
    conversationId: number | null;
    conversationTitle: string;
    campaignName: string | null;
  }>({ open: false, conversationId: null, conversationTitle: "", campaignName: null });

  // Track pending deletions to prevent reappearing during race conditions
  const pendingDeletedCampaigns = useRef<Set<number>>(new Set());
  const pendingDeletedConversations = useRef<Set<number>>(new Set());

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

  // Fetch credits when user opens platform (on mount or fresh login)
  useEffect(() => {
    if (freshLogin) {
      // Check cache first
      const cachedCredits = readCache<CreditUsageResponse>(CACHE_KEYS.CREDITS);
      if (!cachedCredits) {
        // Only fetch if not in cache
        fetchUserCredits()
          .then(data => writeCache(CACHE_KEYS.CREDITS, data))
          .catch(err => {
            console.error('Failed to fetch credits on platform open:', err);
          });
      }
    }
  }, [freshLogin]);

  // Sync URL param conversation id into local state
  useEffect(() => {
    const urlId = params.id ? Number(params.id) : null;

    // If we have an ID in the URL, update the active conversation
    if (urlId !== null) {
      setActiveConversationId(urlId);
    }
    // If we are specifically on the root path, it means a new chat
    else if (location.pathname === '/') {
      setActiveConversationId(null);
    }
    // Otherwise (e.g. on /campaigns, /settings), we keep the current activeConversationId
    // so the sidebar can link back to it.
  }, [params.id, location.pathname]);

  // Fetch campaigns when campaigns tab is active - only sync new campaigns, don't replace
  // Use a ref to track if we've loaded initially to avoid refetching on every tab switch
  const campaignsLoadedRef = useRef(false);
  // Track if we've ever loaded (even if empty) - never reset this
  const campaignsEverLoadedRef = useRef(false);

  useEffect(() => {
    if (activeTab === 'campaigns') {
      const fetchCampaigns = async () => {
        // Only show loading on very first load ever (when we've never loaded before)
        const isFirstLoadEver = !campaignsEverLoadedRef.current;
        if (isFirstLoadEver) {
          campaignsEverLoadedRef.current = true;
          if (campaigns.length === 0) {
            setIsLoadingCampaigns(true);
          }
        }

        // Track if this is the first load in this session
        const isFirstLoad = !campaignsLoadedRef.current;
        if (isFirstLoad) {
          campaignsLoadedRef.current = true;
        }
        setCampaignsError(null);
        try {
          const data = await apiClient.get<any>(`/api/campaigns/?load_leads=false&load_email_sequence=false`);
          let newItems: Array<{
            id: number;
            title?: string;
            status?: string;
            created_at?: string;
            tone?: string;
            leads?: Array<any>;
            conversation_id?: number;
          }> = [];

          if (Array.isArray(data)) {
            newItems = data.map((it: any, idx: number) => ({
              id: Number(it?.id ?? idx + 1),
              title: it?.title || `Campaign ${it?.id ?? idx + 1}`,
              status: it?.status || 'draft',
              created_at: it?.created_at,
              tone: it?.tone,
              leads: it?.leads || [],
              conversation_id: it?.conversation_id,
            }));
          } else if (data && Array.isArray((data as any).items)) {
            newItems = (data as any).items.map((it: any, idx: number) => ({
              id: Number(it?.id ?? idx + 1),
              title: it?.title || `Campaign ${it?.id ?? idx + 1}`,
              status: it?.status || 'draft',
              created_at: it?.created_at,
              tone: it?.tone,
              leads: it?.leads || [],
              conversation_id: it?.conversation_id,
            }));
          }

          setCampaigns(prevCampaigns => {
            // Ensure correct sorting: API returns newest items first.
            // We use newItems as the source of truth, but filter out pending deletions.
            const merged = newItems.filter(item => !pendingDeletedCampaigns.current.has(item.id));

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
  }, [activeTab]);

  // Fetch conversations when conversations tab is active - similar pattern to campaigns
  const conversationsLoadedRef = useRef(false);
  // Track if we've ever loaded (even if empty) - never reset this
  const conversationsEverLoadedRef = useRef(false);

  useEffect(() => {
    if (activeTab === 'conversations') {
      const fetchConversations = async () => {
        // Only show loading on very first load ever (when we've never loaded before)
        const isFirstLoadEver = !conversationsEverLoadedRef.current;
        if (isFirstLoadEver) {
          conversationsEverLoadedRef.current = true;
          if (conversations.length === 0) {
            setIsLoadingConversations(true);
          }
        }

        // Track if this is the first load in this session
        const isFirstLoad = !conversationsLoadedRef.current;
        if (isFirstLoad) {
          conversationsLoadedRef.current = true;
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
            has_campaign?: boolean;
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
              has_campaign: it?.has_campaign || false,
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
              has_campaign: it?.has_campaign || false,
            }));
          }

          // Merge new conversations with existing ones - only add conversations that don't exist
          // Also update existing conversations with fresh data if available
          // AND remove conversations that were deleted (exist locally but not in API response)
          setConversations(prevConversations => {
            // Ensure correct sorting: API returns newest items first.
            // We use newItems as the source of truth, but filter out pending deletions.
            const merged = newItems.filter(item => !pendingDeletedConversations.current.has(item.id));

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
  }, [activeTab]);

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
                fetchSidebarConversations({ silent: true });
                fetchSidebarCampaigns({ silent: true });
                // Fetch credits when new conversation is created
                fetchUserCredits()
                  .then(data => writeCache(CACHE_KEYS.CREDITS, data))
                  .catch(err => {
                    console.error('Failed to fetch credits after conversation creation:', err);
                  });
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
                          <h3 className="font-semibold text-lg">{campaign.title || `Campaign ${campaign.id}`}</h3>
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
                            const campaignName = campaign.title || `Campaign ${campaign.id}`;
                            const hasConversation = campaign.conversation_id !== undefined && campaign.conversation_id !== null;

                            // Find conversation title from existing conversations state
                            let conversationTitle: string | null = null;
                            if (hasConversation && campaign.conversation_id) {
                              const associatedConversation = conversations.find(c => c.id === campaign.conversation_id);
                              conversationTitle = associatedConversation?.title || `Conversation #${campaign.conversation_id}`;
                            }

                            setDeleteCampaignDialog({
                              open: true,
                              campaignId: campaign.id,
                              campaignName,
                              conversationTitle,
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
                    onClick={() => navigate('/')}
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
                          <h3 className="font-semibold text-lg">{conversation.title ? conversation.title.replace(/^'|'$/g, '') : `Conversation #${conversation.id}`}</h3>
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
                        <Button
                          variant="destructive"
                          size="sm"
                          className="!shadow-none hover:!shadow-none hover:bg-destructive/80 active:scale-95 transition-all"
                          onClick={(e) => {
                            e.stopPropagation();
                            const conversationTitle = conversation.title || `Conversation #${conversation.id}`;
                            const hasCampaign = conversation.has_campaign || false;

                            // Find campaign name from existing campaigns state or cache (synchronously)
                            let campaignName: string | null = null;
                            if (hasCampaign) {
                              // First check in current campaigns state
                              let associatedCampaign = campaigns.find(c => c.conversation_id === conversation.id);

                              // If not found in state, check cache
                              if (!associatedCampaign) {
                                const cachedCampaigns = readCache<Array<any>>(CACHE_KEYS.CAMPAIGNS);
                                if (cachedCampaigns) {
                                  associatedCampaign = cachedCampaigns.find((c: any) => c.conversation_id === conversation.id);
                                }
                              }

                              if (associatedCampaign) {
                                // Handle both title and name properties from cache
                                campaignName = (associatedCampaign as any).title || (associatedCampaign as any).name || `Campaign ${associatedCampaign.id}`;
                              }
                            }

                            // Open modal immediately with cached data
                            setDeleteConversationDialog({
                              open: true,
                              conversationId: conversation.id,
                              conversationTitle,
                              campaignName,
                            });
                          }}
                        >
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
        activeConversationId={activeConversationId}
        onTabChange={setActiveTab}
        onLogout={onLogout}
        onCollapsedChange={setIsSidebarCollapsed}
        conversations={sidebarConversations}
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

      {/* Delete Campaign Dialog */}
      <Dialog open={deleteCampaignDialog.open} onOpenChange={(open) => setDeleteCampaignDialog({ ...deleteCampaignDialog, open })}>
        <DialogContent className="max-w-2xl w-[90%] sm:w-[600px]">
          <DialogHeader>
            <DialogTitle className="text-2xl">Delete Campaign</DialogTitle>
            <DialogDescription className="text-base">
              Are you sure you want to delete "{deleteCampaignDialog.campaignName}"?
              {deleteCampaignDialog.conversationTitle && (
                <span className="block mt-4 font-medium text-lg text-destructive">
                  ⚠️ The associated conversation "{deleteCampaignDialog.conversationTitle}" will also be deleted. This action cannot be undone.
                </span>
              )}
              {!deleteCampaignDialog.conversationTitle && (
                <span className="block mt-4">This action cannot be undone.</span>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-3">
            <Button
              variant="outline"
              size="lg"
              onClick={() => setDeleteCampaignDialog({ ...deleteCampaignDialog, open: false })}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="lg"
              onClick={async () => {
                if (!deleteCampaignDialog.campaignId) return;

                // Store the campaign data for potential restoration
                const campaignToDelete = campaigns.find(c => c.id === deleteCampaignDialog.campaignId);
                const campaignId = deleteCampaignDialog.campaignId;
                const campaignName = deleteCampaignDialog.campaignName;

                // Close modal immediately
                setDeleteCampaignDialog({ open: false, campaignId: null, campaignName: "", conversationTitle: null });

                // Mark as pending deletion
                pendingDeletedCampaigns.current.add(campaignId);

                // Optimistically remove campaign from UI
                setCampaigns(prevCampaigns => {
                  const updated = prevCampaigns.filter(c => c.id !== campaignId);
                  writeCache(CACHE_KEYS.CAMPAIGNS, updated);
                  return updated;
                });

                // Also optimistically remove the associated conversation from UI
                if (campaignToDelete?.conversation_id) {
                  // Mark as pending deletion
                  pendingDeletedConversations.current.add(campaignToDelete.conversation_id);

                  setConversations(prevConversations => {
                    const updated = prevConversations.filter(c => c.id !== campaignToDelete.conversation_id);
                    writeCache(CACHE_KEYS.CONVERSATIONS_PAGE, updated);
                    return updated;
                  });
                }

                // Perform deletion in background
                try {
                  await apiClient.delete(`/api/campaigns/${campaignId}`);

                  // Remove from pending deletions (API confirmed)
                  pendingDeletedCampaigns.current.delete(campaignId);
                  if (campaignToDelete?.conversation_id) {
                    pendingDeletedConversations.current.delete(campaignToDelete.conversation_id);
                  }

                  // After successful deletion, refresh sidebar to sync with server
                  fetchSidebarCampaigns({ silent: true });
                  if (campaignToDelete?.conversation_id) {
                    fetchSidebarConversations({ silent: true });
                  }

                  toast.success(`Campaign "${campaignName}" deleted successfully`);
                } catch (err: any) {
                  // Remove from pending deletions (deletion failed)
                  pendingDeletedCampaigns.current.delete(campaignId);
                  if (campaignToDelete?.conversation_id) {
                    pendingDeletedConversations.current.delete(campaignToDelete.conversation_id);
                  }

                  // Restore campaign on error
                  if (campaignToDelete) {
                    setCampaigns(prevCampaigns => {
                      const restored = [...prevCampaigns, campaignToDelete];
                      writeCache(CACHE_KEYS.CAMPAIGNS, restored);
                      return restored;
                    });
                    fetchSidebarCampaigns({ silent: true });
                  }

                  // Restore conversation on error
                  if (campaignToDelete?.conversation_id) {
                    const associatedConversation = conversations.find(c => c.id === campaignToDelete.conversation_id);
                    if (!associatedConversation) {
                      // Need to fetch it back or restore from cache
                      fetchSidebarConversations({ silent: true });
                    }
                  }

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
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Conversation Dialog */}
      <Dialog open={deleteConversationDialog.open} onOpenChange={(open) => setDeleteConversationDialog({ ...deleteConversationDialog, open })}>
        <DialogContent className="max-w-2xl w-[90%] sm:w-[600px]">
          <DialogHeader>
            <DialogTitle className="text-2xl">Delete Conversation</DialogTitle>
            <DialogDescription className="text-base">
              Are you sure you want to delete "{deleteConversationDialog.conversationTitle}"?
              {deleteConversationDialog.campaignName && (
                <span className="block mt-4 font-medium text-lg text-destructive">
                  ⚠️ The associated campaign "{deleteConversationDialog.campaignName}" will also be deleted. This action cannot be undone.
                </span>
              )}
              {!deleteConversationDialog.campaignName && (
                <span className="block mt-4">This action cannot be undone.</span>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-3">
            <Button
              variant="outline"
              size="lg"
              onClick={() => setDeleteConversationDialog({ ...deleteConversationDialog, open: false })}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="lg"
              onClick={async () => {
                if (!deleteConversationDialog.conversationId) return;

                // Store the conversation data for potential restoration
                const conversationToDelete = conversations.find(c => c.id === deleteConversationDialog.conversationId);
                const conversationId = deleteConversationDialog.conversationId;
                const conversationTitle = deleteConversationDialog.conversationTitle;

                // Close modal immediately
                setDeleteConversationDialog({ open: false, conversationId: null, conversationTitle: "", campaignName: null });

                // Mark as pending deletion
                pendingDeletedConversations.current.add(conversationId);

                // Optimistically remove conversation from UI
                setConversations(prevConversations => {
                  const updated = prevConversations.filter(c => c.id !== conversationId);
                  writeCache(CACHE_KEYS.CONVERSATIONS_PAGE, updated);
                  return updated;
                });

                // Store associated campaign for potential restoration
                const associatedCampaign = campaigns.find(c => c.conversation_id === conversationId);

                // Optimistically remove the associated campaign from UI
                if (associatedCampaign) {
                  // Mark as pending deletion
                  pendingDeletedCampaigns.current.add(associatedCampaign.id);

                  setCampaigns(prevCampaigns => {
                    const updated = prevCampaigns.filter(c => c.id !== associatedCampaign.id);
                    writeCache(CACHE_KEYS.CAMPAIGNS, updated);
                    return updated;
                  });
                }

                // Perform deletion in background
                try {
                  await apiClient.delete(`/api/conversations/${conversationId}`);

                  // Remove from pending deletions (API confirmed)
                  pendingDeletedConversations.current.delete(conversationId);
                  if (associatedCampaign) {
                    pendingDeletedCampaigns.current.delete(associatedCampaign.id);
                  }

                  // After successful deletion, refresh sidebar to sync with server
                  sidebarRef.current?.refreshConversations({ silent: true });
                  if (associatedCampaign) {
                    sidebarRef.current?.refreshCampaigns({ silent: true });
                  }

                  toast.success(`Conversation "${conversationTitle}" deleted successfully`);
                } catch (err: any) {
                  // Remove from pending deletions (deletion failed)
                  pendingDeletedConversations.current.delete(conversationId);
                  if (associatedCampaign) {
                    pendingDeletedCampaigns.current.delete(associatedCampaign.id);
                  }

                  // Restore conversation on error
                  if (conversationToDelete) {
                    setConversations(prevConversations => {
                      const restored = [...prevConversations, conversationToDelete];
                      writeCache(CACHE_KEYS.CONVERSATIONS_PAGE, restored);
                      return restored;
                    });
                    fetchSidebarConversations({ silent: true });
                  }

                  // Restore campaign on error
                  if (associatedCampaign) {
                    setCampaigns(prevCampaigns => {
                      const restored = [...prevCampaigns, associatedCampaign];
                      writeCache(CACHE_KEYS.CAMPAIGNS, restored);
                      return restored;
                    });
                    fetchSidebarCampaigns({ silent: true });
                  }

                  let errorMessage = 'Failed to delete conversation';
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
                        errorMessage = err.message || 'Failed to delete conversation';
                    }
                  } else {
                    errorMessage = err?.message || 'Failed to delete conversation';
                  }
                  toast.error(errorMessage);
                }
              }}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Index;