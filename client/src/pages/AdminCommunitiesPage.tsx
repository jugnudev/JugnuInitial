import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from '@/hooks/use-toast';
import { queryClient } from '@/lib/queryClient';
import AdminNav from '@/components/AdminNav';
import SelfTestResults from '@/components/SelfTestResults';
import { 
  Shield, 
  Users, 
  CheckCircle, 
  XCircle, 
  Eye, 
  Clock, 
  Building2, 
  Mail, 
  DollarSign,
  Activity,
  Download,
  Search,
  Filter,
  RefreshCw,
  AlertTriangle,
  Pause,
  Play,
  FileJson,
  TestTube
} from 'lucide-react';
import { format } from 'date-fns';

interface CommunityAdmin {
  id: string;
  name: string;
  slug: string;
  ownerId: string;
  ownerEmail: string;
  ownerName?: string;
  memberCount: number;
  postCount: number;
  subscriptionStatus: 'trial' | 'active' | 'cancelled' | 'expired' | 'suspended' | 'none';
  subscriptionEndDate?: string;
  monthlyRevenue: number;
  createdAt: string;
  updatedAt: string;
  lastActivity?: string;
  isSuspended: boolean;
  suspendedReason?: string;
  suspendedAt?: string;
}

interface PlatformMetrics {
  totalCommunities: number;
  activeSubscriptions: number;
  totalMembers: number;
  monthlyRevenue: number;
  trialCommunities: number;
  suspendedCommunities: number;
}

const getStatusBadge = (status: string, isSuspended: boolean) => {
  if (isSuspended) {
    return <Badge className="bg-red-500/20 text-red-500">Suspended</Badge>;
  }
  
  switch (status) {
    case 'active':
      return <Badge className="bg-green-500/20 text-green-500">Active</Badge>;
    case 'trial':
      return <Badge className="bg-blue-500/20 text-blue-500">Trial</Badge>;
    case 'cancelled':
      return <Badge className="bg-yellow-500/20 text-yellow-500">Cancelled</Badge>;
    case 'expired':
      return <Badge className="bg-gray-500/20 text-gray-500">Expired</Badge>;
    default:
      return <Badge className="bg-gray-500/20 text-gray-500">None</Badge>;
  }
};

export default function AdminCommunitiesPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [adminKey, setAdminKey] = useState(() => {
    try {
      return localStorage.getItem('adminKey') || '';
    } catch {
      return '';
    }
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedCommunity, setSelectedCommunity] = useState<CommunityAdmin | null>(null);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
  const [isSuspendDialogOpen, setIsSuspendDialogOpen] = useState(false);
  const [suspendReason, setSuspendReason] = useState('');
  const [showSelfTest, setShowSelfTest] = useState(false);
  const [selfTestResults, setSelfTestResults] = useState<any>(null);
  
  // Custom dialog states
  const [restoreCommunityDialog, setRestoreCommunityDialog] = useState<{ open: boolean; community: CommunityAdmin | null }>({ open: false, community: null });

  // Check authentication
  const { data: authCheck, refetch: checkAuth } = useQuery({
    queryKey: ['admin-communities-auth', adminKey],
    queryFn: async () => {
      if (!adminKey.trim()) return null;
      
      const response = await fetch('/api/admin/communities', {
        headers: { 'x-admin-key': adminKey.trim() }
      });
      
      if (!response.ok) {
        throw new Error('Invalid admin key');
      }
      
      return true;
    },
    enabled: false,
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

  // Fetch communities
  const { data: communitiesData, isLoading, refetch: refetchCommunities } = useQuery({
    queryKey: ['/api/admin/communities'],
    queryFn: async () => {
      const response = await fetch('/api/admin/communities', {
        headers: { 'x-admin-key': adminKey.trim() }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch communities');
      }
      
      return response.json();
    },
    enabled: isAuthenticated
  });

  // Fetch platform metrics
  const { data: metricsData } = useQuery({
    queryKey: ['/api/admin/communities/metrics'],
    queryFn: async () => {
      const response = await fetch('/api/admin/communities/metrics', {
        headers: { 'x-admin-key': adminKey.trim() }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch metrics');
      }
      
      return response.json();
    },
    enabled: isAuthenticated
  });

  const communities: CommunityAdmin[] = communitiesData?.communities || [];
  const metrics: PlatformMetrics = metricsData?.metrics || {
    totalCommunities: 0,
    activeSubscriptions: 0,
    totalMembers: 0,
    monthlyRevenue: 0,
    trialCommunities: 0,
    suspendedCommunities: 0
  };

  // Filter communities
  const filteredCommunities = communities.filter(community => {
    const matchesSearch = searchTerm === '' || 
      community.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      community.ownerEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
      community.id.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || 
      (statusFilter === 'suspended' && community.isSuspended) ||
      (statusFilter === community.subscriptionStatus && !community.isSuspended);
    
    return matchesSearch && matchesStatus;
  });

  // Run self-test mutation
  const selfTestMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/admin/communities/selftest', {
        headers: { 'x-admin-key': adminKey.trim() }
      });

      if (!response.ok) {
        throw new Error('Failed to run self-test');
      }

      return response.json();
    },
    onSuccess: (data) => {
      setSelfTestResults(data);
      setShowSelfTest(true);
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to run self-test',
        variant: 'destructive',
      });
    }
  });

  // Suspend community mutation
  const suspendMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      const response = await fetch(`/api/admin/communities/${id}/suspend`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-key': adminKey.trim()
        },
        body: JSON.stringify({ reason })
      });

      if (!response.ok) {
        throw new Error('Failed to suspend community');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/communities'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/communities/metrics'] });
      toast({
        title: 'Community Suspended',
        description: 'The community has been suspended successfully.',
      });
      setIsSuspendDialogOpen(false);
      setSuspendReason('');
      setSelectedCommunity(null);
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to suspend community.',
        variant: 'destructive',
      });
    }
  });

  // Restore community mutation
  const restoreMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/admin/communities/${id}/restore`, {
        method: 'POST',
        headers: {
          'x-admin-key': adminKey.trim()
        }
      });

      if (!response.ok) {
        throw new Error('Failed to restore community');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/communities'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/communities/metrics'] });
      toast({
        title: 'Community Restored',
        description: 'The community has been restored successfully.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to restore community.',
        variant: 'destructive',
      });
    }
  });

  const handleViewDetails = async (community: CommunityAdmin) => {
    // Fetch detailed info
    try {
      const response = await fetch(`/api/admin/communities/${community.id}/details`, {
        headers: { 'x-admin-key': adminKey.trim() }
      });
      
      if (response.ok) {
        const details = await response.json();
        setSelectedCommunity({ ...community, ...details.community });
      } else {
        setSelectedCommunity(community);
      }
    } catch {
      setSelectedCommunity(community);
    }
    
    setIsDetailsDialogOpen(true);
  };

  const handleSuspend = (community: CommunityAdmin) => {
    setSelectedCommunity(community);
    setSuspendReason('');
    setIsSuspendDialogOpen(true);
  };

  const confirmSuspend = () => {
    if (selectedCommunity) {
      suspendMutation.mutate({
        id: selectedCommunity.id,
        reason: suspendReason
      });
    }
  };

  const handleRestore = (community: CommunityAdmin) => {
    setRestoreCommunityDialog({ open: true, community });
  };

  const exportToCSV = () => {
    const headers = [
      'ID', 'Name', 'Owner Email', 'Members', 'Posts', 
      'Subscription Status', 'Monthly Revenue', 'Created', 'Last Activity'
    ].join(',');
    
    const rows = filteredCommunities.map(c => [
      c.id,
      `"${c.name}"`,
      c.ownerEmail,
      c.memberCount,
      c.postCount,
      c.isSuspended ? 'SUSPENDED' : c.subscriptionStatus,
      c.monthlyRevenue.toFixed(2),
      format(new Date(c.createdAt), 'yyyy-MM-dd'),
      c.lastActivity ? format(new Date(c.lastActivity), 'yyyy-MM-dd') : 'Never'
    ].join(','));
    
    const csv = [headers, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `communities-export-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
  };

  // Admin key entry form
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-black text-white p-8">
        <div className="max-w-md mx-auto">
          <Card className="bg-black/60 border-copper-500/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-copper-500">
                <Shield className="w-5 h-5" />
                Admin Access - Communities Management
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="adminKey">Admin Key</Label>
                <Input
                  id="adminKey"
                  type="password"
                  value={adminKey}
                  onChange={(e) => setAdminKey(e.target.value)}
                  placeholder="Enter admin key"
                  data-testid="input-admin-key"
                />
              </div>
              <Button 
                onClick={() => checkAuth()} 
                className="w-full bg-copper-500 hover:bg-copper-600 text-black"
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
    <div className="min-h-screen bg-black text-white">
      <AdminNav />
      
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Users className="w-6 h-6 text-copper-500" />
            <h1 className="text-2xl font-bold text-white">Communities Management</h1>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              onClick={() => refetchCommunities()} 
              variant="outline"
              className="border-copper-500/20"
              data-testid="button-refresh"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
            <Button 
              onClick={exportToCSV}
              variant="outline"
              className="border-copper-500/20"
              data-testid="button-export"
            >
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </Button>
            <Button 
              onClick={() => selfTestMutation.mutate()}
              className="bg-copper-500 hover:bg-copper-600 text-black"
              disabled={selfTestMutation.isPending}
              data-testid="button-selftest"
            >
              <TestTube className="w-4 h-4 mr-2" />
              {selfTestMutation.isPending ? 'Running...' : 'Run System Self-Test'}
            </Button>
          </div>
        </div>

        {/* Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Card className="bg-black/60 border-copper-500/20">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-white/80">
                Total Communities
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{metrics.totalCommunities}</div>
              <p className="text-sm text-white/60 mt-1">
                {metrics.trialCommunities} in trial
              </p>
            </CardContent>
          </Card>

          <Card className="bg-black/60 border-copper-500/20">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-white/80">
                Active Subscriptions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-500">{metrics.activeSubscriptions}</div>
              <p className="text-sm text-white/60 mt-1">
                {metrics.suspendedCommunities} suspended
              </p>
            </CardContent>
          </Card>

          <Card className="bg-black/60 border-copper-500/20">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-white/80">
                Total Members
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{metrics.totalMembers}</div>
              <p className="text-sm text-white/60 mt-1">
                Across all communities
              </p>
            </CardContent>
          </Card>

          <Card className="bg-black/60 border-copper-500/20">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-white/80">
                Monthly Revenue
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-copper-500">
                ${metrics.monthlyRevenue.toFixed(2)}
              </div>
              <p className="text-sm text-white/60 mt-1">
                Recurring revenue
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Search and Filters */}
        <Card className="bg-black/60 border-copper-500/20 mb-6">
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-white/40" />
                  <Input
                    placeholder="Search by name, email, or ID..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 bg-black/40 border-white/20"
                    data-testid="input-search"
                  />
                </div>
              </div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-4 py-2 bg-black/40 border border-white/20 rounded-md text-white"
                data-testid="select-status-filter"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="trial">Trial</option>
                <option value="cancelled">Cancelled</option>
                <option value="expired">Expired</option>
                <option value="suspended">Suspended</option>
                <option value="none">No Subscription</option>
              </select>
            </div>
          </CardContent>
        </Card>

        {/* Communities Table */}
        {isLoading ? (
          <Card className="bg-black/60 border-copper-500/20">
            <CardContent className="p-8 text-center">
              <div className="animate-spin w-8 h-8 border-2 border-copper-500 border-t-transparent rounded-full mx-auto mb-4" />
              <p className="text-white/80">Loading communities...</p>
            </CardContent>
          </Card>
        ) : filteredCommunities.length === 0 ? (
          <Card className="bg-black/60 border-copper-500/20">
            <CardContent className="p-8 text-center">
              <Users className="w-12 h-12 text-white/40 mx-auto mb-4" />
              <p className="text-white/80 text-lg mb-2">No Communities Found</p>
              <p className="text-white/60">
                {searchTerm || statusFilter !== 'all' 
                  ? 'Try adjusting your search or filters' 
                  : 'Communities will appear here once created'}
              </p>
            </CardContent>
          </Card>
        ) : (
          <Card className="bg-black/60 border-copper-500/20">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b border-white/10">
                  <tr>
                    <th className="text-left p-4 font-medium text-white/80">Community</th>
                    <th className="text-left p-4 font-medium text-white/80">Owner</th>
                    <th className="text-center p-4 font-medium text-white/80">Members</th>
                    <th className="text-center p-4 font-medium text-white/80">Status</th>
                    <th className="text-left p-4 font-medium text-white/80">Created</th>
                    <th className="text-left p-4 font-medium text-white/80">Last Activity</th>
                    <th className="text-center p-4 font-medium text-white/80">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCommunities.map((community) => (
                    <tr key={community.id} className="border-b border-border hover:bg-card">
                      <td className="p-4">
                        <div>
                          <div className="font-medium text-white">{community.name}</div>
                          <div className="text-sm text-white/60">{community.id.slice(0, 8)}...</div>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="text-white/80">{community.ownerEmail}</div>
                        {community.ownerName && (
                          <div className="text-sm text-white/60">{community.ownerName}</div>
                        )}
                      </td>
                      <td className="p-4 text-center">
                        <span className="text-white">{community.memberCount}</span>
                      </td>
                      <td className="p-4 text-center">
                        {getStatusBadge(community.subscriptionStatus, community.isSuspended)}
                      </td>
                      <td className="p-4 text-white/80">
                        {format(new Date(community.createdAt), 'MMM d, yyyy')}
                      </td>
                      <td className="p-4 text-white/80">
                        {community.lastActivity 
                          ? format(new Date(community.lastActivity), 'MMM d, yyyy')
                          : 'Never'
                        }
                      </td>
                      <td className="p-4">
                        <div className="flex items-center justify-center gap-2">
                          <Button 
                            size="sm"
                            variant="ghost"
                            onClick={() => handleViewDetails(community)}
                            data-testid={`button-view-${community.id}`}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          {community.isSuspended ? (
                            <Button 
                              size="sm"
                              variant="ghost"
                              onClick={() => handleRestore(community)}
                              className="text-green-500 hover:text-green-400"
                              data-testid={`button-restore-${community.id}`}
                            >
                              <Play className="w-4 h-4" />
                            </Button>
                          ) : (
                            <Button 
                              size="sm"
                              variant="ghost"
                              onClick={() => handleSuspend(community)}
                              className="text-red-500 hover:text-red-400"
                              data-testid={`button-suspend-${community.id}`}
                            >
                              <Pause className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        {/* Details Dialog */}
        <Dialog open={isDetailsDialogOpen} onOpenChange={setIsDetailsDialogOpen}>
          <DialogContent className="max-w-2xl bg-black/95 border-copper-500/20 text-white">
            <DialogHeader>
              <DialogTitle>Community Details</DialogTitle>
            </DialogHeader>
            {selectedCommunity && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-white/60">Name</Label>
                    <p className="text-white">{selectedCommunity.name}</p>
                  </div>
                  <div>
                    <Label className="text-white/60">ID</Label>
                    <p className="text-white font-mono text-sm">{selectedCommunity.id}</p>
                  </div>
                  <div>
                    <Label className="text-white/60">Slug</Label>
                    <p className="text-white">{selectedCommunity.slug}</p>
                  </div>
                  <div>
                    <Label className="text-white/60">Owner Email</Label>
                    <p className="text-white">{selectedCommunity.ownerEmail}</p>
                  </div>
                  <div>
                    <Label className="text-white/60">Members</Label>
                    <p className="text-white">{selectedCommunity.memberCount}</p>
                  </div>
                  <div>
                    <Label className="text-white/60">Posts</Label>
                    <p className="text-white">{selectedCommunity.postCount}</p>
                  </div>
                  <div>
                    <Label className="text-white/60">Subscription Status</Label>
                    <div className="mt-1">
                      {getStatusBadge(selectedCommunity.subscriptionStatus, selectedCommunity.isSuspended)}
                    </div>
                  </div>
                  <div>
                    <Label className="text-white/60">Monthly Revenue</Label>
                    <p className="text-copper-500 font-bold">
                      ${selectedCommunity.monthlyRevenue.toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <Label className="text-white/60">Created</Label>
                    <p className="text-white">
                      {format(new Date(selectedCommunity.createdAt), 'PPP')}
                    </p>
                  </div>
                  <div>
                    <Label className="text-white/60">Last Activity</Label>
                    <p className="text-white">
                      {selectedCommunity.lastActivity 
                        ? format(new Date(selectedCommunity.lastActivity), 'PPP')
                        : 'Never'
                      }
                    </p>
                  </div>
                </div>
                {selectedCommunity.isSuspended && (
                  <Alert className="bg-red-500/10 border-red-500/50">
                    <AlertTriangle className="h-4 w-4 text-red-500" />
                    <AlertDescription className="text-white">
                      <strong>Suspended:</strong> {selectedCommunity.suspendedReason || 'No reason provided'}
                      {selectedCommunity.suspendedAt && (
                        <div className="text-sm mt-1 text-white/60">
                          on {format(new Date(selectedCommunity.suspendedAt), 'PPP')}
                        </div>
                      )}
                    </AlertDescription>
                  </Alert>
                )}
                {selectedCommunity.subscriptionEndDate && (
                  <div>
                    <Label className="text-white/60">Subscription End Date</Label>
                    <p className="text-white">
                      {format(new Date(selectedCommunity.subscriptionEndDate), 'PPP')}
                    </p>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Suspend Dialog */}
        <Dialog open={isSuspendDialogOpen} onOpenChange={setIsSuspendDialogOpen}>
          <DialogContent className="bg-black/95 border-copper-500/20 text-white">
            <DialogHeader>
              <DialogTitle>Suspend Community</DialogTitle>
              <DialogDescription className="text-white/60">
                Are you sure you want to suspend "{selectedCommunity?.name}"? 
                This will immediately block access to the community.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="reason">Reason for Suspension</Label>
                <Textarea
                  id="reason"
                  value={suspendReason}
                  onChange={(e) => setSuspendReason(e.target.value)}
                  placeholder="Enter reason for suspension..."
                  className="bg-black/40 border-white/20"
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button 
                variant="outline" 
                onClick={() => setIsSuspendDialogOpen(false)}
                className="border-white/20"
              >
                Cancel
              </Button>
              <Button 
                onClick={confirmSuspend}
                disabled={!suspendReason.trim() || suspendMutation.isPending}
                className="bg-red-500 hover:bg-red-600"
              >
                {suspendMutation.isPending ? 'Suspending...' : 'Suspend Community'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Self-Test Results */}
        {showSelfTest && selfTestResults && (
          <SelfTestResults 
            results={selfTestResults}
            onClose={() => setShowSelfTest(false)}
            onRerun={() => selfTestMutation.mutate()}
          />
        )}

        {/* Restore Community Confirmation Dialog */}
        <AlertDialog open={restoreCommunityDialog.open} onOpenChange={(open) => setRestoreCommunityDialog({ open, community: null })}>
          <AlertDialogContent className="bg-black/90 border-white/10">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-white">Restore Community</AlertDialogTitle>
              <AlertDialogDescription className="text-gray-400">
                {restoreCommunityDialog.community && (
                  <>
                    Are you sure you want to restore "{restoreCommunityDialog.community.name}"? This will reactivate the community and allow members to access it again.
                  </>
                )}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="border-white/20 text-white hover:bg-white/10">
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  if (restoreCommunityDialog.community) {
                    restoreMutation.mutate(restoreCommunityDialog.community.id);
                  }
                  setRestoreCommunityDialog({ open: false, community: null });
                }}
                className="bg-green-500 hover:bg-green-600 text-white"
                data-testid="confirm-restore-community"
              >
                Restore
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}