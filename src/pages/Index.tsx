import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Sidebar, SidebarRef } from "@/components/Sidebar";
import { Dashboard } from "@/components/Dashboard";
import { ChatInterface } from "@/components/ChatInterface";
import { CampaignBuilder } from "@/components/CampaignBuilder";
import { Settings } from "@/components/Settings";
import { useNavigate, useParams, useLocation, useLoaderData } from "react-router-dom";
import { ConversationLoaderData } from "@/lib/loaders";

interface IndexProps {
  onLogout: () => void;
  freshLogin: boolean;
}

const Index = ({ onLogout, freshLogin }: IndexProps) => {
  const sidebarRef = useRef<SidebarRef>(null);
  const location = useLocation();
  const navigate = useNavigate();
  
  // Get loader data if available (for conversation routes)
  const loaderData = useLoaderData() as ConversationLoaderData | undefined;
  
  // Determine active tab from URL
  const getActiveTabFromPath = (pathname: string) => {
    if (pathname === '/') return 'chat';
    if (pathname.startsWith('/conversations/')) return 'chat';
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
    // Use loader data if available, otherwise fall back to localStorage
    if (loaderData?.id) {
      return loaderData.id;
    }
    try {
      const saved = localStorage.getItem('neel-taylor-conversation-id');
      return saved ? Number(saved) : null;
    } catch {
      return null;
    }
  });
  const params = useParams();

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
    // Use loader data if available, otherwise use URL param
    const conversationId = loaderData?.id || urlId;
    
    if (conversationId !== activeConversationId) {
      setActiveConversationId(conversationId);
      if (conversationId) {
        try { localStorage.setItem('neel-taylor-conversation-id', String(conversationId)); } catch {}
      } else {
        try { localStorage.removeItem('neel-taylor-conversation-id'); } catch {}
      }
    }
  }, [params.id, activeConversationId, loaderData?.id]);

  const renderContent = () => {
    switch (activeTab) {
      case 'chat':
        return <ChatInterface key={activeConversationId ?? 'new'} freshLogin={freshLogin} isSidebarCollapsed={isSidebarCollapsed} initialConversationId={activeConversationId} onConversationIdChange={(id) => {
          setActiveConversationId(id);
          // Refresh sidebar conversations when a new conversation is created
          if (id) {
            sidebarRef.current?.refreshConversations({ silent: true });
            navigate(`/conversations/${id}`);
          }
        }} />;
      case 'campaigns':
        return <CampaignBuilder />;
      case 'analytics':
        return <Dashboard />;
      case 'settings':
        return <Settings />;
      case 'conversations':
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
            
            <div className="grid gap-4">
              {[
                {
                  id: 1,
                  title: "Campaign Strategy for SaaS Product",
                  lastMessage: "Create a nurture sequence for trial users",
                  timestamp: "30 minutes ago",
                  status: "active",
                  messageCount: 12,
                  persona: "CTO",
                  tone: "medium",
                  tags: ["email", "saas", "nurture"]
                },
                {
                  id: 2,
                  title: "Email Marketing for E-commerce",
                  lastMessage: "Generate product recommendation emails",
                  timestamp: "2 hours ago",
                  status: "completed",
                  messageCount: 8,
                  persona: "CMO",
                  tone: "soft",
                  tags: ["email", "ecommerce", "recommendations"]
                },
                {
                  id: 3,
                  title: "Lead Generation Campaign",
                  lastMessage: "Target CTOs in tech startups",
                  timestamp: "1 day ago",
                  status: "completed",
                  messageCount: 15,
                  persona: "CTO",
                  tone: "hard",
                  tags: ["lead-gen", "b2b", "tech"]
                },
                {
                  id: 4,
                  title: "Content Marketing Strategy",
                  lastMessage: "Blog post ideas for Q1",
                  timestamp: "3 days ago",
                  status: "archived",
                  messageCount: 6,
                  persona: "Startup Founder",
                  tone: "referral",
                  tags: ["content", "blog", "strategy"]
                },
                {
                  id: 5,
                  title: "Social Media Campaign Planning",
                  lastMessage: "LinkedIn engagement strategy for enterprise clients",
                  timestamp: "1 week ago",
                  status: "completed",
                  messageCount: 10,
                  persona: "Enterprise Executive",
                  tone: "medium",
                  tags: ["social", "linkedin", "enterprise"]
                },
                {
                  id: 6,
                  title: "Product Launch Campaign",
                  lastMessage: "Multi-channel launch strategy for mobile app",
                  timestamp: "2 weeks ago",
                  status: "archived",
                  messageCount: 20,
                  persona: "CMO",
                  tone: "hard",
                  tags: ["launch", "mobile", "multi-channel"]
                }
              ].map((conversation) => (
                <div key={conversation.id} className="p-6 border rounded-lg hover:bg-muted/50 cursor-pointer transition-smooth bg-gradient-card shadow-soft">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className="font-semibold text-lg">{conversation.title}</h3>
                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                          conversation.status === 'active' 
                            ? 'bg-green-100 text-green-700 border border-green-200' 
                            : conversation.status === 'completed'
                            ? 'bg-blue-100 text-blue-700 border border-blue-200'
                            : 'bg-gray-100 text-gray-700 border border-gray-200'
                        }`}>
                          {conversation.status}
                        </span>
                      </div>
                      <p className="text-muted-foreground mb-3">{conversation.lastMessage}</p>
                      
                      <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                        <span className="flex items-center">
                          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                          </svg>
                          {conversation.messageCount} messages
                        </span>
                        <span className="flex items-center">
                          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                          {conversation.persona}
                        </span>
                        <span className="flex items-center">
                          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4V2a1 1 0 011-1h8a1 1 0 011 1v2h4a1 1 0 011 1v1a1 1 0 01-1 1H3a1 1 0 01-1-1V5a1 1 0 011-1h4z" />
                          </svg>
                          {conversation.tone} tone
                        </span>
                        <span className="flex items-center">
                          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          {conversation.timestamp}
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2 ml-4">
                      <Button variant="ghost" size="sm" onClick={(e) => e.stopPropagation()}>
                        Continue
                      </Button>
                      <Button variant="ghost" size="sm" onClick={(e) => e.stopPropagation()}>
                        Export
                      </Button>
                      <Button variant="ghost" size="sm" onClick={(e) => e.stopPropagation()}>
                        Delete
                      </Button>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    {conversation.tags.map((tag) => (
                      <span key={tag} className="text-xs px-2 py-1 bg-primary/10 text-primary rounded-md">
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            
            {/* Empty State */}
            {false && (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium mb-2">No conversations yet</h3>
                <p className="text-muted-foreground mb-4">Start your first AI conversation to see it here</p>
                <Button>Start New Conversation</Button>
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
          try { localStorage.setItem('neel-taylor-conversation-id', String(id)); } catch {}
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
