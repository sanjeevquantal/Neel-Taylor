import * as React from "react";
import { useState, useImperativeHandle } from "react";
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
  ChevronDown,
  ChevronUp,
  History,
  LogOut
} from "lucide-react";

interface SidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  onLogout: () => void;
  onCollapsedChange?: (collapsed: boolean) => void;
  onSelectConversation?: (conversationId: number) => void;
  onSelectCampaign?: (campaignId: number) => void;
  conversations?: Array<{
    id: number;
    title?: string | null;
    last_message?: string | null;
    updated_at?: string | null;
    created_at?: string | null;
  }>;
  campaigns?: Array<{
    id: number;
    title?: string;
    status?: string;
    created_at?: string;
    tone?: string;
    leads?: Array<any>;
  }>;
  isLoadingConversations?: boolean;
  isLoadingCampaigns?: boolean;
  activeConversationId?: number | null;
}

export interface SidebarRef {
  refreshConversations: (options?: { silent?: boolean }) => Promise<void>;
  refreshCampaigns: (options?: { silent?: boolean }) => Promise<void>;
}

export const Sidebar = React.forwardRef<SidebarRef, SidebarProps>((props, ref) => {
  const {
  activeTab,
  onTabChange,
  onLogout,
  onCollapsedChange,
  activeConversationId,
  conversations = [],
  onSelectConversation,
  } = props;
  
  // Expose methods via ref
  useImperativeHandle(ref, () => ({
    refreshConversations: async (options?: { silent?: boolean }): Promise<void> => {
      // This will be implemented by the parent component
      return Promise.resolve();
    },
    refreshCampaigns: async (options?: { silent?: boolean }): Promise<void> => {
      // This will be implemented by the parent component
      return Promise.resolve();
    },
  }));
  
  const navigate = useNavigate();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isConversationsExpanded, setIsConversationsExpanded] = useState(true);

  const handleCollapse = () => {
    const newCollapsed = !isCollapsed;
    setIsCollapsed(newCollapsed);
    onCollapsedChange?.(newCollapsed);
  };

  const navItems = [
    { 
      id: 'chat', 
      label: 'New Chat', 
      icon: MessageSquare, 
      path: activeConversationId ? `/conversations/${activeConversationId}` : '/' 
    },
    { 
      id: 'conversations', 
      label: 'All Conversations', 
      icon: History, 
      path: '/conversations' 
    },
    { 
      id: 'campaigns', 
      label: 'Campaigns', 
      icon: Target, 
      path: '/campaigns' 
    },
    { 
      id: 'analytics', 
      label: 'Analytics', 
      icon: BarChart3, 
      path: '/analytics' 
    },
    { 
      id: 'settings', 
      label: 'Settings', 
      icon: Settings, 
      path: '/settings' 
    },
  ];

  // Get last 5 conversations sorted by updated_at or created_at
  const latestConversations = [...conversations]
    .sort((a, b) => {
      const dateA = a.updated_at || a.created_at || '';
      const dateB = b.updated_at || b.created_at || '';
      return new Date(dateB).getTime() - new Date(dateA).getTime();
    })
    .slice(0, 5);

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMs / 3600000);
      const diffDays = Math.floor(diffMs / 86400000);

      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      if (diffDays < 7) return `${diffDays}d ago`;
      return date.toLocaleDateString();
    } catch {
      return '';
    }
  };

  const cardClassName = `h-screen bg-gradient-card border-r transition-all duration-300 ${isCollapsed ? 'w-16' : 'w-64'} flex flex-col shadow-medium fixed left-0 top-0 z-50`;

  return (
    <Card className={cardClassName}>
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
          className={`absolute -right-3 h-6 w-6 rounded-full border bg-card shadow-soft ${isCollapsed ? 'top-2' : 'top-6'}`}
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
            className={`w-full justify-start space-x-3 h-11 transition-smooth ${activeTab === item.id ? 'bg-gradient-primary shadow-soft text-primary-foreground' : 'hover:bg-muted/50'}`}
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

        {/* Latest Conversations Section */}
        {!isCollapsed && latestConversations.length > 0 && (
          <div className="mt-6 pt-4 border-t border-border/50">
            <button
              onClick={() => setIsConversationsExpanded(!isConversationsExpanded)}
              className="w-full flex items-center justify-between px-1 mb-3 hover:bg-muted/20 rounded transition-smooth py-1 group"
            >
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Latest Conversations
              </h3>
              {isConversationsExpanded ? (
                <ChevronUp className="w-3.5 h-3.5 text-muted-foreground group-hover:text-foreground transition-colors" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5 text-muted-foreground group-hover:text-foreground transition-colors" />
              )}
            </button>
            {isConversationsExpanded && (
              <div className="space-y-1">
                {latestConversations.map((conversation) => (
                  <Button
                    key={conversation.id}
                    variant="ghost"
                    className={`w-full justify-start space-x-2 h-auto py-2 px-2 transition-smooth text-left ${activeConversationId === conversation.id ? 'bg-muted/50 text-foreground' : 'hover:bg-muted/30 text-muted-foreground'}`}
                    onClick={() => {
                      if (onSelectConversation) {
                        onSelectConversation(conversation.id);
                      } else {
                        navigate(`/conversations/${conversation.id}`);
                      }
                      onTabChange('chat');
                    }}
                  >
                    <MessageSquare className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">
                        {conversation.title || `Conversation ${conversation.id}`}
                      </div>
                      {conversation.last_message && (
                        <div className="text-xs text-muted-foreground truncate mt-0.5">
                          {conversation.last_message}
                        </div>
                      )}
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {formatDate(conversation.updated_at || conversation.created_at)}
                      </div>
                    </div>
                  </Button>
                ))}
              </div>
            )}
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
});

Sidebar.displayName = 'Sidebar';
