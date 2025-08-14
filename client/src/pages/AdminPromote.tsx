import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { motion } from 'framer-motion';
import { 
  Plus, 
  Settings, 
  Eye, 
  EyeOff, 
  Copy, 
  ExternalLink, 
  Edit3, 
  Trash2, 
  Play, 
  Pause, 
  RefreshCw,
  Calendar,
  Target,
  BarChart3,
  Shield,
  Clock,
  Users,
  Link as LinkIcon,
  Mail,
  Download,
  TestTube
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';

interface Campaign {
  id: string;
  name: string;
  sponsor_name: string;
  headline: string;
  subline?: string;
  cta_text: string;
  click_url: string;
  placements: string[];
  start_at: string;
  end_at: string;
  priority: number;
  is_active: boolean;
  is_sponsored: boolean;
  tags: string[];
  freq_cap_per_user_per_day: number;
  created_at: string;
  updated_at: string;
  sponsor_creatives?: Creative[];
}

interface Creative {
  placement: string;
  image_desktop_url?: string;
  image_mobile_url?: string;
  logo_url?: string;
  alt: string;
}

interface PortalToken {
  id: string;
  token: string;
  campaign_id: string;
  expires_at: string;
  last_accessed_at?: string;
  created_at: string;
  sponsor_campaigns: {
    name: string;
    sponsor_name: string;
  };
}

interface AdminSession {
  isAdmin: boolean;
  loginTime?: number;
}

export default function AdminPromote() {
  const [, setLocation] = useLocation();
  const [session, setSession] = useState<AdminSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [portalTokens, setPortalTokens] = useState<PortalToken[]>([]);
  const [showLoginForm, setShowLoginForm] = useState(false);
  const [showCampaignForm, setShowCampaignForm] = useState(false);
  const [showTokenForm, setShowTokenForm] = useState(false);
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [selectedToken, setSelectedToken] = useState<PortalToken | null>(null);
  const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null);
  const [activeTab, setActiveTab] = useState('campaigns');

  // Form state
  const [loginPassword, setLoginPassword] = useState('');
  const [campaignForm, setCampaignForm] = useState({
    name: '',
    sponsor_name: '',
    headline: '',
    subline: '',
    cta_text: '',
    click_url: '',
    placements: [] as string[],
    start_at: '',
    end_at: '',
    priority: 1,
    is_active: true,
    is_sponsored: true,
    tags: [] as string[],
    freq_cap_per_user_per_day: 0,
    creatives: [] as Creative[]
  });
  const [tokenForm, setTokenForm] = useState({
    campaignId: '',
    hoursValid: 24 * 30 // 30 days default
  });
  const [emailForm, setEmailForm] = useState({
    recipients: [''],
    message: 'Your sponsor analytics portal is ready! Please find your personalized dashboard link below.'
  });

  // Check admin session on load
  useEffect(() => {
    checkSession();
  }, []);

  const checkSession = async () => {
    try {
      const response = await fetch('/api/admin/session');
      const data = await response.json();
      
      if (data.ok && data.isAdmin) {
        setSession({ isAdmin: true, loginTime: data.loginTime });
        loadData();
      } else {
        setShowLoginForm(true);
      }
    } catch (error) {
      console.error('Session check error:', error);
      setShowLoginForm(true);
    } finally {
      setLoading(false);
    }
  };

  const login = async () => {
    try {
      const response = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: loginPassword })
      });
      
      const data = await response.json();
      
      if (data.ok) {
        setSession({ isAdmin: true, loginTime: Date.now() });
        setShowLoginForm(false);
        setLoginPassword('');
        loadData();
        toast({ title: "Logged in successfully" });
      } else {
        toast({ title: "Login failed", description: data.error, variant: "destructive" });
      }
    } catch (error) {
      console.error('Login error:', error);
      toast({ title: "Login error", description: "Failed to authenticate", variant: "destructive" });
    }
  };

  const logout = async () => {
    try {
      await fetch('/api/admin/logout', { method: 'POST' });
      setSession(null);
      setShowLoginForm(true);
      toast({ title: "Logged out successfully" });
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const loadData = async () => {
    try {
      const [campaignsRes, tokensRes] = await Promise.all([
        fetch('/api/admin/campaigns'),
        fetch('/api/admin/portal-tokens')
      ]);

      if (campaignsRes.ok) {
        const campaignsData = await campaignsRes.json();
        setCampaigns(campaignsData.campaigns || []);
      }

      if (tokensRes.ok) {
        const tokensData = await tokensRes.json();
        setPortalTokens(tokensData.tokens || []);
      }
    } catch (error) {
      console.error('Load data error:', error);
      toast({ title: "Error", description: "Failed to load data", variant: "destructive" });
    }
  };

  const saveCampaign = async () => {
    try {
      const payload = {
        ...campaignForm,
        id: editingCampaign?.id
      };

      const response = await fetch('/api/admin/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (data.ok) {
        toast({ title: "Success", description: data.message });
        setShowCampaignForm(false);
        setEditingCampaign(null);
        resetCampaignForm();
        loadData();
      } else {
        toast({ title: "Error", description: data.error, variant: "destructive" });
      }
    } catch (error) {
      console.error('Save campaign error:', error);
      toast({ title: "Error", description: "Failed to save campaign", variant: "destructive" });
    }
  };

  const toggleCampaign = async (id: string, is_active: boolean) => {
    try {
      const response = await fetch(`/api/admin/campaigns/${id}/toggle`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active })
      });

      if (response.ok) {
        toast({ title: "Campaign updated" });
        loadData();
      }
    } catch (error) {
      console.error('Toggle campaign error:', error);
      toast({ title: "Error", description: "Failed to toggle campaign", variant: "destructive" });
    }
  };

  const duplicateCampaign = async (id: string) => {
    try {
      const response = await fetch(`/api/admin/campaigns/${id}/duplicate`, {
        method: 'POST'
      });

      const data = await response.json();

      if (data.ok) {
        toast({ title: "Campaign duplicated successfully" });
        loadData();
      } else {
        toast({ title: "Error", description: data.error, variant: "destructive" });
      }
    } catch (error) {
      console.error('Duplicate campaign error:', error);
      toast({ title: "Error", description: "Failed to duplicate campaign", variant: "destructive" });
    }
  };

  const deleteCampaign = async (id: string) => {
    if (!confirm('Are you sure you want to delete this campaign?')) return;

    try {
      const response = await fetch(`/api/admin/campaigns/${id}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        toast({ title: "Campaign deleted" });
        loadData();
      }
    } catch (error) {
      console.error('Delete campaign error:', error);
      toast({ title: "Error", description: "Failed to delete campaign", variant: "destructive" });
    }
  };

  const createPortalToken = async () => {
    try {
      const response = await fetch('/api/admin/portal-tokens', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(tokenForm)
      });

      const data = await response.json();

      if (data.ok) {
        toast({ title: "Portal token created" });
        setShowTokenForm(false);
        setTokenForm({ campaignId: '', hoursValid: 24 * 30 });
        loadData();
        
        // Copy portal URL to clipboard
        navigator.clipboard.writeText(data.portalUrl);
        toast({ title: "Portal URL copied to clipboard" });
      } else {
        toast({ title: "Error", description: data.error, variant: "destructive" });
      }
    } catch (error) {
      console.error('Create token error:', error);
      toast({ title: "Error", description: "Failed to create portal token", variant: "destructive" });
    }
  };

  const revokeToken = async (id: string) => {
    if (!confirm('Are you sure you want to revoke this portal token?')) return;

    try {
      const response = await fetch(`/api/admin/portal-tokens/${id}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        toast({ title: "Portal token revoked" });
        loadData();
      }
    } catch (error) {
      console.error('Revoke token error:', error);
      toast({ title: "Error", description: "Failed to revoke token", variant: "destructive" });
    }
  };

  const copyPortalUrl = (token: string) => {
    const url = `${window.location.origin}/sponsor/${token}`;
    navigator.clipboard.writeText(url);
    toast({ title: "Portal URL copied to clipboard" });
  };

  const openEmailForm = (token: PortalToken) => {
    setSelectedToken(token);
    setEmailForm({
      recipients: [''],
      message: `Your sponsor analytics portal for "${token.sponsor_campaigns.name}" is ready! Please find your personalized dashboard link below.`
    });
    setShowEmailForm(true);
  };

  const sendPortalEmail = async () => {
    if (!selectedToken) return;

    try {
      const response = await fetch('/api/admin/portal-tokens/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: selectedToken.token,
          recipients: emailForm.recipients.filter(email => email.trim()),
          message: emailForm.message
        })
      });

      const data = await response.json();

      if (data.ok) {
        // Show email content modal for manual sending
        const emailText = `Subject: ${data.emailData.subject}\n\nTo: ${data.emailData.recipients.join(', ')}\n\n${data.emailData.body}`;
        
        // Copy to clipboard for manual sending
        navigator.clipboard.writeText(emailText);
        
        toast({ 
          title: "Email content copied to clipboard", 
          description: "Paste into your email client to send" 
        });
        
        setShowEmailForm(false);
        setSelectedToken(null);
      } else {
        toast({ title: "Error", description: data.error, variant: "destructive" });
      }
    } catch (error) {
      console.error('Send email error:', error);
      toast({ title: "Error", description: "Failed to prepare email", variant: "destructive" });
    }
  };

  const generatePortalToken = async (campaignId: string) => {
    try {
      const response = await fetch('/api/admin/portal-tokens', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ campaignId, hoursValid: 24 * 30 })
      });

      const data = await response.json();

      if (data.ok) {
        toast({ title: "Portal token generated successfully" });
        loadData(); // Refresh the tokens list
        return data.token;
      } else {
        toast({ title: "Error", description: data.error, variant: "destructive" });
      }
    } catch (error) {
      console.error('Generate token error:', error);
      toast({ title: "Error", description: "Failed to generate token", variant: "destructive" });
    }
  };

  const resetCampaignForm = () => {
    setCampaignForm({
      name: '',
      sponsor_name: '',
      headline: '',
      subline: '',
      cta_text: '',
      click_url: '',
      placements: [],
      start_at: '',
      end_at: '',
      priority: 1,
      is_active: true,
      is_sponsored: true,
      tags: [],
      freq_cap_per_user_per_day: 0,
      creatives: []
    });
  };

  const openEditCampaign = (campaign: Campaign) => {
    setEditingCampaign(campaign);
    setCampaignForm({
      name: campaign.name,
      sponsor_name: campaign.sponsor_name,
      headline: campaign.headline,
      subline: campaign.subline || '',
      cta_text: campaign.cta_text,
      click_url: campaign.click_url,
      placements: campaign.placements,
      start_at: campaign.start_at.split('T')[0],
      end_at: campaign.end_at.split('T')[0],
      priority: campaign.priority,
      is_active: campaign.is_active,
      is_sponsored: campaign.is_sponsored,
      tags: campaign.tags,
      freq_cap_per_user_per_day: campaign.freq_cap_per_user_per_day,
      creatives: campaign.sponsor_creatives || []
    });
    setShowCampaignForm(true);
  };

  const openTestPreview = () => {
    const url = `/events?debugSponsor=1`;
    window.open(url, '_blank');
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-copper-500/30 border-t-copper-500 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted">Loading admin console...</p>
        </div>
      </div>
    );
  }

  if (showLoginForm) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <Card className="w-full max-w-md p-8 bg-white/5 border-white/10">
          <div className="text-center mb-8">
            <Shield className="w-16 h-16 text-copper-500 mx-auto mb-4" />
            <h1 className="font-fraunces text-2xl font-bold text-white mb-2">
              Admin Console
            </h1>
            <p className="text-muted">Enter admin password to continue</p>
          </div>

          <div className="space-y-4">
            <div>
              <Label htmlFor="password" className="text-white">Password</Label>
              <Input
                id="password"
                type="password"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && login()}
                className="bg-white/10 border-white/20 text-white"
                data-testid="admin-password-input"
              />
            </div>
            <Button
              onClick={login}
              className="w-full bg-copper-500 hover:bg-copper-600 text-black"
              data-testid="admin-login-button"
            >
              Login
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg">
      {/* Header */}
      <header className="border-b border-white/10 bg-white/5">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Shield className="w-8 h-8 text-copper-500" />
              <div>
                <h1 className="font-fraunces text-2xl font-bold text-white">
                  Sponsorship Console
                </h1>
                <p className="text-muted text-sm">
                  Campaign & portal management
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Button
                onClick={openTestPreview}
                variant="outline"
                size="sm"
                className="border-white/20 text-white hover:bg-white/10"
                data-testid="test-preview-button"
              >
                <TestTube className="w-4 h-4 mr-2" />
                Test Preview
              </Button>
              <Button
                onClick={logout}
                variant="outline"
                size="sm"
                className="border-white/20 text-white hover:bg-white/10"
                data-testid="admin-logout-button"
              >
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
          <TabsList className="grid w-full grid-cols-3 bg-white/5">
            <TabsTrigger value="campaigns" className="data-[state=active]:bg-copper-500 data-[state=active]:text-black">
              <Target className="w-4 h-4 mr-2" />
              Campaigns
            </TabsTrigger>
            <TabsTrigger value="tokens" className="data-[state=active]:bg-copper-500 data-[state=active]:text-black">
              <LinkIcon className="w-4 h-4 mr-2" />
              Portal Tokens
            </TabsTrigger>
            <TabsTrigger value="analytics" className="data-[state=active]:bg-copper-500 data-[state=active]:text-black">
              <BarChart3 className="w-4 h-4 mr-2" />
              Analytics
            </TabsTrigger>
          </TabsList>

          {/* Campaigns Tab */}
          <TabsContent value="campaigns" className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="font-fraunces text-xl font-bold text-white">
                Campaign Management
              </h2>
              <Button
                onClick={() => {
                  resetCampaignForm();
                  setEditingCampaign(null);
                  setShowCampaignForm(true);
                }}
                className="bg-copper-500 hover:bg-copper-600 text-black"
                data-testid="create-campaign-button"
              >
                <Plus className="w-4 h-4 mr-2" />
                New Campaign
              </Button>
            </div>

            <div className="grid gap-6">
              {campaigns.map((campaign) => (
                <Card key={campaign.id} className="p-6 bg-white/5 border-white/10">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-medium text-white text-lg">
                          {campaign.name}
                        </h3>
                        <Badge variant={campaign.is_active ? "default" : "secondary"}>
                          {campaign.is_active ? "Active" : "Paused"}
                        </Badge>
                        <Badge variant="outline" className="text-muted border-white/20">
                          {campaign.placements.join(', ')}
                        </Badge>
                      </div>
                      <p className="text-muted mb-2">
                        <span className="font-medium">{campaign.sponsor_name}</span> • {campaign.headline}
                      </p>
                      <div className="flex items-center gap-4 text-sm text-muted">
                        <span>
                          <Calendar className="w-4 h-4 inline mr-1" />
                          {formatDate(campaign.start_at)} - {formatDate(campaign.end_at)}
                        </span>
                        <span>
                          <Users className="w-4 h-4 inline mr-1" />
                          {campaign.freq_cap_per_user_per_day === 0 ? 'No cap' : `${campaign.freq_cap_per_user_per_day}×/day cap`}
                        </span>
                        {(() => {
                          const existingToken = portalTokens.find(t => t.campaign_id === campaign.id);
                          if (existingToken) {
                            return (
                              <span className="text-green-400">
                                <LinkIcon className="w-4 h-4 inline mr-1" />
                                Portal active
                              </span>
                            );
                          }
                          return null;
                        })()}
                        <span>Priority: {campaign.priority}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Switch
                        checked={campaign.is_active}
                        onCheckedChange={(checked) => toggleCampaign(campaign.id, checked)}
                        data-testid={`toggle-campaign-${campaign.id}`}
                      />
                      
                      {/* Portal Actions */}
                      <Button
                        onClick={() => generatePortalToken(campaign.id)}
                        variant="outline"
                        size="sm"
                        className="border-copper-500/50 text-copper-400 hover:bg-copper-500/20"
                        data-testid={`generate-portal-${campaign.id}`}
                        title="Generate portal link"
                      >
                        <LinkIcon className="w-4 h-4" />
                      </Button>
                      
                      {/* Show existing portal info if available */}
                      {(() => {
                        const existingToken = portalTokens.find(t => t.campaign_id === campaign.id);
                        if (existingToken) {
                          return (
                            <>
                              <Button
                                onClick={() => copyPortalUrl(existingToken.token)}
                                variant="outline"
                                size="sm"
                                className="border-green-500/50 text-green-400 hover:bg-green-500/20"
                                data-testid={`copy-portal-${campaign.id}`}
                                title="Copy portal URL"
                              >
                                <Copy className="w-4 h-4" />
                              </Button>
                              <Button
                                onClick={() => openEmailForm(existingToken)}
                                variant="outline"
                                size="sm"
                                className="border-blue-500/50 text-blue-400 hover:bg-blue-500/20"
                                data-testid={`email-portal-${campaign.id}`}
                                title="Email portal link"
                              >
                                <Mail className="w-4 h-4" />
                              </Button>
                              <Button
                                onClick={() => window.open(`/sponsor/${existingToken.token}`, '_blank')}
                                variant="outline"
                                size="sm"
                                className="border-purple-500/50 text-purple-400 hover:bg-purple-500/20"
                                data-testid={`open-portal-${campaign.id}`}
                                title="Open as sponsor"
                              >
                                <ExternalLink className="w-4 h-4" />
                              </Button>
                              <Button
                                onClick={() => revokeToken(existingToken.id)}
                                variant="outline"
                                size="sm"
                                className="border-orange-500/50 text-orange-400 hover:bg-orange-500/20"
                                data-testid={`revoke-portal-${campaign.id}`}
                                title="Revoke portal access"
                              >
                                <Shield className="w-4 h-4" />
                              </Button>
                            </>
                          );
                        }
                        return null;
                      })()}

                      {/* Campaign Actions */}
                      <Button
                        onClick={() => openEditCampaign(campaign)}
                        variant="outline"
                        size="sm"
                        className="border-white/20 text-white hover:bg-white/10"
                        data-testid={`edit-campaign-${campaign.id}`}
                        title="Edit campaign"
                      >
                        <Edit3 className="w-4 h-4" />
                      </Button>
                      <Button
                        onClick={() => duplicateCampaign(campaign.id)}
                        variant="outline"
                        size="sm"
                        className="border-white/20 text-white hover:bg-white/10"
                        data-testid={`duplicate-campaign-${campaign.id}`}
                        title="Duplicate campaign"
                      >
                        <RefreshCw className="w-4 h-4" />
                      </Button>
                      <Button
                        onClick={() => deleteCampaign(campaign.id)}
                        variant="outline"
                        size="sm"
                        className="border-red-500/50 text-red-400 hover:bg-red-500/20"
                        data-testid={`delete-campaign-${campaign.id}`}
                        title="Delete campaign"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}

              {campaigns.length === 0 && (
                <Card className="p-12 bg-white/5 border-white/10 text-center">
                  <Target className="w-16 h-16 text-muted mx-auto mb-4" />
                  <h3 className="font-medium text-white mb-2">No campaigns yet</h3>
                  <p className="text-muted mb-6">Create your first sponsorship campaign to get started.</p>
                  <Button
                    onClick={() => {
                      resetCampaignForm();
                      setEditingCampaign(null);
                      setShowCampaignForm(true);
                    }}
                    className="bg-copper-500 hover:bg-copper-600 text-black"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Create Campaign
                  </Button>
                </Card>
              )}
            </div>
          </TabsContent>

          {/* Portal Tokens Tab */}
          <TabsContent value="tokens" className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="font-fraunces text-xl font-bold text-white">
                Portal Token Management
              </h2>
              <Button
                onClick={() => setShowTokenForm(true)}
                className="bg-copper-500 hover:bg-copper-600 text-black"
                data-testid="create-token-button"
              >
                <Plus className="w-4 h-4 mr-2" />
                Generate Token
              </Button>
            </div>

            <div className="grid gap-4">
              {portalTokens.map((token) => (
                <Card key={token.id} className="p-6 bg-white/5 border-white/10">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium text-white mb-1">
                        {token.sponsor_campaigns.name}
                      </h3>
                      <p className="text-muted text-sm mb-2">
                        {token.sponsor_campaigns.sponsor_name}
                      </p>
                      <div className="flex items-center gap-4 text-xs text-muted">
                        <span>
                          <Clock className="w-3 h-3 inline mr-1" />
                          Created {formatDate(token.created_at)}
                        </span>
                        <span>
                          Expires {formatDate(token.expires_at)}
                        </span>
                        {token.last_accessed_at && (
                          <span>
                            Last used {formatDate(token.last_accessed_at)}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        onClick={() => copyPortalUrl(token.token)}
                        variant="outline"
                        size="sm"
                        className="border-white/20 text-white hover:bg-white/10"
                        data-testid={`copy-token-${token.id}`}
                      >
                        <Copy className="w-4 h-4 mr-2" />
                        Copy URL
                      </Button>
                      <Button
                        onClick={() => window.open(`/sponsor/${token.token}`, '_blank')}
                        variant="outline"
                        size="sm"
                        className="border-white/20 text-white hover:bg-white/10"
                        data-testid={`open-portal-${token.id}`}
                      >
                        <ExternalLink className="w-4 h-4" />
                      </Button>
                      <Button
                        onClick={() => revokeToken(token.id)}
                        variant="outline"
                        size="sm"
                        className="border-red-500/50 text-red-400 hover:bg-red-500/20"
                        data-testid={`revoke-token-${token.id}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}

              {portalTokens.length === 0 && (
                <Card className="p-12 bg-white/5 border-white/10 text-center">
                  <LinkIcon className="w-16 h-16 text-muted mx-auto mb-4" />
                  <h3 className="font-medium text-white mb-2">No portal tokens</h3>
                  <p className="text-muted mb-6">Generate secure portal access links for sponsors.</p>
                  <Button
                    onClick={() => setShowTokenForm(true)}
                    className="bg-copper-500 hover:bg-copper-600 text-black"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Generate Token
                  </Button>
                </Card>
              )}
            </div>
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics" className="space-y-6">
            <h2 className="font-fraunces text-xl font-bold text-white">
              System Analytics
            </h2>
            
            <div className="grid md:grid-cols-3 gap-6">
              <Card className="p-6 bg-white/5 border-white/10">
                <div className="flex items-center gap-3 mb-2">
                  <Target className="w-8 h-8 text-copper-500" />
                  <div>
                    <h3 className="font-medium text-white">Total Campaigns</h3>
                    <p className="text-2xl font-bold text-white">
                      {campaigns.length}
                    </p>
                  </div>
                </div>
              </Card>

              <Card className="p-6 bg-white/5 border-white/10">
                <div className="flex items-center gap-3 mb-2">
                  <Play className="w-8 h-8 text-green-500" />
                  <div>
                    <h3 className="font-medium text-white">Active Campaigns</h3>
                    <p className="text-2xl font-bold text-white">
                      {campaigns.filter(c => c.is_active).length}
                    </p>
                  </div>
                </div>
              </Card>

              <Card className="p-6 bg-white/5 border-white/10">
                <div className="flex items-center gap-3 mb-2">
                  <LinkIcon className="w-8 h-8 text-blue-500" />
                  <div>
                    <h3 className="font-medium text-white">Portal Tokens</h3>
                    <p className="text-2xl font-bold text-white">
                      {portalTokens.length}
                    </p>
                  </div>
                </div>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Campaign Form Dialog */}
      <Dialog open={showCampaignForm} onOpenChange={setShowCampaignForm}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-bg border-white/10">
          <DialogHeader>
            <DialogTitle className="text-white">
              {editingCampaign ? 'Edit Campaign' : 'Create Campaign'}
            </DialogTitle>
            <DialogDescription className="text-muted">
              Configure campaign details, targeting, and creative assets.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-6">
            {/* Basic Information */}
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name" className="text-white">Campaign Name</Label>
                <Input
                  id="name"
                  value={campaignForm.name}
                  onChange={(e) => setCampaignForm(prev => ({ ...prev, name: e.target.value }))}
                  className="bg-white/10 border-white/20 text-white"
                  placeholder="Summer Launch Campaign"
                />
              </div>
              <div>
                <Label htmlFor="sponsor_name" className="text-white">Sponsor Name</Label>
                <Input
                  id="sponsor_name"
                  value={campaignForm.sponsor_name}
                  onChange={(e) => setCampaignForm(prev => ({ ...prev, sponsor_name: e.target.value }))}
                  className="bg-white/10 border-white/20 text-white"
                  placeholder="Acme Corp"
                />
              </div>
            </div>

            {/* Content */}
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="headline" className="text-white">Headline</Label>
                <Input
                  id="headline"
                  value={campaignForm.headline}
                  onChange={(e) => setCampaignForm(prev => ({ ...prev, headline: e.target.value }))}
                  className="bg-white/10 border-white/20 text-white"
                  placeholder="Transform Your Business Today"
                />
              </div>
              <div>
                <Label htmlFor="cta_text" className="text-white">CTA Text</Label>
                <Input
                  id="cta_text"
                  value={campaignForm.cta_text}
                  onChange={(e) => setCampaignForm(prev => ({ ...prev, cta_text: e.target.value }))}
                  className="bg-white/10 border-white/20 text-white"
                  placeholder="Learn More"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="subline" className="text-white">Subline (Optional)</Label>
              <Input
                id="subline"
                value={campaignForm.subline}
                onChange={(e) => setCampaignForm(prev => ({ ...prev, subline: e.target.value }))}
                className="bg-white/10 border-white/20 text-white"
                placeholder="Discover innovative solutions for your team"
              />
            </div>

            <div>
              <Label htmlFor="click_url" className="text-white">Click URL</Label>
              <Input
                id="click_url"
                value={campaignForm.click_url}
                onChange={(e) => setCampaignForm(prev => ({ ...prev, click_url: e.target.value }))}
                className="bg-white/10 border-white/20 text-white"
                placeholder="https://example.com/landing"
              />
              <p className="text-xs text-muted mt-1">UTM parameters will be auto-added if not present</p>
            </div>

            {/* Targeting & Settings */}
            <div className="grid md:grid-cols-3 gap-4">
              <div>
                <Label className="text-white">Placements</Label>
                <div className="space-y-2 mt-2">
                  {['events_banner', 'home_mid'].map((placement) => (
                    <div key={placement} className="flex items-center space-x-2">
                      <Checkbox
                        id={placement}
                        checked={campaignForm.placements.includes(placement)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setCampaignForm(prev => ({
                              ...prev,
                              placements: [...prev.placements, placement]
                            }));
                          } else {
                            setCampaignForm(prev => ({
                              ...prev,
                              placements: prev.placements.filter(p => p !== placement)
                            }));
                          }
                        }}
                      />
                      <Label htmlFor={placement} className="text-white text-sm">
                        {placement.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              {process.env.NODE_ENV === 'development' && (
                <div>
                  <Label htmlFor="freq_cap" className="text-white">Frequency Cap (per day) - MVP: 0 = No Cap</Label>
                  <Input
                    id="freq_cap"
                    type="number"
                    min="0"
                    value={campaignForm.freq_cap_per_user_per_day}
                    onChange={(e) => setCampaignForm(prev => ({ 
                      ...prev, 
                      freq_cap_per_user_per_day: parseInt(e.target.value) || 0 
                    }))}
                    className="bg-white/10 border-white/20 text-white"
                  />
                  <p className="text-xs text-muted mt-1">0 = no limit</p>
                </div>
              )}

              <div>
                <Label htmlFor="priority" className="text-white">Priority</Label>
                <Input
                  id="priority"
                  type="number"
                  min="1"
                  value={campaignForm.priority}
                  onChange={(e) => setCampaignForm(prev => ({ 
                    ...prev, 
                    priority: parseInt(e.target.value) || 1 
                  }))}
                  className="bg-white/10 border-white/20 text-white"
                />
              </div>
            </div>

            {/* Dates */}
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="start_at" className="text-white">Start Date</Label>
                <Input
                  id="start_at"
                  type="date"
                  value={campaignForm.start_at}
                  onChange={(e) => setCampaignForm(prev => ({ ...prev, start_at: e.target.value }))}
                  className="bg-white/10 border-white/20 text-white"
                />
              </div>
              <div>
                <Label htmlFor="end_at" className="text-white">End Date</Label>
                <Input
                  id="end_at"
                  type="date"
                  value={campaignForm.end_at}
                  onChange={(e) => setCampaignForm(prev => ({ ...prev, end_at: e.target.value }))}
                  className="bg-white/10 border-white/20 text-white"
                />
              </div>
            </div>

            {/* Switches */}
            <div className="flex items-center gap-6">
              <div className="flex items-center space-x-2">
                <Switch
                  id="is_active"
                  checked={campaignForm.is_active}
                  onCheckedChange={(checked) => setCampaignForm(prev => ({ ...prev, is_active: checked }))}
                />
                <Label htmlFor="is_active" className="text-white">Active</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="is_sponsored"
                  checked={campaignForm.is_sponsored}
                  onCheckedChange={(checked) => setCampaignForm(prev => ({ ...prev, is_sponsored: checked }))}
                />
                <Label htmlFor="is_sponsored" className="text-white">Show "Sponsored" Label</Label>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              onClick={() => setShowCampaignForm(false)}
              variant="outline"
              className="border-white/20 text-white hover:bg-white/10"
            >
              Cancel
            </Button>
            <Button
              onClick={saveCampaign}
              className="bg-copper-500 hover:bg-copper-600 text-black"
              data-testid="save-campaign-button"
            >
              {editingCampaign ? 'Update Campaign' : 'Create Campaign'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Portal Token Form Dialog */}
      <Dialog open={showTokenForm} onOpenChange={setShowTokenForm}>
        <DialogContent className="bg-bg border-white/10">
          <DialogHeader>
            <DialogTitle className="text-white">Generate Portal Token</DialogTitle>
            <DialogDescription className="text-muted">
              Create a secure analytics portal link for a sponsor.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="campaignId" className="text-white">Campaign</Label>
              <Select 
                value={tokenForm.campaignId} 
                onValueChange={(value) => setTokenForm(prev => ({ ...prev, campaignId: value }))}
              >
                <SelectTrigger className="bg-white/10 border-white/20 text-white">
                  <SelectValue placeholder="Select campaign" />
                </SelectTrigger>
                <SelectContent>
                  {campaigns.map((campaign) => (
                    <SelectItem key={campaign.id} value={campaign.id}>
                      {campaign.name} ({campaign.sponsor_name})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="hoursValid" className="text-white">Valid for (hours)</Label>
              <Input
                id="hoursValid"
                type="number"
                min="1"
                value={tokenForm.hoursValid}
                onChange={(e) => setTokenForm(prev => ({ 
                  ...prev, 
                  hoursValid: parseInt(e.target.value) || 24 
                }))}
                className="bg-white/10 border-white/20 text-white"
              />
              <p className="text-xs text-muted mt-1">Default: 720 hours (30 days)</p>
            </div>
          </div>

          <DialogFooter>
            <Button
              onClick={() => setShowTokenForm(false)}
              variant="outline"
              className="border-white/20 text-white hover:bg-white/10"
            >
              Cancel
            </Button>
            <Button
              onClick={createPortalToken}
              className="bg-copper-500 hover:bg-copper-600 text-black"
              disabled={!tokenForm.campaignId}
              data-testid="create-portal-token-button"
            >
              Generate Token
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Email Composer Modal */}
      <Dialog open={showEmailForm} onOpenChange={setShowEmailForm}>
        <DialogContent className="bg-bg border-white/20 text-white max-w-2xl">
          <DialogHeader>
            <DialogTitle className="font-fraunces text-xl">
              Send Portal Link
            </DialogTitle>
            <DialogDescription className="text-muted">
              {selectedToken && `Send portal access for "${selectedToken.sponsor_campaigns.name}" campaign`}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label className="text-white mb-2 block">Recipient Email(s)</Label>
              {emailForm.recipients.map((email, index) => (
                <div key={index} className="flex gap-2 mb-2">
                  <Input
                    value={email}
                    onChange={(e) => {
                      const newRecipients = [...emailForm.recipients];
                      newRecipients[index] = e.target.value;
                      setEmailForm(prev => ({ ...prev, recipients: newRecipients }));
                    }}
                    placeholder="sponsor@company.com"
                    className="bg-white/10 border-white/20 text-white"
                  />
                  {emailForm.recipients.length > 1 && (
                    <Button
                      onClick={() => {
                        const newRecipients = emailForm.recipients.filter((_, i) => i !== index);
                        setEmailForm(prev => ({ ...prev, recipients: newRecipients }));
                      }}
                      variant="outline"
                      size="sm"
                      className="border-red-500/50 text-red-400 hover:bg-red-500/20"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              ))}
              <Button
                onClick={() => {
                  setEmailForm(prev => ({ ...prev, recipients: [...prev.recipients, ''] }));
                }}
                variant="outline"
                size="sm"
                className="border-white/20 text-white hover:bg-white/10"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Email
              </Button>
            </div>

            <div>
              <Label className="text-white mb-2 block">Message</Label>
              <Textarea
                value={emailForm.message}
                onChange={(e) => setEmailForm(prev => ({ ...prev, message: e.target.value }))}
                placeholder="Your sponsor analytics portal is ready! Please find your personalized dashboard link below."
                className="bg-white/10 border-white/20 text-white min-h-[120px]"
              />
            </div>

            {selectedToken && (
              <div className="p-4 bg-white/5 border border-white/10 rounded-lg">
                <h4 className="font-medium text-white mb-2">Portal Details</h4>
                <div className="text-sm text-muted space-y-1">
                  <p><strong>Campaign:</strong> {selectedToken.sponsor_campaigns.name}</p>
                  <p><strong>Sponsor:</strong> {selectedToken.sponsor_campaigns.sponsor_name}</p>
                  <p><strong>Expires:</strong> {formatDate(selectedToken.expires_at)}</p>
                  <p><strong>Portal URL:</strong> {window.location.origin}/sponsor/{selectedToken.token}</p>
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              onClick={() => setShowEmailForm(false)}
              variant="outline"
              className="border-white/20 text-white hover:bg-white/10"
            >
              Cancel
            </Button>
            <Button
              onClick={sendPortalEmail}
              className="bg-copper-500 hover:bg-copper-600 text-black"
              disabled={!emailForm.recipients.some(email => email.trim())}
            >
              <Mail className="w-4 h-4 mr-2" />
              Prepare Email
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}