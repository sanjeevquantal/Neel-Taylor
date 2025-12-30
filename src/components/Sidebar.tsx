import { useState, forwardRef } from "react";
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
}

export interface SidebarRef {
  refreshConversations: (options?: { silent?: boolean }) => Promise<void>;
  refreshCampaigns: (options?: { silent?: boolean }) => Promise<void>;
}

export const Sidebar = forwardRef<SidebarRef, SidebarProps>(({ 
  activeTab, 
  onTabChange, 
  onLogout, 
  onCollapsedChange,
}, ref) => {
  const navigate = useNavigate();
  const [isCollapsed, setIsCollapsed] = useState(false);

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
