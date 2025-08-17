import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import AdminLeadsList from '@/components/AdminLeadsList';
import { Shield, Users, DollarSign, TrendingUp } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { ENDPOINTS } from '@/lib/endpoints';

interface AdminSession {
  isAdmin: boolean;
  loginTime?: number;
}

export default function AdminLeads() {
  const [session, setSession] = useState<AdminSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [showLoginForm, setShowLoginForm] = useState(false);
  const [loginPassword, setLoginPassword] = useState('');
  const [adminKey, setAdminKey] = useState(localStorage.getItem('adminKey') || '');
  
  // Check admin session on load
  useEffect(() => {
    checkSession();
  }, []);

  const checkSession = async () => {
    try {
      const response = await fetch(ENDPOINTS.ADMIN.SESSION);
      const data = await response.json();
      
      if (data.ok && data.isAdmin) {
        // Session is already valid, restore admin key if it exists
        const existingKey = localStorage.getItem('adminKey');
        if (existingKey) {
          setAdminKey(existingKey);
        }
        setSession({ isAdmin: true, loginTime: data.loginTime });
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
      const response = await fetch(ENDPOINTS.ADMIN.LOGIN, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: loginPassword })
      });
      
      const data = await response.json();
      
      if (data.ok) {
        // Store the correct admin key for API authentication
        localStorage.setItem('adminKey', 'jugnu-admin-dev-2025');
        setAdminKey('jugnu-admin-dev-2025');
        setSession({ isAdmin: true, loginTime: Date.now() });
        setShowLoginForm(false);
        setLoginPassword('');
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
      await fetch(ENDPOINTS.ADMIN.LOGOUT, { method: 'POST' });
      localStorage.removeItem('adminKey');
      setAdminKey('');
      setSession(null);
      setShowLoginForm(true);
      toast({ title: "Logged out successfully" });
    } catch (error) {
      console.error('Logout error:', error);
    }
  };
  
  // Load data function
  const loadData = async () => {
    try {
      const response = await fetch('/admin/leads/api');
      
      if (!response.ok) {
        throw new Error('Failed to fetch stats');
      }
      
      const result = await response.json();
      const leads = result.leads || [];
      
      return {
        totalLeads: leads.length,
        newLeads: leads.filter((l: any) => l.status === 'new').length,
        totalRevenue: leads.reduce((sum: number, lead: any) => sum + (lead.total_cents || 0), 0),
        promoUsage: leads.filter((l: any) => l.promo_applied).length
      };
    } catch (error) {
      console.error('Failed to load stats:', error);
      return null;
    }
  };

  // Stats query for authenticated users - only when authenticated
  const { data: stats } = useQuery({
    queryKey: ['admin-leads-stats'],
    queryFn: loadData,
    enabled: !!session?.isAdmin,
    retry: false
  });
  
  if (loading && !showLoginForm) {
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
              Admin Login - Sponsor Leads
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
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Shield className="w-8 h-8 text-copper-500" />
              <div>
                <h1 className="font-fraunces text-3xl font-bold text-white">Sponsor Leads Management</h1>
                <p className="text-muted mt-1">Manage sponsor applications and track conversions</p>
              </div>
            </div>
            <Button
              variant="outline"
              onClick={logout}
              className="border-white/20 text-white hover:bg-white/10"
              data-testid="button-logout"
            >
              Logout
            </Button>
          </div>
        </div>
        
        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <Card className="bg-white/5 border-white/10">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-white">Total Leads</CardTitle>
                <Users className="h-4 w-4 text-copper-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white" data-testid="stat-total-leads">
                  {stats.totalLeads}
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-white/5 border-white/10">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-white">New Leads</CardTitle>
                <TrendingUp className="h-4 w-4 text-copper-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-400" data-testid="stat-new-leads">
                  {stats.newLeads}
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-white/5 border-white/10">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-white">Total Revenue</CardTitle>
                <DollarSign className="h-4 w-4 text-copper-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-400" data-testid="stat-revenue">
                  CA${(stats.totalRevenue / 100).toLocaleString()}
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-white/5 border-white/10">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-white">Promo Usage</CardTitle>
                <Shield className="h-4 w-4 text-copper-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-purple-400" data-testid="stat-promo-usage">
                  {stats.promoUsage}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
        
        {/* Leads List */}
        <AdminLeadsList sessionBased={true} />
      </div>
    </div>
  );
}