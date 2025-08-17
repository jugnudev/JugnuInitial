import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import AdminLeadsList from '@/components/AdminLeadsList';
import { Shield, Users, DollarSign, TrendingUp } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { ENDPOINTS } from '@/lib/endpoints';
import { useAdminAuth } from '@/lib/AdminAuthProvider';
import { useAdminFetch } from '@/lib/fetchAdmin';
import AdminLogin from '@/components/admin/AdminLogin';



// Debug banner component
function AdminDebugBanner() {
  const { adminKey, isAuthed } = useAdminAuth();
  const adminFetch = useAdminFetch();
  
  if (new URLSearchParams(location.search).get('debug') !== '1') return null;
  
  const test = async () => {
    try {
      const r = await adminFetch('/api/admin/echo-auth');
      console.log('echo-auth', r.status, await r.text());
    } catch (error) {
      console.error('echo-auth error:', error);
    }
  };
  
  return (
    <div className="p-2 text-xs bg-amber-900/40 rounded mb-2">
      <div>isAuthed: {String(isAuthed)} | keyLen: {adminKey ? adminKey.length : 0}</div>
      <button onClick={test} className="underline">Test echo-auth</button>
    </div>
  );
}

export default function AdminLeads() {
  const { isAuthed, logout } = useAdminAuth();
  const adminFetch = useAdminFetch();
  
  // Load data function
  const loadData = async () => {
    try {
      const response = await adminFetch('/admin/leads/api');
      
      if (response.status === 401 || response.status === 403) {
        throw new Error('UNAUTH');
      }
      
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
      if (error instanceof Error && error.message === 'UNAUTH') {
        logout();
      }
      return null;
    }
  };

  // Stats query for authenticated users - only when authenticated
  const { data: stats, error } = useQuery({
    queryKey: ['admin-leads-stats'],
    queryFn: loadData,
    enabled: isAuthed,
    retry: false
  });
  
  // Show login form if not authenticated
  if (!isAuthed) {
    return <AdminLogin />;
  }

  // If authentication error, show login
  if (error instanceof Error && error.message === 'UNAUTH') {
    return <AdminLogin />;
  }
  
  return (
    <div className="min-h-screen bg-bg">
      <div className="max-w-7xl mx-auto p-6">
        {/* Debug banner */}
        <AdminDebugBanner />
        
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