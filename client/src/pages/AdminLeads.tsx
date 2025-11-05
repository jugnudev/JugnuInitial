import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import AdminLeadsList from '@/components/AdminLeadsList';
import { Shield, Users, DollarSign, TrendingUp, RefreshCcw } from 'lucide-react';
import AdminNav from '@/components/AdminNav';

export default function AdminLeads() {
  const [refreshingEvents, setRefreshingEvents] = useState(false);
  const [adminKey, setAdminKey] = useState(() => {
    try {
      return localStorage.getItem('adminKey') || '';
    } catch {
      return '';
    }
  });
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  
  // Check if admin key is valid  
  const { data: authCheck, error: authError, refetch: checkAuth } = useQuery({
    queryKey: ['admin-auth-check', adminKey],
    queryFn: async () => {
      if (!adminKey.trim()) return null;
      
      const response = await fetch('/api/admin/leads?limit=1', {
        headers: { 'x-admin-key': adminKey.trim() }
      });
      
      if (!response.ok) {
        throw new Error('Invalid admin key');
      }
      
      return true;
    },
    enabled: false, // Don't auto-run, we'll trigger manually
    retry: false
  });
  
  useEffect(() => {
    if (authCheck) {
      try {
        localStorage.setItem('adminKey', adminKey);
      } catch (e) {
        console.warn('Failed to save admin key to localStorage:', e);
      }
      setIsAuthenticated(true);
    }
  }, [authCheck, adminKey]);
  
  // Stats query for authenticated users
  const { data: stats } = useQuery({
    queryKey: ['admin-leads-stats', adminKey],
    queryFn: async () => {
      const response = await fetch('/api/admin/leads', {
        headers: { 'x-admin-key': adminKey.trim() }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch stats');
      }
      
      const result = await response.json();
      const leads = result.leads || [];
      
      return {
        totalLeads: leads.length,
        newLeads: leads.filter((l: any) => l.status === 'new').length,
        totalRevenue: leads.filter((l: any) => l.status === 'approved' || l.status === 'onboarded').reduce((sum: number, lead: any) => sum + (lead.total_cents || 0), 0),
        promoUsage: leads.filter((l: any) => l.promo_applied).length
      };
    },
    enabled: isAuthenticated && !!adminKey.trim()
  });
  
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-black p-6">
        <div className="max-w-md mx-auto mt-20">
          <Card className="border border-gray-800 bg-gray-900/50 backdrop-blur shadow-2xl">
            <CardHeader className="text-center pb-8">
              <div className="mx-auto mb-6 w-20 h-20 bg-gradient-to-br from-orange-500 to-red-600 rounded-full flex items-center justify-center shadow-lg">
                <Shield className="h-10 w-10 text-white" />
              </div>
              <CardTitle className="text-3xl font-bold bg-gradient-to-r from-orange-400 to-red-400 bg-clip-text text-transparent">Admin Access</CardTitle>
              <p className="text-gray-300 mt-2">Enter admin key to access sponsor leads management</p>
            </CardHeader>
            <CardContent className="space-y-6 pt-4">
              <Input
                type="password"
                placeholder="Admin key"
                value={adminKey}
                onChange={(e) => setAdminKey(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && adminKey.trim() && checkAuth()}
                className="h-12 text-center text-lg border-2 border-gray-700 bg-gray-800 text-white placeholder:text-gray-400 focus:border-orange-500"
                autoComplete="new-password"
                data-testid="input-admin-key"
              />
              
              {authError && (
                <Alert variant="destructive" className="border-red-600 bg-red-900/50">
                  <AlertDescription className="text-red-200">
                    Invalid admin key. Please check and try again.
                  </AlertDescription>
                </Alert>
              )}
              
              <Button
                onClick={async () => {
                  if (adminKey.trim()) {
                    // Trigger the auth check manually
                    checkAuth();
                  }
                }}
                className="w-full h-12 text-lg bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 shadow-lg !text-white font-semibold"
                disabled={!adminKey.trim()}
                data-testid="button-login"
              >
                Access Admin Panel
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-black">
      <AdminNav />
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-orange-400 to-red-400 bg-clip-text text-transparent">Sponsor Leads Management</h1>
              <p className="text-gray-300 mt-2 text-lg">Manage sponsor applications and track conversions</p>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={async () => {
                  setRefreshingEvents(true);
                  try {
                    const { toast } = await import('@/hooks/use-toast');
                    const response = await fetch('/api/admin/refresh-events', {
                      method: 'POST',
                      headers: {
                        'x-admin-key': adminKey || ''
                      }
                    });
                    
                    if (response.ok) {
                      const data = await response.json();
                      toast({
                        title: 'Events Refreshed',
                        description: `Imported: ${data.imported}, Updated: ${data.updated}`,
                      });
                    } else {
                      const error = await response.json();
                      toast({
                        title: 'Refresh Failed',
                        description: error.error || 'Failed to refresh events',
                        variant: 'destructive'
                      });
                    }
                  } catch (error) {
                    const { toast } = await import('@/hooks/use-toast');
                    toast({
                      title: 'Error',
                      description: 'Failed to refresh events',
                      variant: 'destructive'
                    });
                  } finally {
                    setRefreshingEvents(false);
                  }
                }}
                disabled={refreshingEvents}
                className="bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700"
              >
                <RefreshCcw className={`h-4 w-4 mr-2 ${refreshingEvents ? 'animate-spin' : ''}`} />
                {refreshingEvents ? 'Refreshing...' : 'Refresh Events'}
              </Button>
              <Button
                variant="outline"
                className="border-gray-700 bg-gray-800 text-white hover:bg-gray-700"
                onClick={() => {
                  setAdminKey('');
                  setIsAuthenticated(false);
                }}
                data-testid="button-logout"
              >
                Logout
              </Button>
            </div>
          </div>
        </div>
        
        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <Card className="border border-gray-800 bg-gray-900/50 backdrop-blur shadow-lg">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-300">Total Leads</CardTitle>
                <Users className="h-5 w-5 text-orange-400" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-white" data-testid="stat-total-leads">
                  {stats.totalLeads}
                </div>
              </CardContent>
            </Card>
            
            <Card className="border border-gray-800 bg-gradient-to-br from-orange-500 to-red-600 text-white shadow-lg">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-orange-100">New Leads</CardTitle>
                <TrendingUp className="h-5 w-5 text-orange-200" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-white" data-testid="stat-new-leads">
                  {stats.newLeads}
                </div>
              </CardContent>
            </Card>
            
            <Card className="border border-gray-800 bg-gradient-to-br from-green-500 to-emerald-600 text-white shadow-lg">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-green-100">Approved Revenue</CardTitle>
                <DollarSign className="h-5 w-5 text-green-200" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-white" data-testid="stat-revenue">
                  CA${(stats.totalRevenue / 100).toLocaleString()}
                </div>
              </CardContent>
            </Card>
            
            <Card className="border border-gray-800 bg-gradient-to-br from-purple-500 to-pink-600 text-white shadow-lg">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-purple-100">Promo Usage</CardTitle>
                <Shield className="h-5 w-5 text-purple-200" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-white" data-testid="stat-promo-usage">
                  {stats.promoUsage}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
        
        {/* Leads List */}
        <AdminLeadsList adminKey={adminKey} />
      </div>
    </div>
  );
}