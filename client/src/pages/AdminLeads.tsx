import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import AdminLeadsList from '@/components/AdminLeadsList';
import { Shield, Users, DollarSign, TrendingUp } from 'lucide-react';

export default function AdminLeads() {
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
        totalRevenue: leads.reduce((sum: number, lead: any) => sum + (lead.total_cents || 0), 0),
        promoUsage: leads.filter((l: any) => l.promo_applied).length
      };
    },
    enabled: isAuthenticated && !!adminKey.trim()
  });
  
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 p-6">
        <div className="max-w-md mx-auto mt-20">
          <Card>
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center">
                <Shield className="h-8 w-8 text-purple-600" />
              </div>
              <CardTitle className="text-2xl">Admin Access</CardTitle>
              <p className="text-gray-600">Enter admin key to access leads management</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input
                type="password"
                placeholder="Admin key"
                value={adminKey}
                onChange={(e) => setAdminKey(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && adminKey.trim() && checkAuth()}
                data-testid="input-admin-key"
              />
              
              {authError && (
                <Alert variant="destructive">
                  <AlertDescription>
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
                className="w-full"
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
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50">
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Sponsor Leads Management</h1>
              <p className="text-gray-600 mt-1">Manage sponsor applications and track conversions</p>
            </div>
            <Button
              variant="outline"
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
        
        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Leads</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="stat-total-leads">
                  {stats.totalLeads}
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">New Leads</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600" data-testid="stat-new-leads">
                  {stats.newLeads}
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600" data-testid="stat-revenue">
                  CA${(stats.totalRevenue / 100).toLocaleString()}
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Promo Usage</CardTitle>
                <Shield className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-purple-600" data-testid="stat-promo-usage">
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