import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  TrendingUp, 
  Users, 
  Mail, 
  Target,
  Activity,
  Clock,
  CheckCircle,
  AlertCircle,
  ArrowUpRight,
  BarChart3,
  MessageSquare,
  Plus
} from "lucide-react";

export const Dashboard = () => {
  const stats = [
    { 
      title: "Active Campaigns", 
      value: "12", 
      change: "+3 from last month", 
      positive: true,
      icon: Target,
      color: "text-primary"
    },
    { 
      title: "Email Responses", 
      value: "847", 
      change: "+12% this week", 
      positive: true,
      icon: Mail,
      color: "text-success"
    },
    { 
      title: "Personas Created", 
      value: "8", 
      change: "+2 new", 
      positive: true,
      icon: Users,
      color: "text-warning"
    },
    { 
      title: "Conversion Rate", 
      value: "24.8%", 
      change: "+5.2% vs average", 
      positive: true,
      icon: TrendingUp,
      color: "text-primary"
    }
  ];

  const recentCampaigns = [
    {
      id: 1,
      name: "Q4 SaaS Growth Campaign",
      status: "active",
      persona: "CTO",
      tone: "medium",
      responses: 127,
      sent: 500,
      created: "2024-01-15"
    },
    {
      id: 2,
      name: "Enterprise Security Outreach",
      status: "draft",
      persona: "Enterprise Executive",
      tone: "hard",
      responses: 0,
      sent: 0,
      created: "2024-01-14"
    },
    {
      id: 3,
      name: "Startup Founder Referral",
      status: "completed",
      persona: "Startup Founder",
      tone: "referral",
      responses: 89,
      sent: 250,
      created: "2024-01-10"
    }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-success text-success-foreground';
      case 'draft': return 'bg-warning text-warning-foreground';
      case 'completed': return 'bg-muted text-muted-foreground';
      default: return 'bg-muted text-muted-foreground';
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
        <div className="flex items-center space-x-3">
          <Button variant="outline">
            <BarChart3 className="w-4 h-4 mr-2" />
            View Analytics
          </Button>
          <Button variant="default">
            <Plus className="w-4 h-4 mr-2" />
            New Campaign
          </Button>
        </div>
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
                  stat.positive ? 'text-success' : 'text-destructive'
                }`}>
                  <TrendingUp className="w-3 h-3 mr-1" />
                  {stat.change}
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
            <Button variant="ghost" size="sm">
              View All
              <ArrowUpRight className="w-3 h-3 ml-1" />
            </Button>
          </div>
          
          <div className="space-y-4">
            {recentCampaigns.map((campaign) => (
              <div key={campaign.id} className="flex items-center justify-between p-4 border border-border/50 rounded-lg hover:bg-muted/20 transition-smooth">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <h3 className="font-medium">{campaign.name}</h3>
                    <Badge className={getStatusColor(campaign.status)} variant="secondary">
                      {campaign.status}
                    </Badge>
                  </div>
                  <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                    <span>Persona: {campaign.persona}</span>
                    <span>Tone: {campaign.tone}</span>
                    <span>Created: {new Date(campaign.created).toLocaleDateString()}</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium">
                    {campaign.responses} responses
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {campaign.sent} sent
                  </div>
                  {campaign.sent > 0 && (
                    <div className="w-20 mt-2">
                      <Progress value={(campaign.responses / campaign.sent) * 100} className="h-1" />
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Quick Actions & Activity */}
        <div className="space-y-6">
          {/* Quick Actions */}
          <Card className="p-6 bg-gradient-card shadow-soft">
            <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
            <div className="space-y-3">
              <Button variant="outline" className="w-full justify-start">
                <MessageSquare className="w-4 h-4 mr-3" />
                Start AI Chat
              </Button>
              <Button variant="outline" className="w-full justify-start">
                <Users className="w-4 h-4 mr-3" />
                Create Persona
              </Button>
              <Button variant="outline" className="w-full justify-start">
                <Target className="w-4 h-4 mr-3" />
                New Campaign
              </Button>
              <Button variant="outline" className="w-full justify-start">
                <Activity className="w-4 h-4 mr-3" />
                View Analytics
              </Button>
            </div>
          </Card>

          {/* Recent Activity */}
          <Card className="p-6 bg-gradient-card shadow-soft">
            <h2 className="text-xl font-semibold mb-4">Recent Activity</h2>
            <div className="space-y-4">
              <div className="flex items-start space-x-3">
                <div className="w-2 h-2 bg-success rounded-full mt-2" />
                <div className="flex-1">
                  <p className="text-sm">Campaign "Q4 Growth" received 15 new responses</p>
                  <p className="text-xs text-muted-foreground">2 hours ago</p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <div className="w-2 h-2 bg-primary rounded-full mt-2" />
                <div className="flex-1">
                  <p className="text-sm">New persona "Enterprise CTO" created</p>
                  <p className="text-xs text-muted-foreground">4 hours ago</p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <div className="w-2 h-2 bg-warning rounded-full mt-2" />
                <div className="flex-1">
                  <p className="text-sm">Campaign draft "Security Outreach" saved</p>
                  <p className="text-xs text-muted-foreground">1 day ago</p>
                </div>
              </div>
            </div>
          </Card>

          {/* Usage Stats */}
          <Card className="p-6 bg-gradient-card shadow-soft">
            <h2 className="text-xl font-semibold mb-4">Usage This Month</h2>
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm">AI Credits</span>
                  <span className="text-sm font-medium">247 / 500</span>
                </div>
                <Progress value={49.4} className="h-2" />
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm">Emails Sent</span>
                  <span className="text-sm font-medium">1,247 / 2,000</span>
                </div>
                <Progress value={62.35} className="h-2" />
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm">API Calls</span>
                  <span className="text-sm font-medium">3,890 / 10,000</span>
                </div>
                <Progress value={38.9} className="h-2" />
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