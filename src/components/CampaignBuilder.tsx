import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { 
  Target, 
  Users, 
  Mail, 
  MessageSquare,
  Calendar,
  BarChart3,
  Send,
  Save,
  Eye,
  Play,
  Pause,
  Settings
} from "lucide-react";
import apiClient from "@/lib/api";

interface CampaignBuilderProps {
  selectedCampaignId?: number | null;
}

export const CampaignBuilder = ({ selectedCampaignId }: CampaignBuilderProps) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [campaignData, setCampaignData] = useState({
    name: '',
    type: 'email',
    persona: '',
    tone: 'medium',
    subject: '',
    content: '',
    schedule: 'immediate',
    scheduledDate: '',
    targetCount: 0
  });
  const [loadingSelected, setLoadingSelected] = useState(false);
  const [selectedError, setSelectedError] = useState<string | null>(null);

  // Load selected campaign details when an id is provided
  useEffect(() => {
    const loadSelected = async () => {
      if (!selectedCampaignId) return;
      setLoadingSelected(true);
      setSelectedError(null);
      try {
        const data = await apiClient.get<any>(`/campaigns/${selectedCampaignId}`);
        // Attempt to map common fields
        setCampaignData(prev => ({
          ...prev,
          name: String((data?.name ?? data?.title ?? `Campaign ${selectedCampaignId}`) || ''),
          type: String((data?.type ?? 'email') || 'email'),
          persona: String((data?.persona ?? '') || ''),
          tone: String((data?.tone ?? prev.tone) || prev.tone),
          subject: String((data?.subject ?? '') || ''),
          content: String((data?.content ?? data?.body ?? '') || ''),
          schedule: String((data?.schedule ?? prev.schedule) || prev.schedule),
          scheduledDate: String((data?.scheduledDate ?? data?.scheduled_at ?? '') || ''),
          targetCount: Number((data?.targetCount ?? data?.targets?.length ?? prev.targetCount) || prev.targetCount)
        }));
      } catch (err: any) {
        setSelectedError(err?.message || 'Failed to load campaign');
      } finally {
        setLoadingSelected(false);
      }
    };
    loadSelected();
  }, [selectedCampaignId]);

  const steps = [
    { id: 'basic', label: 'Basic Info', icon: Target },
    { id: 'content', label: 'Content', icon: MessageSquare },
    { id: 'schedule', label: 'Schedule', icon: Calendar },
    { id: 'review', label: 'Review', icon: Eye }
  ];

  const personas = [
    { id: 'cto', label: 'Tech-Forward CTO', count: 1247 },
    { id: 'cmo', label: 'Growth-Focused CMO', count: 856 },
    { id: 'founder', label: 'Startup Founder', count: 634 },
    { id: 'enterprise', label: 'Enterprise Executive', count: 423 }
  ];

  const campaignTemplates = [
    {
      id: 'product-launch',
      name: 'Product Launch',
      description: 'Announce new features or products',
      subject: 'Introducing {{product_name}} - Transform Your {{industry}}',
      content: 'Hi {{first_name}},\n\nWe\'re excited to introduce {{product_name}}, specifically designed for {{persona_title}}s like yourself...'
    },
    {
      id: 'webinar',
      name: 'Webinar Invitation',
      description: 'Invite to educational content',
      subject: 'Exclusive Webinar: {{topic}} for {{persona_title}}s',
      content: 'Dear {{first_name}},\n\nYou\'re invited to our exclusive webinar on {{topic}}...'
    },
    {
      id: 'case-study',
      name: 'Case Study Share',
      description: 'Share success stories',
      subject: 'How {{company_name}} Achieved {{result}} in {{timeframe}}',
      content: 'Hi {{first_name}},\n\nI thought you\'d be interested in how {{company_name}} tackled similar challenges...'
    }
  ];

  const nextStep = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleTemplateSelect = (template: any) => {
    setCampaignData(prev => ({
      ...prev,
      subject: template.subject,
      content: template.content
    }));
  };

  const progress = ((currentStep + 1) / steps.length) * 100;

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Campaign Builder</h1>
          <p className="text-muted-foreground">Create targeted marketing campaigns with AI assistance</p>
        </div>
        <div className="flex items-center space-x-3">
          <Button variant="outline">
            <Save className="w-4 h-4 mr-2" />
            Save Draft
          </Button>
        </div>
      </div>

      {selectedCampaignId && (
        <Card className="p-4 bg-muted/30">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <div className="text-xs text-muted-foreground">Selected Campaign</div>
              <div className="font-medium">#{selectedCampaignId} — {campaignData.name || 'Loading…'}</div>
            </div>
            <div className="text-sm text-muted-foreground">
              {loadingSelected ? 'Loading…' : selectedError ? <span className="text-destructive">{selectedError}</span> : 'Loaded'}
            </div>
          </div>
        </Card>
      )}

      {/* Progress Bar */}
      <Card className="p-6 bg-gradient-card shadow-soft">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Campaign Creation Progress</h2>
          <span className="text-sm text-muted-foreground">Step {currentStep + 1} of {steps.length}</span>
        </div>
        <Progress value={progress} className="h-2 mb-6" />
        <div className="flex items-center justify-between">
          {steps.map((step, index) => (
            <div key={step.id} className="flex items-center">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                index <= currentStep 
                  ? 'bg-gradient-primary text-primary-foreground shadow-glow' 
                  : 'bg-muted text-muted-foreground'
              }`}>
                <step.icon className="w-4 h-4" />
              </div>
              <span className={`ml-2 text-sm font-medium ${
                index <= currentStep ? 'text-foreground' : 'text-muted-foreground'
              }`}>
                {step.label}
              </span>
              {index < steps.length - 1 && (
                <div className={`w-12 h-0.5 mx-4 ${
                  index < currentStep ? 'bg-primary' : 'bg-muted'
                }`} />
              )}
            </div>
          ))}
        </div>
      </Card>

      {/* Step Content */}
      <Card className="p-6 bg-gradient-card shadow-soft">
        {currentStep === 0 && (
          <div className="space-y-6">
            <h3 className="text-xl font-semibold mb-4">Campaign Basics</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label htmlFor="campaignName">Campaign Name</Label>
                <Input
                  id="campaignName"
                  value={campaignData.name}
                  onChange={(e) => setCampaignData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., Q1 Product Launch Campaign"
                />
              </div>
              
              <div>
                <Label htmlFor="campaignType">Campaign Type</Label>
                <Select value={campaignData.type} onValueChange={(value) => setCampaignData(prev => ({ ...prev, type: value }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="email">Email Campaign</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>Target Persona</Label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                {personas.map((persona) => (
                  <div
                    key={persona.id}
                    className={`p-4 border rounded-lg cursor-pointer transition-smooth ${
                      campaignData.persona === persona.id
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/50'
                    }`}
                    onClick={() => setCampaignData(prev => ({ ...prev, persona: persona.id, targetCount: persona.count }))}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium">{persona.label}</h4>
                        <p className="text-sm text-muted-foreground">{persona.count} contacts</p>
                      </div>
                      <Users className="w-5 h-5 text-muted-foreground" />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <Label htmlFor="tone">Communication Tone</Label>
              <Select value={campaignData.tone} onValueChange={(value) => setCampaignData(prev => ({ ...prev, tone: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="soft">Soft - Consultative & gentle</SelectItem>
                  <SelectItem value="medium">Medium - Professional & balanced</SelectItem>
                  <SelectItem value="hard">Hard - Direct & results-focused</SelectItem>
                  <SelectItem value="referral">Referral - Warm & relationship-based</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        {currentStep === 1 && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-semibold">Campaign Content</h3>
              <Button variant="outline" size="sm">
                <MessageSquare className="w-4 h-4 mr-2" />
                Generate with AI
              </Button>
            </div>

            <Tabs defaultValue="templates" className="space-y-4">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="templates">Templates</TabsTrigger>
                <TabsTrigger value="custom">Custom Content</TabsTrigger>
              </TabsList>

              <TabsContent value="templates" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {campaignTemplates.map((template) => (
                    <Card 
                      key={template.id} 
                      className="p-4 cursor-pointer hover:shadow-medium transition-smooth border-border hover:border-primary/50"
                      onClick={() => handleTemplateSelect(template)}
                    >
                      <h4 className="font-medium mb-2">{template.name}</h4>
                      <p className="text-sm text-muted-foreground">{template.description}</p>
                    </Card>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="custom" className="space-y-4">
                <div>
                  <Label htmlFor="subject">Email Subject Line</Label>
                  <Input
                    id="subject"
                    value={campaignData.subject}
                    onChange={(e) => setCampaignData(prev => ({ ...prev, subject: e.target.value }))}
                    placeholder="Enter your email subject..."
                  />
                </div>

                <div>
                  <Label htmlFor="content">Email Content</Label>
                  <Textarea
                    id="content"
                    value={campaignData.content}
                    onChange={(e) => setCampaignData(prev => ({ ...prev, content: e.target.value }))}
                    placeholder="Write your email content here..."
                    className="min-h-[200px]"
                  />
                </div>
              </TabsContent>
            </Tabs>
          </div>
        )}

        {currentStep === 2 && (
          <div className="space-y-6">
            <h3 className="text-xl font-semibold">Schedule Campaign</h3>
            
            <div className="space-y-4">
              <div>
                <Label>Send Schedule</Label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                  <div
                    className={`p-4 border rounded-lg cursor-pointer transition-smooth ${
                      campaignData.schedule === 'immediate'
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/50'
                    }`}
                    onClick={() => setCampaignData(prev => ({ ...prev, schedule: 'immediate' }))}
                  >
                    <div className="flex items-center space-x-3">
                      <Send className="w-5 h-5 text-primary" />
                      <div>
                        <h4 className="font-medium">Send Immediately</h4>
                        <p className="text-sm text-muted-foreground">Start campaign right away</p>
                      </div>
                    </div>
                  </div>

                  <div
                    className={`p-4 border rounded-lg cursor-pointer transition-smooth ${
                      campaignData.schedule === 'scheduled'
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/50'
                    }`}
                    onClick={() => setCampaignData(prev => ({ ...prev, schedule: 'scheduled' }))}
                  >
                    <div className="flex items-center space-x-3">
                      <Calendar className="w-5 h-5 text-primary" />
                      <div>
                        <h4 className="font-medium">Schedule for Later</h4>
                        <p className="text-sm text-muted-foreground">Set a specific time</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {campaignData.schedule === 'scheduled' && (
                <div>
                  <Label htmlFor="scheduledDate">Schedule Date & Time</Label>
                  <Input
                    id="scheduledDate"
                    type="datetime-local"
                    value={campaignData.scheduledDate}
                    onChange={(e) => setCampaignData(prev => ({ ...prev, scheduledDate: e.target.value }))}
                  />
                </div>
              )}
            </div>
          </div>
        )}

        {currentStep === 3 && (
          <div className="space-y-6">
            <h3 className="text-xl font-semibold">Review & Launch</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="p-4 bg-muted/30">
                <h4 className="font-medium mb-3">Campaign Summary</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Name:</span>
                    <span>{campaignData.name || 'Untitled Campaign'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Type:</span>
                    <span className="capitalize">{campaignData.type}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Persona:</span>
                    <span>{personas.find(p => p.id === campaignData.persona)?.label || 'Not selected'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Tone:</span>
                    <Badge variant="outline" className="h-5">
                      {campaignData.tone}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Target Count:</span>
                    <span>{campaignData.targetCount.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Schedule:</span>
                    <span className="capitalize">{campaignData.schedule}</span>
                  </div>
                </div>
              </Card>

              <Card className="p-4 bg-muted/30">
                <h4 className="font-medium mb-3">Content Preview</h4>
                <div className="space-y-3">
                  <div>
                    <span className="text-xs text-muted-foreground">Subject:</span>
                    <p className="text-sm font-medium">{campaignData.subject || 'No subject set'}</p>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground">Content:</span>
                    <p className="text-sm leading-relaxed line-clamp-4">
                      {campaignData.content || 'No content set'}
                    </p>
                  </div>
                </div>
              </Card>
            </div>

            <div className="flex items-center justify-center space-x-4 pt-6">
              <Button variant="outline" size="lg">
                <Save className="w-4 h-4 mr-2" />
                Save as Draft
              </Button>
              <Button variant="default" size="lg" className="px-8">
                <Play className="w-4 h-4 mr-2" />
                Launch Campaign
              </Button>
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="flex items-center justify-between pt-6 border-t border-border/50">
          <Button 
            variant="outline" 
            onClick={prevStep}
            disabled={currentStep === 0}
          >
            Previous
          </Button>
          
          <div className="flex items-center space-x-2">
            {steps.map((_, index) => (
              <div
                key={index}
                className={`w-2 h-2 rounded-full ${
                  index <= currentStep ? 'bg-primary' : 'bg-muted'
                }`}
              />
            ))}
          </div>

          <Button 
            variant="default" 
            onClick={nextStep}
            disabled={currentStep === steps.length - 1}
          >
            Next
          </Button>
        </div>
      </Card>
    </div>
  );
};