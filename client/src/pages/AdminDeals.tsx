import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';
import { toast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Edit2, Archive, Copy, Eye, CheckCircle, XCircle, RefreshCw } from 'lucide-react';

interface Deal {
  id?: string;
  title: string;
  merchant: string;
  blurb: string;
  code?: string | null;
  link_url?: string | null;
  image_desktop_url?: string | null;
  image_mobile_url?: string | null;
  placement_slot?: number | null;
  badge?: string | null;
  terms_md?: string | null;
  status: 'draft' | 'scheduled' | 'published' | 'archived';
  priority: number;
  start_at: string;
  end_at?: string | null;
  created_at?: string;
  updated_at?: string;
}

export default function AdminDeals() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [adminKey, setAdminKey] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [editingDeal, setEditingDeal] = useState<Deal | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [selfTestRunning, setSelfTestRunning] = useState(false);
  const [formStatus, setFormStatus] = useState<Deal['status']>('draft');

  // Check session authentication
  useEffect(() => {
    fetch('/api/admin/session')
      .then(res => res.json())
      .then(data => {
        if (data.ok) {
          setIsAuthenticated(true);
        }
      })
      .catch(() => {});
  }, []);

  // Fetch deals list
  const { data: dealsData, isLoading, refetch } = useQuery({
    queryKey: ['/api/admin/deals/list', statusFilter, searchQuery],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (searchQuery) params.append('q', searchQuery);
      
      const response = await fetch(`/api/admin/deals/list?${params}`, {
        headers: isAuthenticated ? {} : { 'x-admin-key': adminKey }
      });
      
      if (!response.ok) throw new Error('Failed to fetch deals');
      return response.json();
    },
    enabled: isAuthenticated || !!adminKey,
  });

  // Upsert deal mutation
  const upsertMutation = useMutation({
    mutationFn: async (deal: Deal) => {
      const response = await fetch('/api/admin/deals/upsert', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(isAuthenticated ? {} : { 'x-admin-key': adminKey })
        },
        body: JSON.stringify(deal),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to save deal');
      }
      return response.json();
    },
    onSuccess: () => {
      toast({ title: 'Success', description: 'Deal saved successfully' });
      refetch();
      setSheetOpen(false);
      setEditingDeal(null);
    },
    onError: (error: Error) => {
      toast({ 
        title: 'Error', 
        description: error.message,
        variant: 'destructive'
      });
    },
  });

  // Archive deal mutation
  const archiveMutation = useMutation({
    mutationFn: async (dealId: string) => {
      const response = await fetch('/api/admin/deals/delete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(isAuthenticated ? {} : { 'x-admin-key': adminKey })
        },
        body: JSON.stringify({ id: dealId }),
      });
      
      if (!response.ok) throw new Error('Failed to archive deal');
      return response.json();
    },
    onSuccess: () => {
      toast({ title: 'Success', description: 'Deal archived successfully' });
      refetch();
    },
    onError: () => {
      toast({ 
        title: 'Error', 
        description: 'Failed to archive deal',
        variant: 'destructive'
      });
    },
  });

  // Run self-test
  const runSelfTest = async () => {
    setSelfTestRunning(true);
    try {
      const response = await fetch('/api/admin/deals/selftest', {
        headers: isAuthenticated ? {} : { 'x-admin-key': adminKey }
      });
      
      const result = await response.json();
      
      if (result.ok) {
        toast({
          title: '✅ Self-Test Passed',
          description: `Successfully wrote ${result.wrote.impressions} impression(s) and ${result.wrote.clicks} click(s)`,
        });
      } else {
        toast({
          title: '❌ Self-Test Failed',
          description: result.error || 'Test failed',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to run self-test',
        variant: 'destructive',
      });
    } finally {
      setSelfTestRunning(false);
    }
  };

  // Handle authentication
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    const key = formData.get('adminKey') as string;
    
    // Test the key
    const response = await fetch('/api/admin/deals/list', {
      headers: { 'x-admin-key': key }
    });
    
    if (response.ok) {
      setAdminKey(key);
      setIsAuthenticated(true);
      toast({ title: 'Success', description: 'Authenticated successfully' });
    } else {
      toast({ 
        title: 'Error', 
        description: 'Invalid admin key',
        variant: 'destructive'
      });
    }
  };

  // Handle deal form submission
  const handleSaveDeal = (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    
    const deal: Deal = {
      ...(editingDeal?.id && { id: editingDeal.id }),
      title: formData.get('title') as string,
      merchant: formData.get('merchant') as string,
      blurb: formData.get('blurb') as string,
      code: formData.get('code') as string || null,
      link_url: formData.get('link_url') as string || null,
      image_desktop_url: formData.get('image_desktop_url') as string || null,
      image_mobile_url: formData.get('image_mobile_url') as string || null,
      placement_slot: formData.get('placement_slot') ? parseInt(formData.get('placement_slot') as string) : null,
      badge: formData.get('badge') as string || null,
      terms_md: formData.get('terms_md') as string || null,
      status: formData.get('status') as Deal['status'],
      priority: parseInt(formData.get('priority') as string) || 0,
      start_at: formData.get('start_at') as string,
      end_at: formData.get('end_at') as string || null,
    };
    
    upsertMutation.mutate(deal);
  };

  // Duplicate deal
  const duplicateDeal = (deal: Deal) => {
    const newDeal = { ...deal };
    delete newDeal.id;
    newDeal.title = `${deal.title} (Copy)`;
    newDeal.status = 'draft';
    setEditingDeal(newDeal);
    setSheetOpen(true);
  };

  if (!isAuthenticated && !adminKey) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Admin Authentication</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <Label htmlFor="adminKey">Admin Key</Label>
                <Input
                  id="adminKey"
                  name="adminKey"
                  type="password"
                  placeholder="Enter admin key"
                  required
                />
              </div>
              <Button type="submit" className="w-full">
                Authenticate
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Deals Management</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Manage deals, promotions, and special offers
          </p>
        </div>

        {/* Actions Bar */}
        <div className="mb-6 flex flex-wrap gap-4 items-center justify-between">
          <div className="flex flex-wrap gap-2">
            <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
              <SheetTrigger asChild>
                <Button onClick={() => {
                  setEditingDeal(null);
                  setFormStatus('draft');
                }}>
                  <Plus className="mr-2 h-4 w-4" />
                  New Deal
                </Button>
              </SheetTrigger>
              <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
                <SheetHeader>
                  <SheetTitle>
                    {editingDeal?.id ? 'Edit Deal' : 'Create New Deal'}
                  </SheetTitle>
                </SheetHeader>
                
                <form onSubmit={handleSaveDeal} className="space-y-4 mt-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="merchant">Merchant *</Label>
                      <Input
                        id="merchant"
                        name="merchant"
                        defaultValue={editingDeal?.merchant}
                        required
                        placeholder="e.g., Best Buy"
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="title">Title *</Label>
                      <Input
                        id="title"
                        name="title"
                        defaultValue={editingDeal?.title}
                        required
                        placeholder="e.g., 20% Off Electronics"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="blurb">Description *</Label>
                    <Textarea
                      id="blurb"
                      name="blurb"
                      defaultValue={editingDeal?.blurb}
                      required
                      placeholder="Brief description of the deal"
                      rows={3}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="code">Promo Code</Label>
                      <Input
                        id="code"
                        name="code"
                        defaultValue={editingDeal?.code || ''}
                        placeholder="e.g., SAVE20"
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="link_url">Deal URL</Label>
                      <Input
                        id="link_url"
                        name="link_url"
                        type="url"
                        defaultValue={editingDeal?.link_url || ''}
                        placeholder="https://example.com/deal"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="image_desktop_url">Desktop Image URL</Label>
                      <Input
                        id="image_desktop_url"
                        name="image_desktop_url"
                        type="url"
                        defaultValue={editingDeal?.image_desktop_url || ''}
                        placeholder="https://example.com/image.jpg"
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="image_mobile_url">Mobile Image URL</Label>
                      <Input
                        id="image_mobile_url"
                        name="image_mobile_url"
                        type="url"
                        defaultValue={editingDeal?.image_mobile_url || ''}
                        placeholder="https://example.com/mobile.jpg"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="placement_slot">Slot (1-12)</Label>
                      <Input
                        id="placement_slot"
                        name="placement_slot"
                        type="number"
                        min="1"
                        max="12"
                        defaultValue={editingDeal?.placement_slot || ''}
                        placeholder="1-12"
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="priority">Priority</Label>
                      <Input
                        id="priority"
                        name="priority"
                        type="number"
                        defaultValue={editingDeal?.priority || 0}
                        placeholder="0"
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="badge">Badge</Label>
                      <Input
                        id="badge"
                        name="badge"
                        defaultValue={editingDeal?.badge || ''}
                        placeholder="e.g., Hot Deal"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="status">Status</Label>
                      <Select 
                        value={formStatus} 
                        onValueChange={(value) => setFormStatus(value as Deal['status'])}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="draft">Draft</SelectItem>
                          <SelectItem value="scheduled">Scheduled</SelectItem>
                          <SelectItem value="published">Published</SelectItem>
                          <SelectItem value="archived">Archived</SelectItem>
                        </SelectContent>
                      </Select>
                      <input type="hidden" name="status" value={formStatus} />
                    </div>
                    
                    <div>
                      <Label htmlFor="start_at">Start Date</Label>
                      <Input
                        id="start_at"
                        name="start_at"
                        type="datetime-local"
                        defaultValue={editingDeal?.start_at ? editingDeal.start_at.slice(0, 16) : ''}
                        required
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="end_at">End Date</Label>
                      <Input
                        id="end_at"
                        name="end_at"
                        type="datetime-local"
                        defaultValue={editingDeal?.end_at ? editingDeal.end_at.slice(0, 16) : ''}
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="terms_md">Terms (Markdown)</Label>
                    <Textarea
                      id="terms_md"
                      name="terms_md"
                      defaultValue={editingDeal?.terms_md || ''}
                      placeholder="Enter terms and conditions in Markdown format"
                      rows={4}
                    />
                  </div>

                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={() => setSheetOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={upsertMutation.isPending}>
                      {upsertMutation.isPending ? 'Saving...' : 'Save Deal'}
                    </Button>
                  </div>
                </form>
              </SheetContent>
            </Sheet>

            <Button
              variant="outline"
              onClick={() => setShowPreview(!showPreview)}
            >
              <Eye className="mr-2 h-4 w-4" />
              {showPreview ? 'Hide' : 'Show'} Preview
            </Button>

            <Button
              variant="outline"
              onClick={runSelfTest}
              disabled={selfTestRunning}
            >
              {selfTestRunning ? (
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle className="mr-2 h-4 w-4" />
              )}
              Run Self-Test
            </Button>
          </div>

          <div className="flex gap-2">
            <Input
              placeholder="Search deals..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-64"
            />
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="scheduled">Scheduled</SelectItem>
                <SelectItem value="published">Published</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Preview Grid */}
        {showPreview && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Preview Grid</CardTitle>
            </CardHeader>
            <CardContent>
              <iframe
                src="/deals"
                className="w-full h-[600px] rounded-lg border"
                title="Deals Preview"
              />
            </CardContent>
          </Card>
        )}

        {/* Deals List */}
        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-8 text-center">
                <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-2" />
                <p>Loading deals...</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="border-b">
                    <tr>
                      <th className="text-left p-4">Slot</th>
                      <th className="text-left p-4">Merchant</th>
                      <th className="text-left p-4">Title</th>
                      <th className="text-left p-4">Status</th>
                      <th className="text-left p-4">Priority</th>
                      <th className="text-left p-4">Dates</th>
                      <th className="text-left p-4">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dealsData?.deals?.map((deal: Deal) => (
                      <tr key={deal.id} className="border-b hover:bg-gray-50 dark:hover:bg-gray-800">
                        <td className="p-4">
                          {deal.placement_slot ? (
                            <Badge variant="outline">{deal.placement_slot}</Badge>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </td>
                        <td className="p-4 font-medium">{deal.merchant}</td>
                        <td className="p-4">{deal.title}</td>
                        <td className="p-4">
                          <Badge
                            variant={
                              deal.status === 'published' ? 'default' :
                              deal.status === 'scheduled' ? 'secondary' :
                              deal.status === 'archived' ? 'outline' :
                              'secondary'
                            }
                          >
                            {deal.status}
                          </Badge>
                        </td>
                        <td className="p-4">{deal.priority}</td>
                        <td className="p-4 text-sm">
                          <div>{new Date(deal.start_at).toLocaleDateString()}</div>
                          {deal.end_at && (
                            <div className="text-gray-500">
                              to {new Date(deal.end_at).toLocaleDateString()}
                            </div>
                          )}
                        </td>
                        <td className="p-4">
                          <div className="flex gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setEditingDeal(deal);
                                setFormStatus(deal.status);
                                setSheetOpen(true);
                              }}
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => duplicateDeal(deal)}
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => deal.id && archiveMutation.mutate(deal.id)}
                            >
                              <Archive className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                
                {(!dealsData?.deals || dealsData.deals.length === 0) && (
                  <div className="p-8 text-center text-gray-500">
                    No deals found
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}