import { useEffect, useState, useImperativeHandle, forwardRef } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ThemeToggle } from "@/components/ThemeToggle";
import { 
  MessageSquare, 
  Users, 
  BarChart3, 
  Settings,
  Zap,
  Target,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  History,
  LogOut
} from "lucide-react";
import apiClient, { NetworkError } from "@/lib/api";
import { readCache, writeCache, CACHE_KEYS } from "@/lib/cache";

interface SidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  onLogout: () => void;
  onCollapsedChange?: (collapsed: boolean) => void;
  onSelectConversation?: (conversationId: number) => void;
  onSelectCampaign?: (campaignId: number) => void;
}

export interface SidebarRef {
  refreshConversations: (options?: { silent?: boolean }) => Promise<void>;
  refreshCampaigns: (options?: { silent?: boolean }) => Promise<void>;
}

type ConversationItem = {
  id: number;
  title?: string | null;
  last_message?: string | null;
  updated_at?: string | null;
  created_at?: string | null;
};

export const Sidebar = forwardRef<SidebarRef, SidebarProps>(({ activeTab, onTabChange, onLogout, onCollapsedChange, onSelectConversation, onSelectCampaign }, ref) => {
  const navigate = useNavigate();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isLoadingChats, setIsLoadingChats] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const [conversations, setConversations] = useState<ConversationItem[]>(() => readCache<ConversationItem[]>(CACHE_KEYS.CONVERSATIONS) || []);
  const [isLoadingCampaigns, setIsLoadingCampaigns] = useState(false);
  const [campaignError, setCampaignError] = useState<string | null>(null);
  const [campaigns, setCampaigns] = useState<Array<{
    id: number;
    name?: string;
    status?: string;
    created_at?: string;
    tone?: string;
    leads?: Array<any>;
  }>>(
    () => {
      const cached = readCache<Array<any>>(CACHE_KEYS.CAMPAIGNS);
      if (!cached) return [];
      // Handle both old format (id, name) and new format (full campaign data)
      return cached.map((item: any) => ({
        id: item.id,
        name: item.name || `Campaign ${item.id}`,
        status: item.status,
        created_at: item.created_at,
        tone: item.tone,
        leads: item.leads || [],
      }));
    }
  );

  const handleCollapse = () => {
    const newCollapsed = !isCollapsed;
    setIsCollapsed(newCollapsed);
    onCollapsedChange?.(newCollapsed);
  };

  const navItems = [
    { id: 'chat', label: 'AI Chat', icon: MessageSquare, path: '/' },
    { id: 'conversations', label: 'Conversations', icon: History, path: '/conversations' },
    { id: 'campaigns', label: 'Campaigns', icon: Target, path: '/campaigns' },
    { id: 'analytics', label: 'Analytics', icon: BarChart3, path: '/analytics' },
    { id: 'settings', label: 'Settings', icon: Settings, path: '/settings' },
    // { id: 'campaign-builder', label: 'Campaign Builder', icon: Target, path: '/campaign-builder' },
  ];

  // Function to fetch conversations
  const fetchConversations = async (options?: { silent?: boolean }) => {
    const silent = options?.silent === true;
    if (!silent) setIsLoadingChats(true);
    setChatError(null);
    try {
      const data = await apiClient.get<any>(`/api/conversations/?load_messages=false`);
      // Normalize possible shapes: array of objects, array of strings, or object with "items"
      let items: ConversationItem[] = [];
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
        // Some APIs may return a plain string; treat as a single conversation
        items = [{ id: 1, title: data, last_message: null, updated_at: null, created_at: null }];
      }
      setConversations(items);
      writeCache(CACHE_KEYS.CONVERSATIONS, items);
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
      
      setChatError(errorMessage);
    } finally {
      if (!silent) setIsLoadingChats(false);
    }
  };

  // Function to fetch campaigns
  const fetchCampaigns = async (options?: { silent?: boolean }) => {
    const silent = options?.silent === true;
    if (!silent) setIsLoadingCampaigns(true);
    setCampaignError(null);
    try {
      const data = await apiClient.get<any>(`/api/campaigns/?load_leads=false&load_email_sequence=false`);
      let items: Array<{
        id: number;
        name?: string;
        status?: string;
        created_at?: string;
        tone?: string;
        leads?: Array<any>;
      }> = [];
      if (Array.isArray(data)) {
        items = data.map((it: any, idx: number) => ({
          id: Number(it?.id ?? idx + 1),
          name: it?.name || `Campaign ${it?.id ?? idx + 1}`,
          status: it?.status || 'draft',
          created_at: it?.created_at,
          tone: it?.tone,
          leads: it?.leads || [],
        }));
      } else if (data && Array.isArray((data as any).items)) {
        items = (data as any).items.map((it: any, idx: number) => ({
          id: Number(it?.id ?? idx + 1),
          name: it?.name || `Campaign ${it?.id ?? idx + 1}`,
          status: it?.status || 'draft',
          created_at: it?.created_at,
          tone: it?.tone,
          leads: it?.leads || [],
        }));
      } else if (typeof data === 'string') {
        items = [{ id: 1, name: data }];
      }
      setCampaigns(items);
      writeCache(CACHE_KEYS.CAMPAIGNS, items);
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
      
      setCampaignError(errorMessage);
    } finally {
      if (!silent) setIsLoadingCampaigns(false);
    }
  };

  // Fetch conversations for the sidebar list
  useEffect(() => {
    fetchConversations();
  }, []);

  // Fetch campaigns for the sidebar list
  useEffect(() => {
    fetchCampaigns();
  }, []);

  // Periodic refresh every 5 minutes
  useEffect(() => {
    const interval = setInterval(() => {
      fetchConversations({ silent: true });
      fetchCampaigns({ silent: true });
    }, 5 * 60 * 1000); // 5 minutes

    return () => clearInterval(interval);
  }, []);

  // Refresh on window focus
  useEffect(() => {
    const handleFocus = () => {
      fetchConversations({ silent: true });
      fetchCampaigns({ silent: true });
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
        fetchConversations({ silent: true });
      }
      if (type === 'campaigns' || type === 'all') {
        fetchCampaigns({ silent: true });
      }
    };

    window.addEventListener('cache-invalidate', handleCacheInvalidate);
    return () => window.removeEventListener('cache-invalidate', handleCacheInvalidate);
  }, []);

  // Expose refresh functions to parent component
  useImperativeHandle(ref, () => ({
    refreshConversations: (options?: { silent?: boolean }) => fetchConversations(options),
    refreshCampaigns: (options?: { silent?: boolean }) => fetchCampaigns(options)
  }), []);

  return (
    <Card className={`h-screen bg-gradient-card border-r transition-all duration-300 ${
      isCollapsed ? 'w-16' : 'w-64'
    } flex flex-col shadow-medium fixed left-0 top-0 z-50`}>
      {/* Header */}
      <div className={`border-b border-border/50 ${isCollapsed ? 'p-2' : 'p-6'}`}>
        {!isCollapsed && (
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-primary rounded-lg flex items-center justify-center shadow-glow">
                <Zap className="w-4 h-4 text-primary-foreground" />
              </div>
              <h1 className="text-xl font-bold text-foreground">
                CampAIgn
              </h1>
            </div>
            <ThemeToggle />
          </div>
        )}
        {isCollapsed && (
          <div className="flex flex-col items-center space-y-2">
            <div className="w-8 h-8 bg-gradient-primary rounded-lg flex items-center justify-center shadow-glow">
              <Zap className="w-4 h-4 text-primary-foreground" />
            </div>
            <ThemeToggle />
          </div>
        )}
        <Button
          variant="ghost"
          size="sm"
          className={`absolute -right-3 h-6 w-6 rounded-full border bg-card shadow-soft ${
            isCollapsed ? 'top-2' : 'top-6'
          }`}
          onClick={handleCollapse}
        >
          {isCollapsed ? (
            <ChevronRight className="w-3 h-3" />
          ) : (
            <ChevronLeft className="w-3 h-3" />
          )}

        </Button>
      </div>

      {/* Navigation */}
      <nav className={`flex-1 space-y-2 ${isCollapsed ? 'p-2' : 'p-4'} overflow-y-auto`}> 
        {navItems.map((item) => (
          <Button
            key={item.id}
            variant={activeTab === item.id ? "default" : "ghost"}
            className={`w-full justify-start space-x-3 h-11 transition-smooth ${
              activeTab === item.id 
                ? 'bg-gradient-primary shadow-soft text-primary-foreground' 
                : 'hover:bg-muted/50'
            }`}
            onClick={() => {
              navigate(item.path);
              onTabChange(item.id);
            }}
          >
            <item.icon className="w-4 h-4" />
            {!isCollapsed && (
              <span className="flex-1 text-left">{item.label}</span>
            )}
          </Button>
        ))}
      </nav>

      {/* Footer */}
      {!isCollapsed && (
        <div className="p-4 border-t border-border/50">
          <Button 
            variant="outline" 
            className="w-full justify-start space-x-3 h-11 text-destructive hover:text-destructive hover:bg-destructive/10"
            onClick={onLogout}
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </Button>
        </div>
      )}
      
      {/* Collapsed Footer */}
      {isCollapsed && (
        <div className="p-2 border-t border-border/50">
          <Button 
            variant="ghost" 
            size="sm"
            className="w-full h-11 text-destructive hover:text-destructive hover:bg-destructive/10"
            onClick={onLogout}
          >
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      )}
    </Card>
  );
});
