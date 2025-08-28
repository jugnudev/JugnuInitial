import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from '@/hooks/use-toast';
import { Loader2, Plus, Edit, Trash2, ExternalLink } from 'lucide-react';

interface Deal {
  id?: string;
  title: string;
  subtitle?: string;  // Maps to blurb
  brand: string;      // Maps to merchant
  code?: string;
  click_url?: string; // Maps to link_url
  start_date: string; // Maps to start_at
  end_date?: string;  // Maps to end_at
  slot: number;       // Maps to placement_slot
  tile_kind?: string;
  priority: number;
  is_active: boolean; // Maps to status
  badge?: string;
  terms?: string;     // Maps to terms_md
  image_desktop_url: string;
  image_mobile_url: string;
  created_at?: string;
  updated_at?: string;
}

// Image size recommendations based on tile kind
const IMAGE_RECOMMENDATIONS = {
  wide: { width: 1200, height: 300, ratio: '4:1', label: 'Wide Banner (1200x300px - 4:1 ratio)' },
  square: { width: 600, height: 600, ratio: '1:1', label: 'Square (600x600px - 1:1 ratio)' },
  tall: { width: 600, height: 900, ratio: '2:3', label: 'Tall (600x900px - 2:3 ratio)' },
  half: { width: 600, height: 300, ratio: '2:1', label: 'Half Width (600x300px - 2:1 ratio)' }
};

// New slot configuration for 7 placements
const SLOT_CONFIG = [
  { slot: 1, kind: 'wide', label: 'Top Banner' },
  { slot: 2, kind: 'half', label: 'Left Half' },
  { slot: 3, kind: 'half', label: 'Right Half' },
  { slot: 4, kind: 'square', label: 'Middle Square' },
  { slot: 5, kind: 'square', label: 'Bottom Left' },
  { slot: 6, kind: 'square', label: 'Bottom Center' },
  { slot: 7, kind: 'wide', label: 'Bottom Banner' }
];

export default function AdminDeals() {
  const [editingDeal, setEditingDeal] = useState<Deal | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [adminKey, setAdminKey] = useState(() => {
    try {
      return localStorage.getItem('adminKey') || '';
    } catch {
      return '';
    }
  });
  const [authError, setAuthError] = useState(false);
  const [formData, setFormData] = useState<Deal>({
    title: '',
    subtitle: '',
    brand: '',
    code: '',
    click_url: '',
    start_date: new Date().toISOString().split('T')[0],
    end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    slot: 1,
    priority: 0,
    is_active: true,
    badge: '',
    terms: '',
    image_desktop_url: '',
    image_mobile_url: ''
  });

  // Check authentication
  const { data: authCheck, refetch: checkAuth } = useQuery({
    queryKey: ['/api/admin/deals', 'auth', adminKey],
    queryFn: async () => {
      const response = await fetch('/api/admin/deals', {
        headers: {
          'x-admin-key': adminKey
        }
      });
      
      if (response.status === 401) {
        setAuthError(true);
        setIsAuthenticated(false);
        return null;
      }
      
      setAuthError(false);
      setIsAuthenticated(true);
      // Save the admin key to localStorage on successful auth
      try {
        localStorage.setItem('adminKey', adminKey);
      } catch (e) {
        console.warn('Failed to save admin key to localStorage:', e);
      }
      
      const data = await response.json();
      return data;
    },
    enabled: !!adminKey,
    retry: false
  });

  const deals = authCheck?.deals || [];

  // Create deal mutation
  const createDealMutation = useMutation({
    mutationFn: async (deal: Deal) => {
      const response = await fetch('/api/admin/deals/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-key': adminKey
        },
        body: JSON.stringify(deal)
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create deal');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/deals'] });
      toast({
        title: 'Success',
        description: 'Deal created successfully'
      });
      closeDialog();
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive'
      });
    }
  });

  // Update deal mutation
  const updateDealMutation = useMutation({
    mutationFn: async ({ id, ...deal }: Deal) => {
      const response = await fetch(`/api/admin/deals/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-key': adminKey
        },
        body: JSON.stringify(deal)
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update deal');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/deals'] });
      toast({
        title: 'Success',
        description: 'Deal updated successfully'
      });
      closeDialog();
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive'
      });
    }
  });

  // Delete deal mutation
  const deleteDealMutation = useMutation({
    mutationFn: async (dealId: string) => {
      const response = await fetch(`/api/admin/deals/${dealId}`, {
        method: 'DELETE',
        headers: {
          'x-admin-key': adminKey
        }
      });
      
      if (!response.ok) throw new Error('Failed to delete deal');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/deals'] });
      toast({
        title: 'Success',
        description: 'Deal deleted successfully'
      });
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to delete deal',
        variant: 'destructive'
      });
    }
  });

  const openDialog = (deal?: Deal) => {
    if (deal) {
      setEditingDeal(deal);
      setFormData(deal);
    } else {
      setEditingDeal(null);
      setFormData({
        title: '',
        subtitle: '',
        brand: '',
        code: '',
        click_url: '',
        start_date: new Date().toISOString().split('T')[0],
        end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        slot: 1,
        priority: 0,
        is_active: true,
        badge: '',
        terms: '',
        image_desktop_url: '',
        image_mobile_url: ''
      });
    }
    setIsDialogOpen(true);
  };

  const closeDialog = () => {
    setIsDialogOpen(false);
    setEditingDeal(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (editingDeal) {
      updateDealMutation.mutate({ ...editingDeal, ...formData });
    } else {
      createDealMutation.mutate(formData);
    }
  };

  // Update tile_kind when slot changes
  useEffect(() => {
    const config = SLOT_CONFIG.find(c => c.slot === formData.slot);
    if (config) {
      setFormData(prev => ({ ...prev, tile_kind: config.kind }));
    }
  }, [formData.slot]);

  // Create a map for quick slot lookup
  const slotMap = new Map(deals.map((deal: Deal) => [deal.slot, deal]));

  // Get recommended image size for current slot
  const getImageRecommendation = () => {
    const config = SLOT_CONFIG.find(c => c.slot === formData.slot);
    if (config && config.kind) {
      return IMAGE_RECOMMENDATIONS[config.kind as keyof typeof IMAGE_RECOMMENDATIONS];
    }
    return IMAGE_RECOMMENDATIONS.square;
  };

  // If not authenticated, show login form
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-950 p-4 sm:p-6 flex items-center justify-center">
        <Card className="w-full max-w-md bg-gray-900 border-gray-800 shadow-2xl">
          <CardHeader>
            <CardTitle className="text-3xl font-bold bg-gradient-to-r from-orange-400 to-red-400 bg-clip-text text-transparent">Admin Access</CardTitle>
            <p className="text-gray-300 mt-2">Enter admin key to access deals management</p>
          </CardHeader>
          <CardContent className="space-y-6 pt-4">
            <Input
              type="password"
              placeholder="Admin key"
              value={adminKey}
              onChange={(e) => setAdminKey(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && adminKey.trim() && checkAuth()}
              className="h-12 text-center text-lg border-2 border-gray-700 bg-gray-800 text-white placeholder:text-gray-400 focus:border-orange-500"
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
                  checkAuth();
                }
              }}
              className="w-full h-12 text-lg bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 shadow-lg text-white"
              disabled={!adminKey.trim()}
              data-testid="button-login"
            >
              Access Admin Panel
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-white">Deals Management</h2>
          <p className="text-sm text-white/60 mt-1">Manage your premium deals moodboard</p>
        </div>
        <Button 
          onClick={() => openDialog()}
          className="bg-copper-500 hover:bg-copper-600"
        >
          <Plus className="h-4 w-4 mr-2" />
          New Deal
        </Button>
      </div>

      {/* Slot Grid Visualization */}
      <Card className="bg-white/5 border-white/10">
        <CardHeader>
          <CardTitle className="text-white">Premium Slot Layout (7 Placements)</CardTitle>
          <p className="text-sm text-white/60 mt-2">Visual preview of your deals moodboard</p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-12 gap-4">
            {SLOT_CONFIG.map(({ slot, kind, label }) => {
              const deal = slotMap.get(slot);
              
              const spans = {
                wide: 'col-span-12',
                half: 'col-span-6',
                square: 'col-span-4',
                tall: 'col-span-4'
              };
              
              const heights = {
                wide: 'h-20',
                half: 'h-16',
                square: 'h-24',
                tall: 'h-32'
              };

              return (
                <div
                  key={slot}
                  className={`${spans[kind as keyof typeof spans]} ${heights[kind as keyof typeof heights]} border-2 rounded-lg flex flex-col items-center justify-center transition-all ${
                    deal ? 'border-copper-500 bg-gradient-to-br from-copper-500/20 to-copper-500/5' : 'border-white/20 bg-white/5'
                  } hover:bg-white/10 relative overflow-hidden`}
                >
                  <div className="absolute top-2 left-2 px-2 py-1 bg-black/20 rounded text-xs font-mono text-white/60">
                    {slot}
                  </div>
                  <div className="text-xs text-copper-400 font-medium">{label}</div>
                  {deal && (
                    <>
                      <div className="text-sm mt-2 font-bold text-white">{(deal as Deal).brand}</div>
                      <div className="text-xs text-white/60 truncate px-4">{(deal as Deal).title}</div>
                    </>
                  )}
                  {!deal && (
                    <div className="text-xs text-white/40 mt-1">Empty</div>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Deals List */}
      <Card className="bg-white/5 border-white/10">
        <CardHeader>
          <CardTitle className="text-white">Active Deals</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-copper-500" />
            </div>
          ) : deals.length === 0 ? (
            <p className="text-center text-white/60 py-8">No deals created yet</p>
          ) : (
            <div className="space-y-4">
              {deals.map((deal: Deal) => (
                <div
                  key={deal.id}
                  className="bg-white/5 rounded-lg p-4 flex items-center justify-between"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <Badge variant="outline" className="text-copper-400 border-copper-400">
                        Slot {deal.slot}
                      </Badge>
                      <h3 className="font-semibold text-white">{deal.brand} - {deal.title}</h3>
                      {deal.badge && (
                        <Badge className="bg-copper-500/20 text-copper-400 border-copper-400">
                          {deal.badge}
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-white/60 mt-1">{deal.subtitle}</p>
                    <div className="flex items-center gap-4 mt-2 text-xs text-white/40">
                      <span>Priority: {deal.priority}</span>
                      <span>•</span>
                      <span>{deal.start_date} to {deal.end_date || 'No end date'}</span>
                      {deal.code && (
                        <>
                          <span>•</span>
                          <span>Code: {deal.code}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={deal.is_active ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'}>
                      {deal.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openDialog(deal)}
                      className="text-white/60 hover:text-white"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deal.id && deleteDealMutation.mutate(deal.id)}
                      className="text-red-400 hover:text-red-300"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-gray-900 text-white border-white/10">
          <DialogHeader>
            <DialogTitle>{editingDeal ? 'Edit Deal' : 'Create New Deal'}</DialogTitle>
            <DialogDescription>
              {editingDeal ? 'Update the deal details' : 'Fill in the deal details and assign it to a slot'}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Summer Sale"
                  required
                  className="bg-white/5 border-white/20"
                />
              </div>
              <div>
                <Label htmlFor="brand">Brand *</Label>
                <Input
                  id="brand"
                  value={formData.brand}
                  onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                  placeholder="Store Name"
                  required
                  className="bg-white/5 border-white/20"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="subtitle">Subtitle</Label>
              <Input
                id="subtitle"
                value={formData.subtitle}
                onChange={(e) => setFormData({ ...formData, subtitle: e.target.value })}
                placeholder="Up to 50% off selected items"
                className="bg-white/5 border-white/20"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="code">Promo Code</Label>
                <Input
                  id="code"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  placeholder="SUMMER50"
                  className="bg-white/5 border-white/20"
                />
              </div>
              <div>
                <Label htmlFor="click_url">Click URL</Label>
                <Input
                  id="click_url"
                  value={formData.click_url}
                  onChange={(e) => setFormData({ ...formData, click_url: e.target.value })}
                  placeholder="https://..."
                  className="bg-white/5 border-white/20"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="start_date">Start Date *</Label>
                <Input
                  id="start_date"
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                  required
                  className="bg-white/5 border-white/20"
                />
              </div>
              <div>
                <Label htmlFor="end_date">End Date</Label>
                <Input
                  id="end_date"
                  type="date"
                  value={formData.end_date}
                  onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                  className="bg-white/5 border-white/20"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="slot">Slot (1-7) *</Label>
                <Select
                  value={formData.slot.toString()}
                  onValueChange={(value) => setFormData({ ...formData, slot: parseInt(value) })}
                >
                  <SelectTrigger className="bg-white/5 border-white/20">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SLOT_CONFIG.map(({ slot, label }) => (
                      <SelectItem key={slot} value={slot.toString()}>
                        {slot} - {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="tile_kind">Tile Size *</Label>
                <Input
                  id="tile_kind"
                  value={SLOT_CONFIG.find(c => c.slot === formData.slot)?.kind || ''}
                  disabled
                  className="bg-white/5 border-white/20 opacity-50"
                />
              </div>
              <div>
                <Label htmlFor="priority">Priority</Label>
                <Input
                  id="priority"
                  type="number"
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) || 0 })}
                  className="bg-white/5 border-white/20"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="badge">Badge (Optional)</Label>
              <Input
                id="badge"
                value={formData.badge}
                onChange={(e) => setFormData({ ...formData, badge: e.target.value })}
                placeholder="e.g., Limited Time, Back to School"
                className="bg-white/5 border-white/20"
              />
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="is_active"
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
              />
              <Label htmlFor="is_active">Active</Label>
            </div>

            {/* Image URLs */}
            <div className="space-y-4 p-4 bg-white/5 rounded-lg">
              <div className="text-sm text-copper-400 font-medium">
                Recommended Image Size: {getImageRecommendation().label}
              </div>
              
              <div>
                <Label htmlFor="image_desktop_url">Desktop Image URL *</Label>
                <Input
                  id="image_desktop_url"
                  value={formData.image_desktop_url}
                  onChange={(e) => setFormData({ ...formData, image_desktop_url: e.target.value })}
                  placeholder="https://example.com/image-desktop.jpg"
                  required
                  className="bg-white/5 border-white/20"
                />
              </div>
              
              <div>
                <Label htmlFor="image_mobile_url">Mobile Image URL *</Label>
                <Input
                  id="image_mobile_url"
                  value={formData.image_mobile_url}
                  onChange={(e) => setFormData({ ...formData, image_mobile_url: e.target.value })}
                  placeholder="https://example.com/image-mobile.jpg"
                  required
                  className="bg-white/5 border-white/20"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="terms">Terms (Markdown, Optional)</Label>
              <Textarea
                id="terms"
                value={formData.terms}
                onChange={(e) => setFormData({ ...formData, terms: e.target.value })}
                placeholder="Enter terms in markdown format..."
                className="min-h-[100px] bg-white/5 border-white/20"
              />
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={closeDialog}>
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={createDealMutation.isPending || updateDealMutation.isPending}
                className="bg-copper-500 hover:bg-copper-600"
              >
                {createDealMutation.isPending || updateDealMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  editingDeal ? 'Update Deal' : 'Create Deal'
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}