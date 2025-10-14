import { useEffect, useMemo, useState } from "react";
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
import apiClient from "@/lib/api";

interface SidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  onLogout: () => void;
  onCollapsedChange?: (collapsed: boolean) => void;
  onSelectConversation?: (conversationId: number) => void;
  onSelectCampaign?: (campaignId: number) => void;
}

type ConversationItem = {
  id: number;
  title?: string | null;
  last_message?: string | null;
  updated_at?: string | null;
  created_at?: string | null;
};

export const Sidebar = ({ activeTab, onTabChange, onLogout, onCollapsedChange, onSelectConversation, onSelectCampaign }: SidebarProps) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isLoadingChats, setIsLoadingChats] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [isLoadingCampaigns, setIsLoadingCampaigns] = useState(false);
  const [campaignError, setCampaignError] = useState<string | null>(null);
  const [campaigns, setCampaigns] = useState<Array<{ id: number; name: string }>>([]);

  const handleCollapse = () => {
    const newCollapsed = !isCollapsed;
    setIsCollapsed(newCollapsed);
    onCollapsedChange?.(newCollapsed);
  };

  const navItems = [
    { id: 'chat', label: 'AI Chat', icon: MessageSquare },
    { id: 'campaigns', label: 'Campaigns', icon: Target },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'settings', label: 'Settings', icon: Settings },
    { id: 'conversations', label: 'Conversations', icon: History },
  ];

  // Fetch conversations for the sidebar list
  useEffect(() => {
    const fetchConversations = async () => {
      setIsLoadingChats(true);
      setChatError(null);
      try {
        // Get user id from storage or default to 1
        let userId: number = 1;
        try {
          const stored = localStorage.getItem('campaigner-user-id');
          if (stored) userId = Number(stored) || 1;
          else localStorage.setItem('campaigner-user-id', String(userId));
        } catch {}

        const data = await apiClient.get<any>(`/users/${userId}/conversations`);
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
      } catch (err: any) {
        setChatError(err?.message || 'Failed to load conversations');
      } finally {
        setIsLoadingChats(false);
      }
    };

    // Only fetch when expanded to avoid wasted work on tiny sidebar
    fetchConversations();
    // Optionally could re-fetch on interval in future
  }, []);

  // Fetch user campaigns for the sidebar list
  useEffect(() => {
    const fetchCampaigns = async () => {
      setIsLoadingCampaigns(true);
      setCampaignError(null);
      try {
        let userId: number = 1;
        try {
          const stored = localStorage.getItem('campaigner-user-id');
          if (stored) userId = Number(stored) || 1;
          else localStorage.setItem('campaigner-user-id', String(userId));
        } catch {}

        const data = await apiClient.get<any>(`/users/${userId}/campaigns`);
        let items: Array<{ id: number; name: string }> = [];
        if (Array.isArray(data)) {
          items = data.map((it: any, idx: number) => ({
            id: Number(it?.id ?? idx + 1),
            name: String(it?.name ?? it?.title ?? `Campaign ${idx + 1}`),
          }));
        } else if (data && Array.isArray((data as any).items)) {
          items = (data as any).items.map((it: any, idx: number) => ({
            id: Number(it?.id ?? idx + 1),
            name: String(it?.name ?? it?.title ?? `Campaign ${idx + 1}`),
          }));
        } else if (typeof data === 'string') {
          items = [{ id: 1, name: data }];
        }
        setCampaigns(items);
      } catch (err: any) {
        setCampaignError(err?.message || 'Failed to load campaigns');
      } finally {
        setIsLoadingCampaigns(false);
      }
    };

    fetchCampaigns();
  }, []);

  const sortedConversations = useMemo(() => {
    const parseDate = (v?: string | null) => (v ? new Date(v).getTime() : 0);
    return [...conversations].sort((a, b) => {
      const aTime = parseDate(a.updated_at) || parseDate(a.created_at) || a.id;
      const bTime = parseDate(b.updated_at) || parseDate(b.created_at) || b.id;
      return bTime - aTime; // latest first
    });
  }, [conversations]);

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
            onClick={() => onTabChange(item.id)}
          >
            <item.icon className="w-4 h-4" />
            {!isCollapsed && (
              <>
                <span className="flex-1 text-left">{item.label}</span>
                {item.badge && (
                  <Badge variant="secondary" className="text-xs px-2 py-0">
                    {item.badge}
                  </Badge>
                )}
              </>
            )}
          </Button>
        ))}

        {/* Chats list */}
        {!isCollapsed && (
          <div className="mt-6">
            <div className="text-xs uppercase tracking-wider text-muted-foreground px-2 mb-2">Chats</div>
            <div className="space-y-1 max-h-72 overflow-auto pr-1">
              {isLoadingChats && (
                <div className="text-xs text-muted-foreground px-2 py-1">Loading…</div>
              )}
              {chatError && (
                <div className="text-xs text-destructive px-2 py-1">{chatError}</div>
              )}
              {!isLoadingChats && !chatError && sortedConversations.map((c) => (
                <Button
                  key={c.id}
                  variant="ghost"
                  className="w-full justify-start h-9 text-left px-2"
                  onClick={() => {
                    onSelectConversation?.(c.id);
                    onTabChange('chat');
                  }}
                >
                  <span className="truncate">
                    {c.title?.trim() || `Conversation ${c.id}`}
                  </span>
                </Button>
              ))}
              {!isLoadingChats && !chatError && sortedConversations.length === 0 && (
                <div className="text-xs text-muted-foreground px-2 py-1">No chats yet</div>
              )}
            </div>
          </div>
        )}

        {/* Campaigns list */}
        {!isCollapsed && (
          <div className="mt-6">
            <div className="text-xs uppercase tracking-wider text-muted-foreground px-2 mb-2">Campaigns</div>
            <div className="space-y-1 max-h-72 overflow-auto pr-1">
              {isLoadingCampaigns && (
                <div className="text-xs text-muted-foreground px-2 py-1">Loading…</div>
              )}
              {campaignError && (
                <div className="text-xs text-destructive px-2 py-1">{campaignError}</div>
              )}
              {!isLoadingCampaigns && !campaignError && campaigns.map((c) => (
                <Button
                  key={c.id}
                  variant="ghost"
                  className="w-full justify-start h-9 text-left px-2"
                  onClick={() => {
                    onSelectCampaign?.(c.id);
                  }}
                >
                  <span className="truncate">
                    {c.name}
                  </span>
                </Button>
              ))}
              {!isLoadingCampaigns && !campaignError && campaigns.length === 0 && (
                <div className="text-xs text-muted-foreground px-2 py-1">No campaigns yet</div>
              )}
            </div>
          </div>
        )}
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
};
