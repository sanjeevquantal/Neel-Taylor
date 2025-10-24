import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  User, 
  Settings as SettingsIcon, 
  Bell, 
  Shield, 
  CreditCard, 
  Palette,
  Globe,
  Database,
  Key,
  Save,
  RefreshCw
} from "lucide-react";

export const Settings = () => {
  const [settings, setSettings] = useState({
    profile: {
      name: "John Doe",
      email: "john@company.com",
      company: "Acme Corp",
      role: "Marketing Director"
    },
    preferences: {
      darkMode: false,
      notifications: true,
      emailUpdates: true,
      autoSave: true,
      language: "en"
    },
    api: {
      openaiKey: "",
      webhookUrl: "",
      rateLimit: 1000
    }
  });

  const handleSave = () => {
    // Save settings logic would go here
    // console.log("Settings saved:", settings);
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Settings</h1>
          <p className="text-muted-foreground mt-1">Manage your CampAIgn account and preferences</p>
        </div>
        <Button onClick={handleSave} className="bg-gradient-primary text-primary-foreground shadow-soft">
          <Save className="w-4 h-4 mr-2" />
          Save Changes
        </Button>
      </div>

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="profile" className="flex items-center space-x-2">
            <User className="w-4 h-4" />
            <span>Profile</span>
          </TabsTrigger>
          <TabsTrigger value="preferences" className="flex items-center space-x-2">
            <SettingsIcon className="w-4 h-4" />
            <span>Preferences</span>
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex items-center space-x-2">
            <Bell className="w-4 h-4" />
            <span>Notifications</span>
          </TabsTrigger>
          <TabsTrigger value="security" className="flex items-center space-x-2">
            <Shield className="w-4 h-4" />
            <span>Security</span>
          </TabsTrigger>
          <TabsTrigger value="billing" className="flex items-center space-x-2">
            <CreditCard className="w-4 h-4" />
            <span>Billing</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <Card className="p-6 bg-gradient-card shadow-soft">
            <h2 className="text-xl font-semibold mb-4 flex items-center">
              <User className="w-5 h-5 mr-2" />
              Profile Information
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  value={settings.profile.name}
                  onChange={(e) => setSettings({
                    ...settings,
                    profile: { ...settings.profile, name: e.target.value }
                  })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  value={settings.profile.email}
                  onChange={(e) => setSettings({
                    ...settings,
                    profile: { ...settings.profile, email: e.target.value }
                  })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="company">Company</Label>
                <Input
                  id="company"
                  value={settings.profile.company}
                  onChange={(e) => setSettings({
                    ...settings,
                    profile: { ...settings.profile, company: e.target.value }
                  })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="role">Role</Label>
                <Input
                  id="role"
                  value={settings.profile.role}
                  onChange={(e) => setSettings({
                    ...settings,
                    profile: { ...settings.profile, role: e.target.value }
                  })}
                />
              </div>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="preferences">
          <Card className="p-6 bg-gradient-card shadow-soft">
            <h2 className="text-xl font-semibold mb-4 flex items-center">
              <Palette className="w-5 h-5 mr-2" />
              Application Preferences
            </h2>
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-base font-medium">Auto-save</Label>
                  <p className="text-sm text-muted-foreground">Automatically save your work as you type</p>
                </div>
                <Switch
                  checked={settings.preferences.autoSave}
                  onCheckedChange={(checked) => setSettings({
                    ...settings,
                    preferences: { ...settings.preferences, autoSave: checked }
                  })}
                />
              </div>
              <Separator />
              <div className="space-y-2">
                <Label htmlFor="language">Default Language</Label>
                <select 
                  id="language"
                  className="w-full p-2 border rounded-md bg-background"
                  value={settings.preferences.language}
                  onChange={(e) => setSettings({
                    ...settings,
                    preferences: { ...settings.preferences, language: e.target.value }
                  })}
                >
                  <option value="en">English</option>
                  <option value="es">Spanish</option>
                  <option value="fr">French</option>
                  <option value="de">German</option>
                </select>
              </div>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="notifications">
          <Card className="p-6 bg-gradient-card shadow-soft">
            <h2 className="text-xl font-semibold mb-4 flex items-center">
              <Bell className="w-5 h-5 mr-2" />
              Notification Settings
            </h2>
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-base font-medium">Push Notifications</Label>
                  <p className="text-sm text-muted-foreground">Receive notifications about campaign updates</p>
                </div>
                <Switch
                  checked={settings.preferences.notifications}
                  onCheckedChange={(checked) => setSettings({
                    ...settings,
                    preferences: { ...settings.preferences, notifications: checked }
                  })}
                />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-base font-medium">Email Updates</Label>
                  <p className="text-sm text-muted-foreground">Receive weekly reports and updates via email</p>
                </div>
                <Switch
                  checked={settings.preferences.emailUpdates}
                  onCheckedChange={(checked) => setSettings({
                    ...settings,
                    preferences: { ...settings.preferences, emailUpdates: checked }
                  })}
                />
              </div>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="security">
          <Card className="p-6 bg-gradient-card shadow-soft">
            <h2 className="text-xl font-semibold mb-4 flex items-center">
              <Key className="w-5 h-5 mr-2" />
              API Configuration
            </h2>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="openai-key">OpenAI API Key</Label>
                <Input
                  id="openai-key"
                  type="password"
                  placeholder="sk-..."
                  value={settings.api.openaiKey}
                  onChange={(e) => setSettings({
                    ...settings,
                    api: { ...settings.api, openaiKey: e.target.value }
                  })}
                />
                <p className="text-xs text-muted-foreground">Your API key is encrypted and stored securely</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="webhook">Webhook URL</Label>
                <Input
                  id="webhook"
                  type="url"
                  placeholder="https://your-webhook-url.com"
                  value={settings.api.webhookUrl}
                  onChange={(e) => setSettings({
                    ...settings,
                    api: { ...settings.api, webhookUrl: e.target.value }
                  })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="rate-limit">API Rate Limit (requests/hour)</Label>
                <Input
                  id="rate-limit"
                  type="number"
                  value={settings.api.rateLimit}
                  onChange={(e) => setSettings({
                    ...settings,
                    api: { ...settings.api, rateLimit: parseInt(e.target.value) }
                  })}
                />
              </div>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="billing">
          <Card className="p-6 bg-gradient-card shadow-soft">
            <h2 className="text-xl font-semibold mb-4 flex items-center">
              <CreditCard className="w-5 h-5 mr-2" />
              Billing & Usage
            </h2>
            <div className="space-y-6">
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-2xl font-bold text-primary">247</div>
                  <div className="text-sm text-muted-foreground">Credits Used</div>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-2xl font-bold text-primary">500</div>
                  <div className="text-sm text-muted-foreground">Total Credits</div>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-2xl font-bold text-success">253</div>
                  <div className="text-sm text-muted-foreground">Remaining</div>
                </div>
              </div>
              
              <div className="p-4 border rounded-lg bg-muted/30">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-medium">Current Plan</h3>
                  <Badge variant="secondary">Pro Plan</Badge>
                </div>
                <p className="text-sm text-muted-foreground mb-3">
                  Access to advanced AI features, unlimited campaigns, and priority support.
                </p>
                <div className="flex space-x-2">
                  <Button variant="outline" size="sm">Change Plan</Button>
                  <Button variant="outline" size="sm">View Usage</Button>
                </div>
              </div>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};