import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';
import { apiRequest } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { Loader2, Plus, Edit, Trash2, ExternalLink } from 'lucide-react';

interface DealImage {
  id?: string;
  kind: 'desktop' | 'mobile';
  url: string;
  width?: number;
  height?: number;
  alt?: string;
}

interface Deal {
  id?: string;
  title: string;
  subtitle: string;
  brand: string;
  code?: string;
  click_url?: string;
  start_date: string;
  end_date: string;
  slot: number;
  tile_kind: 'wide' | 'half' | 'square' | 'tall';
  priority: number;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
  deal_images?: DealImage[];
}

const initialDeal: Deal = {
  title: '',
  subtitle: '',
  brand: '',
  code: '',
  click_url: '',
  start_date: new Date().toISOString().split('T')[0],
  end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  slot: 1,
  tile_kind: 'wide',
  priority: 0,
  is_active: true
};

// Image size recommendations based on tile kind
const IMAGE_RECOMMENDATIONS = {
  wide: { width: 1200, height: 400, ratio: '3:1', label: 'Wide Banner (1200x400px - 3:1 ratio)' },
  square: { width: 600, height: 600, ratio: '1:1', label: 'Square (600x600px - 1:1 ratio)' },
  tall: { width: 600, height: 900, ratio: '2:3', label: 'Tall (600x900px - 2:3 ratio)' },
  half: { width: 600, height: 400, ratio: '3:2', label: 'Half Width (600x400px - 3:2 ratio)' }
};

// New slot configuration for 7 placements
const SLOT_CONFIG = [
  { slot: 1, kind: 'wide', label: 'Top Banner' },
  { slot: 2, kind: 'half', label: 'Left Half' },
  { slot: 3, kind: 'half', label: 'Right Half' },
  { slot: 4, kind: 'square', label: 'Center Square' },
  { slot: 5, kind: 'tall', label: 'Left Tall' },
  { slot: 6, kind: 'half', label: 'Bottom Half' },
  { slot: 7, kind: 'wide', label: 'Bottom Banner' }
];

export default function AdminDeals() {
  const [editingDeal, setEditingDeal] = useState<Deal | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [images, setImages] = useState<DealImage[]>([]);
  const [filter, setFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Fetch deals
  const { data: dealsData, isLoading } = useQuery({
    queryKey: ['/api/admin/deals'],
    queryFn: async () => {
      const response = await fetch('/api/admin/deals', {
        headers: {
          'x-admin-key': localStorage.getItem('adminKey') || ''
        }
      });
      if (!response.ok) throw new Error('Failed to fetch deals');
      return response.json();
    }
  });

  // Create deal mutation
  const createDealMutation = useMutation({
    mutationFn: async (deal: Deal & { images?: DealImage[] }) => {
      const response = await fetch('/api/admin/deals/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-key': localStorage.getItem('adminKey') || ''
        },
        body: JSON.stringify(deal),
        credentials: 'include'
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create deal');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/deals'] });
      setIsDialogOpen(false);
      setEditingDeal(null);
      setImages([]);
      toast({
        title: 'Success',
        description: 'Deal created successfully'
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create deal',
        variant: 'destructive'
      });
    }
  });

  // Update deal mutation
  const updateDealMutation = useMutation({
    mutationFn: async ({ id, ...deal }: Deal & { images?: DealImage[] }) => {
      const response = await fetch(`/api/admin/deals/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-key': localStorage.getItem('adminKey') || ''
        },
        body: JSON.stringify(deal),
        credentials: 'include'
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update deal');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/deals'] });
      setIsDialogOpen(false);
      setEditingDeal(null);
      setImages([]);
      toast({
        title: 'Success',
        description: 'Deal updated successfully'
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update deal',
        variant: 'destructive'
      });
    }
  });

  // Delete deal mutation
  const deleteDealMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/admin/deals/${id}`, {
        method: 'DELETE',
        headers: {
          'x-admin-key': localStorage.getItem('adminKey') || ''
        },
        credentials: 'include'
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete deal');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/deals'] });
      toast({
        title: 'Success',
        description: 'Deal deleted successfully'
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete deal',
        variant: 'destructive'
      });
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDeal) return;

    const dealData = {
      ...editingDeal,
      images: images.length > 0 ? images : undefined
    };

    if (editingDeal.id) {
      updateDealMutation.mutate(dealData);
    } else {
      createDealMutation.mutate(dealData);
    }
  };

  const handleEdit = (deal: Deal) => {
    setEditingDeal(deal);
    setImages(deal.deal_images || []);
    setIsDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this deal?')) {
      deleteDealMutation.mutate(id);
    }
  };

  const handleAddImage = () => {
    setImages([...images, { kind: 'desktop', url: '', alt: '' }]);
  };

  const handleRemoveImage = (index: number) => {
    setImages(images.filter((_, i) => i !== index));
  };

  const handleImageChange = (index: number, field: keyof DealImage, value: any) => {
    const updated = [...images];
    updated[index] = { ...updated[index], [field]: value };
    setImages(updated);
  };

  // Filter deals
  const deals = dealsData?.deals?.filter((deal: Deal) => {
    if (filter === 'active' && !deal.is_active) return false;
    if (filter === 'inactive' && deal.is_active) return false;
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      return (
        deal.title.toLowerCase().includes(search) ||
        deal.brand.toLowerCase().includes(search) ||
        deal.subtitle.toLowerCase().includes(search)
      );
    }
    return true;
  }) || [];

  // Group deals by slot for visualization
  const slotMap = new Map<number, Deal>();
  deals.forEach((deal: Deal) => {
    if (!slotMap.has(deal.slot) || deal.priority > (slotMap.get(deal.slot)?.priority || 0)) {
      slotMap.set(deal.slot, deal);
    }
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-white">Deals Management</h2>
          <p className="text-white/60">Manage premium deals for the moodboard (7 premium slots)</p>
        </div>
        <Button
          onClick={() => {
            setEditingDeal(initialDeal);
            setImages([]);
            setIsDialogOpen(true);
          }}
          className="bg-copper-500 hover:bg-copper-600 text-black"
        >
          <Plus className="w-4 h-4 mr-2" />
          New Deal
        </Button>
      </div>

      {/* Filters */}
      <Card className="bg-white/5 border-white/10">
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <div className="flex-1">
              <Input
                placeholder="Search deals..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-white/10 border-white/20 text-white placeholder:text-white/40"
              />
            </div>
            <Select value={filter} onValueChange={(value: any) => setFilter(value)}>
              <SelectTrigger className="w-32 bg-white/10 border-white/20 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

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
                  className={`${spans[kind]} ${heights[kind]} border-2 rounded-lg flex flex-col items-center justify-center transition-all ${
                    deal ? 'border-copper-500 bg-gradient-to-br from-copper-500/20 to-copper-500/5' : 'border-white/20 bg-white/5'
                  } hover:bg-white/10 relative overflow-hidden`}
                >
                  <div className="absolute top-2 left-2 px-2 py-1 bg-black/20 rounded text-xs font-mono text-white/60">
                    {slot}
                  </div>
                  <div className="text-xs text-copper-400 font-medium">{label}</div>
                  {deal && (
                    <>
                      <div className="text-sm mt-2 font-bold text-white">{deal.brand}</div>
                      <div className="text-xs text-white/60 truncate px-4">{deal.title}</div>
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
      <Card>
        <CardHeader>
          <CardTitle>All Deals</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {deals.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No deals found</p>
            ) : (
              deals.map((deal: Deal) => (
                <div
                  key={deal.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold">{deal.title}</h3>
                      <Badge variant={deal.is_active ? 'default' : 'secondary'}>
                        Slot {deal.slot}
                      </Badge>
                      <Badge variant="outline">{deal.tile_kind}</Badge>
                      {!deal.is_active && (
                        <Badge variant="secondary">Inactive</Badge>
                      )}
                    </div>
                    <p className="text-sm text-gray-600">{deal.brand} • {deal.subtitle}</p>
                    {deal.code && (
                      <p className="text-sm font-mono mt-1">Code: {deal.code}</p>
                    )}
                    <p className="text-xs text-gray-500 mt-1">
                      {deal.start_date} to {deal.end_date} • Priority: {deal.priority}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    {deal.click_url && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => window.open(deal.click_url, '_blank')}
                      >
                        <ExternalLink className="w-4 h-4" />
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleEdit(deal)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDelete(deal.id!)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Edit/Create Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingDeal?.id ? 'Edit Deal' : 'Create New Deal'}
            </DialogTitle>
            <DialogDescription>
              Fill in the deal details and assign it to a slot
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  value={editingDeal?.title || ''}
                  onChange={(e) => setEditingDeal({ ...editingDeal!, title: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="brand">Brand *</Label>
                <Input
                  id="brand"
                  value={editingDeal?.brand || ''}
                  onChange={(e) => setEditingDeal({ ...editingDeal!, brand: e.target.value })}
                  required
                />
              </div>
            </div>

            <div>
              <Label htmlFor="subtitle">Subtitle *</Label>
              <Textarea
                id="subtitle"
                value={editingDeal?.subtitle || ''}
                onChange={(e) => setEditingDeal({ ...editingDeal!, subtitle: e.target.value })}
                required
                rows={2}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="code">Promo Code</Label>
                <Input
                  id="code"
                  value={editingDeal?.code || ''}
                  onChange={(e) => setEditingDeal({ ...editingDeal!, code: e.target.value })}
                  placeholder="e.g., SAVE20"
                />
              </div>
              <div>
                <Label htmlFor="click_url">Click URL</Label>
                <Input
                  id="click_url"
                  type="url"
                  value={editingDeal?.click_url || ''}
                  onChange={(e) => setEditingDeal({ ...editingDeal!, click_url: e.target.value })}
                  placeholder="https://..."
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="start_date">Start Date *</Label>
                <Input
                  id="start_date"
                  type="date"
                  value={editingDeal?.start_date || ''}
                  onChange={(e) => setEditingDeal({ ...editingDeal!, start_date: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="end_date">End Date *</Label>
                <Input
                  id="end_date"
                  type="date"
                  value={editingDeal?.end_date || ''}
                  onChange={(e) => setEditingDeal({ ...editingDeal!, end_date: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="slot">Slot (1-7) *</Label>
                <Select
                  value={String(editingDeal?.slot || 1)}
                  onValueChange={(value) => setEditingDeal({ ...editingDeal!, slot: parseInt(value) })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SLOT_CONFIG.map(({ slot, label }) => (
                      <SelectItem key={slot} value={String(slot)}>
                        {slot} - {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="tile_kind">Tile Size *</Label>
                <Select
                  value={editingDeal?.tile_kind || 'wide'}
                  onValueChange={(value: any) => setEditingDeal({ ...editingDeal!, tile_kind: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(IMAGE_RECOMMENDATIONS).map(([key, { label }]) => (
                      <SelectItem key={key} value={key}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="priority">Priority</Label>
                <Input
                  id="priority"
                  type="number"
                  value={editingDeal?.priority || 0}
                  onChange={(e) => setEditingDeal({ ...editingDeal!, priority: parseInt(e.target.value) })}
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Switch
                checked={editingDeal?.is_active || false}
                onCheckedChange={(checked) => setEditingDeal({ ...editingDeal!, is_active: checked })}
              />
              <Label>Active</Label>
            </div>

            {/* Image Recommendations */}
            {editingDeal?.tile_kind && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <div className="text-sm font-medium text-blue-800">Recommended Image Size</div>
                <div className="text-sm text-blue-600 mt-1">
                  {IMAGE_RECOMMENDATIONS[editingDeal.tile_kind as keyof typeof IMAGE_RECOMMENDATIONS].label}
                </div>
                <div className="text-xs text-blue-500 mt-1">
                  Optimal: {IMAGE_RECOMMENDATIONS[editingDeal.tile_kind as keyof typeof IMAGE_RECOMMENDATIONS].width}px × 
                  {IMAGE_RECOMMENDATIONS[editingDeal.tile_kind as keyof typeof IMAGE_RECOMMENDATIONS].height}px
                </div>
              </div>
            )}

            {/* Images */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <Label>Images</Label>
                <Button type="button" size="sm" variant="outline" onClick={handleAddImage}>
                  <Plus className="w-4 h-4 mr-1" />
                  Add Image
                </Button>
              </div>
              <div className="space-y-2">
                {images.map((image, index) => (
                  <div key={index} className="flex gap-2 items-end">
                    <div className="flex-1">
                      <Input
                        placeholder="Image URL"
                        value={image.url}
                        onChange={(e) => handleImageChange(index, 'url', e.target.value)}
                      />
                    </div>
                    <Select
                      value={image.kind}
                      onValueChange={(value: any) => handleImageChange(index, 'kind', value)}
                    >
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="desktop">Desktop</SelectItem>
                        <SelectItem value="mobile">Mobile</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => handleRemoveImage(index)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createDealMutation.isPending || updateDealMutation.isPending}
              >
                {createDealMutation.isPending || updateDealMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  editingDeal?.id ? 'Update Deal' : 'Create Deal'
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}