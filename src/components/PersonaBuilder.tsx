import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Users, 
  Plus, 
  Edit3, 
  Target, 
  Brain,
  Briefcase,
  DollarSign,
  Clock,
  CheckCircle,
  Copy,
  Trash2
} from "lucide-react";

interface Persona {
  id: string;
  name: string;
  jobTitle: string;
  industry: string;
  companySize: string;
  painPoints: string[];
  goals: string[];
  preferredTone: 'soft' | 'medium' | 'hard' | 'referral';
  decisionFactors: string[];
  budget: string;
  timeline: string;
  created: Date;
}

export const PersonaBuilder = () => {
  const [personas, setPersonas] = useState<Persona[]>([
    {
      id: '1',
      name: 'Tech-Forward CTO',
      jobTitle: 'Chief Technology Officer',
      industry: 'SaaS',
      companySize: '100-500',
      painPoints: ['Legacy system modernization', 'Security vulnerabilities', 'Scalability issues'],
      goals: ['Increase development velocity', 'Improve system reliability', 'Reduce technical debt'],
      preferredTone: 'medium',
      decisionFactors: ['ROI analysis', 'Technical specifications', 'Integration capabilities'],
      budget: '$50K - $200K',
      timeline: '3-6 months',
      created: new Date('2024-01-10')
    },
    {
      id: '2',
      name: 'Growth-Focused CMO',
      jobTitle: 'Chief Marketing Officer',
      industry: 'E-commerce',
      companySize: '50-200',
      painPoints: ['Customer acquisition costs', 'Attribution tracking', 'Content scaling'],
      goals: ['Increase conversion rates', 'Improve marketing ROI', 'Scale content production'],
      preferredTone: 'soft',
      decisionFactors: ['Performance metrics', 'Ease of use', 'Customer success stories'],
      budget: '$25K - $100K',
      timeline: '1-3 months',
      created: new Date('2024-01-08')
    }
  ]);

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingPersona, setEditingPersona] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    jobTitle: '',
    industry: '',
    companySize: '',
    painPoints: '',
    goals: '',
    preferredTone: 'medium' as 'soft' | 'medium' | 'hard' | 'referral',
    decisionFactors: '',
    budget: '',
    timeline: ''
  });

  const handleSavePersona = () => {
    const newPersona: Persona = {
      id: editingPersona || Date.now().toString(),
      name: formData.name,
      jobTitle: formData.jobTitle,
      industry: formData.industry,
      companySize: formData.companySize,
      painPoints: formData.painPoints.split(',').map(p => p.trim()).filter(p => p),
      goals: formData.goals.split(',').map(g => g.trim()).filter(g => g),
      preferredTone: formData.preferredTone,
      decisionFactors: formData.decisionFactors.split(',').map(d => d.trim()).filter(d => d),
      budget: formData.budget,
      timeline: formData.timeline,
      created: new Date()
    };

    if (editingPersona) {
      setPersonas(prev => prev.map(p => p.id === editingPersona ? newPersona : p));
    } else {
      setPersonas(prev => [...prev, newPersona]);
    }

    resetForm();
  };

  const resetForm = () => {
    setFormData({
      name: '',
      jobTitle: '',
      industry: '',
      companySize: '',
      painPoints: '',
      goals: '',
      preferredTone: 'medium',
      decisionFactors: '',
      budget: '',
      timeline: ''
    });
    setShowCreateForm(false);
    setEditingPersona(null);
  };

  const editPersona = (persona: Persona) => {
    setFormData({
      name: persona.name,
      jobTitle: persona.jobTitle,
      industry: persona.industry,
      companySize: persona.companySize,
      painPoints: persona.painPoints.join(', '),
      goals: persona.goals.join(', '),
      preferredTone: persona.preferredTone,
      decisionFactors: persona.decisionFactors.join(', '),
      budget: persona.budget,
      timeline: persona.timeline
    });
    setEditingPersona(persona.id);
    setShowCreateForm(true);
  };

  const deletePersona = (id: string) => {
    setPersonas(prev => prev.filter(p => p.id !== id));
  };

  const getToneColor = (tone: string) => {
    switch (tone) {
      case 'soft': return 'bg-blue-500/10 text-blue-700 border-blue-200';
      case 'medium': return 'bg-green-500/10 text-green-700 border-green-200';
      case 'hard': return 'bg-red-500/10 text-red-700 border-red-200';
      case 'referral': return 'bg-purple-500/10 text-purple-700 border-purple-200';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Persona Builder</h1>
          <p className="text-muted-foreground">Create and manage customer personas for targeted campaigns</p>
        </div>
        <Button 
          variant="default" 
          onClick={() => setShowCreateForm(true)}
          disabled={showCreateForm}
        >
          <Plus className="w-4 h-4 mr-2" />
          Create Persona
        </Button>
      </div>

      <Tabs defaultValue="personas" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="personas">Your Personas</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
        </TabsList>

        <TabsContent value="personas" className="space-y-6">
          {/* Create/Edit Form */}
          {showCreateForm && (
            <Card className="p-6 bg-gradient-card shadow-soft border-primary/20">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold">
                  {editingPersona ? 'Edit Persona' : 'Create New Persona'}
                </h2>
                <Button variant="ghost" onClick={resetForm}>
                  Cancel
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="name">Persona Name</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="e.g., Tech-Forward CTO"
                    />
                  </div>

                  <div>
                    <Label htmlFor="jobTitle">Job Title</Label>
                    <Input
                      id="jobTitle"
                      value={formData.jobTitle}
                      onChange={(e) => setFormData(prev => ({ ...prev, jobTitle: e.target.value }))}
                      placeholder="e.g., Chief Technology Officer"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="industry">Industry</Label>
                      <Input
                        id="industry"
                        value={formData.industry}
                        onChange={(e) => setFormData(prev => ({ ...prev, industry: e.target.value }))}
                        placeholder="e.g., SaaS"
                      />
                    </div>
                    <div>
                      <Label htmlFor="companySize">Company Size</Label>
                      <Select value={formData.companySize} onValueChange={(value) => setFormData(prev => ({ ...prev, companySize: value }))}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select size" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1-10">1-10 employees</SelectItem>
                          <SelectItem value="11-50">11-50 employees</SelectItem>
                          <SelectItem value="51-200">51-200 employees</SelectItem>
                          <SelectItem value="201-1000">201-1000 employees</SelectItem>
                          <SelectItem value="1000+">1000+ employees</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="painPoints">Pain Points (comma-separated)</Label>
                    <Textarea
                      id="painPoints"
                      value={formData.painPoints}
                      onChange={(e) => setFormData(prev => ({ ...prev, painPoints: e.target.value }))}
                      placeholder="e.g., Legacy systems, Security concerns, Scalability issues"
                      className="h-20"
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <Label htmlFor="goals">Goals (comma-separated)</Label>
                    <Textarea
                      id="goals"
                      value={formData.goals}
                      onChange={(e) => setFormData(prev => ({ ...prev, goals: e.target.value }))}
                      placeholder="e.g., Increase efficiency, Reduce costs, Improve security"
                      className="h-20"
                    />
                  </div>

                  <div>
                    <Label htmlFor="preferredTone">Preferred Communication Tone</Label>
                    <Select value={formData.preferredTone} onValueChange={(value: any) => setFormData(prev => ({ ...prev, preferredTone: value }))}>
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

                  <div>
                    <Label htmlFor="decisionFactors">Decision Factors (comma-separated)</Label>
                    <Textarea
                      id="decisionFactors"
                      value={formData.decisionFactors}
                      onChange={(e) => setFormData(prev => ({ ...prev, decisionFactors: e.target.value }))}
                      placeholder="e.g., ROI analysis, Technical specs, Customer reviews"
                      className="h-20"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="budget">Budget Range</Label>
                      <Input
                        id="budget"
                        value={formData.budget}
                        onChange={(e) => setFormData(prev => ({ ...prev, budget: e.target.value }))}
                        placeholder="e.g., $50K - $200K"
                      />
                    </div>
                    <div>
                      <Label htmlFor="timeline">Decision Timeline</Label>
                      <Input
                        id="timeline"
                        value={formData.timeline}
                        onChange={(e) => setFormData(prev => ({ ...prev, timeline: e.target.value }))}
                        placeholder="e.g., 3-6 months"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end space-x-3 mt-6 pt-6 border-t border-border/50">
                <Button variant="outline" onClick={resetForm}>
                  Cancel
                </Button>
                <Button 
                  variant="default" 
                  onClick={handleSavePersona}
                  disabled={!formData.name || !formData.jobTitle}
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  {editingPersona ? 'Update Persona' : 'Create Persona'}
                </Button>
              </div>
            </Card>
          )}

          {/* Personas Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {personas.map((persona) => (
              <Card key={persona.id} className="p-6 bg-gradient-card shadow-soft hover:shadow-medium transition-smooth">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-gradient-primary rounded-lg flex items-center justify-center shadow-glow">
                      <Users className="w-6 h-6 text-primary-foreground" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold">{persona.name}</h3>
                      <p className="text-sm text-muted-foreground">{persona.jobTitle}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button variant="ghost" size="sm" onClick={() => editPersona(persona)}>
                      <Edit3 className="w-3 h-3" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => deletePersona(persona.id)}>
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center space-x-2 text-sm">
                    <Briefcase className="w-4 h-4 text-muted-foreground" />
                    <span>{persona.industry} • {persona.companySize} employees</span>
                  </div>

                  <div className="flex items-center space-x-2 text-sm">
                    <DollarSign className="w-4 h-4 text-muted-foreground" />
                    <span>{persona.budget} • {persona.timeline}</span>
                  </div>

                  <div>
                    <Badge className={getToneColor(persona.preferredTone)} variant="outline">
                      {persona.preferredTone} tone
                    </Badge>
                  </div>

                  <div>
                    <p className="text-sm font-medium mb-2">Key Pain Points:</p>
                    <div className="flex flex-wrap gap-1">
                      {persona.painPoints.slice(0, 3).map((point, index) => (
                        <Badge key={index} variant="secondary" className="text-xs">
                          {point}
                        </Badge>
                      ))}
                      {persona.painPoints.length > 3 && (
                        <Badge variant="secondary" className="text-xs">
                          +{persona.painPoints.length - 3} more
                        </Badge>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-border/50">
                    <span className="text-xs text-muted-foreground">
                      Created {persona.created.toLocaleDateString()}
                    </span>
                    <Button variant="ghost" size="sm">
                      <Copy className="w-3 h-3 mr-1" />
                      Duplicate
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="templates" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {/* Template cards would go here */}
            <Card className="p-6 bg-gradient-card shadow-soft">
              <div className="text-center">
                <Target className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">Coming Soon</h3>
                <p className="text-sm text-muted-foreground">
                  Pre-built persona templates will be available here to help you get started quickly.
                </p>
              </div>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};