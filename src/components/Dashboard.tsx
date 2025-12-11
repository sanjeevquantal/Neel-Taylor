import { useState, useEffect, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  TrendingUp, 
  TrendingDown,
  Users, 
  Mail, 
  Target,
  Activity,
  ArrowUpRight,
  MessageSquare
  // BarChart3,
  // Plus
} from "lucide-react";
import apiClient, { NetworkError } from "@/lib/api";
import { useNavigate } from "react-router-dom";
import { readCache, writeCache, CACHE_KEYS } from "@/lib/cache";

interface DashboardStats {
  active_campaigns: number;
  active_campaigns_change: number;
  total_responses: number;
  responses_change: number;
  personas_created: number;
  personas_change: number;
  conversion_rate: number;
  conversion_rate_change: number;
  total_opens: number;
  total_bounces: number;
  avg_open_rate: number;
}

interface RecentCampaign {
  id: number;
  title: string;
  status: string;
  tone: string;
  created_at: string;
  sent_count: number;
  response_count: number;
  persona: string;
  open_count: number;
  bounce_count: number;
  reply_count: number;
}

interface RecentActivity {
  description: string;
  time_ago: string;
  type: "success" | "warning" | "info" | "error";
}

interface Usage {
  ai_credits_used: number;
  ai_credits_total: number;
  emails_sent: number;
  emails_limit: number;
}

interface DashboardData {
  stats: DashboardStats;
  recent_campaigns: RecentCampaign[];
  recent_activity: RecentActivity[];
  usage: Usage;
}

export const Dashboard = () => {
  const navigate = useNavigate();
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(() => 
    readCache<DashboardData>(CACHE_KEYS.DASHBOARD) || null
  );
  const [isLoading, setIsLoading] = useState(() => !dashboardData);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboardData = useCallback(async (options?: { silent?: boolean }) => {
    const silent = options?.silent === true;
    if (!silent) {
      setIsLoading(true);
    }
    setError(null);
    try {
      const data = await apiClient.get<DashboardData>("/api/dashboard");
      setDashboardData(data);
      writeCache(CACHE_KEYS.DASHBOARD, data);
    } catch (err: any) {
      let errorMessage = 'Failed to load dashboard data';
      
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
            errorMessage = err.message || 'Failed to load dashboard data';
        }
      } else {
        errorMessage = err?.message || 'Failed to load dashboard data';
      }
      
      if (!silent) {
        setError(errorMessage);
      }
    } finally {
      if (!silent) {
        setIsLoading(false);
      }
    }
  }, []);

  // Fetch dashboard data on mount (silent if cache exists)
  useEffect(() => {
    const cachedData = readCache<DashboardData>(CACHE_KEYS.DASHBOARD);
    if (cachedData) {
      // If we have cached data, fetch silently in the background
      fetchDashboardData({ silent: true });
    } else {
      // If no cache, fetch with loading indicator
      fetchDashboardData();
    }
  }, [fetchDashboardData]);

  // Periodic refresh every 5 minutes
  useEffect(() => {
    const interval = setInterval(() => {
      fetchDashboardData({ silent: true });
    }, 5 * 60 * 1000); // 5 minutes

    return () => clearInterval(interval);
  }, [fetchDashboardData]);

  // Refresh on window focus
  useEffect(() => {
    const handleFocus = () => {
      fetchDashboardData({ silent: true });
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [fetchDashboardData]);

  // Listen for cache invalidation events
  useEffect(() => {
    const handleCacheInvalidate = (event: Event) => {
      const customEvent = event as CustomEvent<{ type: 'conversations' | 'campaigns' | 'dashboard' | 'all' }>;
      const { type } = customEvent.detail || { type: 'all' };
      
      if (type === 'dashboard' || type === 'all') {
        fetchDashboardData({ silent: true });
      }
    };

    window.addEventListener('cache-invalidate', handleCacheInvalidate);
    return () => window.removeEventListener('cache-invalidate', handleCacheInvalidate);
  }, [fetchDashboardData]);

  const formatChange = (change: number, isPercentage: boolean = false): { text: string; positive: boolean } => {
    if (change === 0) {
      return { text: "No change", positive: true };
    }
    const sign = change > 0 ? "+" : "";
    const value = isPercentage ? `${sign}${change.toFixed(1)}%` : `${sign}${change}`;
    return { text: value, positive: change >= 0 };
  };

  const getActivityColor = (type: string) => {
    switch (type) {
      case 'success':
        return 'bg-success';
      case 'warning':
        return 'bg-warning';
      case 'info':
        return 'bg-primary';
      case 'error':
        return 'bg-destructive';
      default:
        return 'bg-muted-foreground';
    }
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <p className="text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <p className="text-destructive">{error}</p>
        </div>
      </div>
    );
  }

  if (!dashboardData) {
    return null;
  }

  const stats = [
    { 
      title: "Active Campaigns", 
      value: dashboardData.stats.active_campaigns.toString(), 
      change: formatChange(dashboardData.stats.active_campaigns_change),
      icon: Target,
      color: "text-primary"
    },
    { 
      title: "Total Responses", 
      value: dashboardData.stats.total_responses.toString(), 
      change: formatChange(dashboardData.stats.responses_change),
      icon: Mail,
      color: "text-success"
    },
    { 
      title: "Personas Created", 
      value: dashboardData.stats.personas_created.toString(), 
      change: formatChange(dashboardData.stats.personas_change),
      icon: Users,
      color: "text-warning"
    },
    { 
      title: "Conversion Rate", 
      value: `${dashboardData.stats.conversion_rate.toFixed(1)}%`, 
      change: formatChange(dashboardData.stats.conversion_rate_change, true),
      icon: TrendingUp,
      color: "text-primary"
    }
  ];

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'active': 
      case 'running':
        return 'bg-success text-success-foreground';
      case 'draft': 
        return 'bg-warning text-warning-foreground';
      case 'completed': 
      case 'finished':
        return 'bg-muted text-muted-foreground';
      case 'scheduled':
        return 'bg-yellow-100 text-yellow-700 border border-yellow-200';
      default: 
        return 'bg-muted text-muted-foreground';
    }
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString();
    } catch {
      return dateString;
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">Monitor your marketing automation performance</p>
        </div>
        {/* <div className="flex items-center space-x-3">
          <Button variant="outline" onClick={() => navigate('/campaigns')}>
            <BarChart3 className="w-4 h-4 mr-2" />
            View Campaigns
          </Button>
          <Button variant="default" onClick={() => navigate('/campaign-builder')}>
            <Plus className="w-4 h-4 mr-2" />
            New Campaign
          </Button>
        </div> */}
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <Card key={index} className="p-6 bg-gradient-card shadow-soft hover:shadow-medium transition-smooth">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">{stat.title}</p>
                <p className="text-2xl font-bold mt-1">{stat.value}</p>
                <p className={`text-xs mt-1 flex items-center ${
                  stat.change.positive ? 'text-success' : 'text-destructive'
                }`}>
                  {stat.change.positive ? (
                    <TrendingUp className="w-3 h-3 mr-1" />
                  ) : (
                    <TrendingDown className="w-3 h-3 mr-1" />
                  )}
                  {stat.change.text}
                </p>
              </div>
              <div className={`w-12 h-12 rounded-lg bg-muted/30 flex items-center justify-center ${stat.color}`}>
                <stat.icon className="w-6 h-6" />
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Campaigns */}
        <Card className="lg:col-span-2 p-6 bg-gradient-card shadow-soft">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold">Recent Campaigns</h2>
            <Button variant="ghost" size="sm" onClick={() => navigate('/campaigns')}>
              View All
              <ArrowUpRight className="w-3 h-3 ml-1" />
            </Button>
          </div>
          
          {dashboardData.recent_campaigns.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No recent campaigns</p>
            </div>
          ) : (
            <div className="space-y-4">
              {dashboardData.recent_campaigns.map((campaign) => (
                <div 
                  key={campaign.id} 
                  className="flex items-center justify-between p-4 border border-border/50 rounded-lg hover:bg-muted/20 transition-smooth cursor-pointer"
                  onClick={() => navigate(`/campaigns/${campaign.id}`)}
                >
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="font-medium">{campaign.title}</h3>
                      <Badge className={getStatusColor(campaign.status)} variant="secondary">
                        {campaign.status}
                      </Badge>
                    </div>
                    <div className="flex items-center flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                      <span>Persona: {campaign.persona}</span>
                      <span className="whitespace-nowrap">Tone: {campaign.tone}</span>
                      <span className="whitespace-nowrap">Created: {formatDate(campaign.created_at)}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium">
                      {campaign.response_count} responses
                    </div>
                    <div className="text-xs text-muted-foreground space-y-1">
                      <div>{campaign.sent_count} sent</div>
                      <div className="flex items-center justify-end gap-3 mt-1">
                        <span className="text-xs">{campaign.open_count} opens</span>
                        <span className="text-xs">{campaign.bounce_count} bounces</span>
                        <span className="text-xs">{campaign.reply_count} replies</span>
                      </div>
                    </div>
                    {campaign.sent_count > 0 && (
                      <div className="w-20 mt-2">
                        <Progress value={(campaign.response_count / campaign.sent_count) * 100} className="h-1" />
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Quick Actions & Activity */}
        <div className="space-y-6">
          {/* Quick Actions */}
          {/* <Card className="p-6 bg-gradient-card shadow-soft">
            <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
            <div className="space-y-3">
              <Button variant="outline" className="w-full justify-start" onClick={() => navigate('/')}>
                <MessageSquare className="w-4 h-4 mr-3" />
                Start AI Chat
              </Button>
              <Button variant="outline" className="w-full justify-start" onClick={() => navigate('/campaign-builder')}>
                <Users className="w-4 h-4 mr-3" />
                Create Persona
              </Button>
              <Button variant="outline" className="w-full justify-start" onClick={() => navigate('/campaign-builder')}>
                <Target className="w-4 h-4 mr-3" />
                New Campaign
              </Button>
              <Button variant="outline" className="w-full justify-start" onClick={() => navigate('/analytics')}>
                <Activity className="w-4 h-4 mr-3" />
                View Analytics
              </Button>
            </div>
          </Card> */}

          {/* Recent Activity */}
          <Card className="p-6 bg-gradient-card shadow-soft">
            <h2 className="text-xl font-semibold mb-4">Recent Activity</h2>
            {dashboardData.recent_activity.length === 0 ? (
              <div className="text-center py-4">
                <p className="text-sm text-muted-foreground">No recent activity</p>
              </div>
            ) : (
              <div className="space-y-4">
                {dashboardData.recent_activity.map((activity, index) => (
                  <div key={index} className="flex items-start space-x-3">
                    <div className={`w-2 h-2 ${getActivityColor(activity.type)} rounded-full mt-2`} />
                    <div className="flex-1">
                      <p className="text-sm">{activity.description}</p>
                      <p className="text-xs text-muted-foreground">{activity.time_ago}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Usage Stats */}
          <Card className="p-6 bg-gradient-card shadow-soft">
            <h2 className="text-xl font-semibold mb-4">Email Performance & Usage</h2>
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm">AI Credits</span>
                  <span className="text-sm font-medium">
                    {dashboardData.usage.ai_credits_used.toLocaleString()} / {dashboardData.usage.ai_credits_total.toLocaleString()}
                  </span>
                </div>
                <Progress 
                  value={(dashboardData.usage.ai_credits_used / dashboardData.usage.ai_credits_total) * 100} 
                  className="h-2" 
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm">Emails Sent</span>
                  <span className="text-sm font-medium">
                    {dashboardData.usage.emails_sent.toLocaleString()}
                  </span>
                </div>
              </div>
              <div className="pt-2 border-t border-border/50">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm">Total Opens</span>
                  <span className="text-sm font-medium">
                    {dashboardData.stats.total_opens.toLocaleString()}
                  </span>
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm">Total Bounces</span>
                  <span className="text-sm font-medium">
                    {dashboardData.stats.total_bounces.toLocaleString()}
                  </span>
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm">Avg Open Rate</span>
                  <span className="text-sm font-medium">
                    {dashboardData.stats.avg_open_rate.toFixed(1)}%
                  </span>
                </div>
              </div>
            </div>
            <Button variant="outline" className="w-full mt-4">
              Upgrade Plan
            </Button>
          </Card>
        </div>
      </div>
    </div>
  );
};