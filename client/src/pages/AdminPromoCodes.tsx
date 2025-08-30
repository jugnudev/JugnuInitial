import { useState } from 'react';
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
import { toast } from '@/hooks/use-toast';
import { Loader2, Plus, Edit, Trash2, Percent, DollarSign, Calendar, Gift } from 'lucide-react';

interface PromoCode {
  id?: string;
  code: string;
  description?: string;
  discount_type: 'percentage' | 'fixed_amount' | 'free_days';
  discount_value: number;
  valid_from: string;
  valid_to: string;
  max_uses?: number | null;
  current_uses?: number;
  is_active: boolean;
  min_purchase_amount: number;
  applicable_packages?: string[] | null;
  created_at?: string;
  updated_at?: string;
}

const PACKAGE_OPTIONS = [
  { value: 'events_spotlight', label: 'Events Spotlight' },
  { value: 'homepage_feature', label: 'Homepage Feature' },
  { value: 'full_feature', label: 'Full Feature' },
  { value: 'community_calendar', label: 'Community Calendar' }
];

export default function AdminPromoCodes() {
  const [editingPromo, setEditingPromo] = useState<PromoCode | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [adminKey] = useState(() => {
    try {
      return localStorage.getItem('adminKey') || '';
    } catch {
      return '';
    }
  });
  
  const [formData, setFormData] = useState<PromoCode>({
    code: '',
    description: '',
    discount_type: 'percentage',
    discount_value: 10,
    valid_from: new Date().toISOString().split('T')[0],
    valid_to: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    max_uses: null,
    is_active: true,
    min_purchase_amount: 0,
    applicable_packages: null
  });

  // Fetch promo codes
  const { data: promosData, isLoading } = useQuery({
    queryKey: ['/api/admin/promo-codes'],
    queryFn: async () => {
      const response = await fetch('/api/admin/promo-codes', {
        headers: {
          'x-admin-key': adminKey
        }
      });
      if (!response.ok) throw new Error('Failed to fetch promo codes');
      return response.json();
    }
  });

  const promoCodes = promosData?.promoCodes || [];

  // Create promo code mutation
  const createPromoMutation = useMutation({
    mutationFn: async (promo: PromoCode) => {
      const response = await fetch('/api/admin/promo-codes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-key': adminKey
        },
        body: JSON.stringify({
          ...promo,
          code: promo.code.toUpperCase()
        })
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create promo code');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/promo-codes'] });
      toast({
        title: 'Success',
        description: 'Promo code created successfully'
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

  // Update promo code mutation
  const updatePromoMutation = useMutation({
    mutationFn: async ({ id, ...promo }: PromoCode) => {
      const response = await fetch(`/api/admin/promo-codes/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-key': adminKey
        },
        body: JSON.stringify(promo)
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update promo code');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/promo-codes'] });
      toast({
        title: 'Success',
        description: 'Promo code updated successfully'
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

  // Delete (deactivate) promo code mutation
  const deletePromoMutation = useMutation({
    mutationFn: async (promoId: string) => {
      const response = await fetch(`/api/admin/promo-codes/${promoId}`, {
        method: 'DELETE',
        headers: {
          'x-admin-key': adminKey
        }
      });
      
      if (!response.ok) throw new Error('Failed to deactivate promo code');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/promo-codes'] });
      toast({
        title: 'Success',
        description: 'Promo code deactivated successfully'
      });
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to deactivate promo code',
        variant: 'destructive'
      });
    }
  });

  const openDialog = (promo?: PromoCode) => {
    if (promo) {
      setEditingPromo(promo);
      setFormData({
        ...promo,
        valid_from: promo.valid_from.split('T')[0],
        valid_to: promo.valid_to.split('T')[0]
      });
    } else {
      setEditingPromo(null);
      setFormData({
        code: '',
        description: '',
        discount_type: 'percentage',
        discount_value: 10,
        valid_from: new Date().toISOString().split('T')[0],
        valid_to: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        max_uses: null,
        is_active: true,
        min_purchase_amount: 0,
        applicable_packages: null
      });
    }
    setIsDialogOpen(true);
  };

  const closeDialog = () => {
    setIsDialogOpen(false);
    setEditingPromo(null);
  };

  const handleSubmit = () => {
    if (editingPromo) {
      updatePromoMutation.mutate(formData);
    } else {
      createPromoMutation.mutate(formData);
    }
  };

  const generateCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setFormData({ ...formData, code });
  };

  const getDiscountIcon = (type: string) => {
    switch (type) {
      case 'percentage':
        return <Percent className="w-4 h-4" />;
      case 'fixed_amount':
        return <DollarSign className="w-4 h-4" />;
      case 'free_days':
        return <Gift className="w-4 h-4" />;
      default:
        return null;
    }
  };

  const getDiscountDisplay = (promo: PromoCode) => {
    switch (promo.discount_type) {
      case 'percentage':
        return `${promo.discount_value}% off`;
      case 'fixed_amount':
        return `$${promo.discount_value} off`;
      case 'free_days':
        return `${promo.discount_value} free day${promo.discount_value > 1 ? 's' : ''}`;
      default:
        return '';
    }
  };

  const isExpired = (date: string) => {
    return new Date(date) < new Date();
  };

  const isNotYetValid = (date: string) => {
    return new Date(date) > new Date();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-copper-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h2 className="font-fraunces text-lg sm:text-xl font-bold text-white">
          Promo Codes ({promoCodes.length})
        </h2>
        <Button 
          onClick={() => openDialog()}
          className="bg-copper-500 hover:bg-copper-600 text-black"
        >
          <Plus className="w-4 h-4 mr-2" />
          New Promo Code
        </Button>
      </div>

      <div className="grid gap-4">
        {promoCodes.length === 0 ? (
          <Card className="bg-white/5 border-white/10">
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <Gift className="w-12 h-12 text-white/20 mb-4" />
              <p className="text-white/60">No promo codes yet</p>
              <p className="text-sm text-white/40 mt-2">Create your first promo code to offer discounts</p>
            </CardContent>
          </Card>
        ) : (
          promoCodes.map((promo: PromoCode) => (
            <Card key={promo.id} className="bg-white/5 border-white/10">
              <CardContent className="p-4 sm:p-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-start gap-3">
                      <div className="mt-1">
                        {getDiscountIcon(promo.discount_type)}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-lg font-bold text-white">{promo.code}</span>
                          <Badge 
                            variant={promo.is_active ? 'default' : 'secondary'}
                            className={promo.is_active ? 'bg-green-500/20 text-green-400' : 'bg-white/10 text-white/60'}
                          >
                            {promo.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                          {isExpired(promo.valid_to) && (
                            <Badge variant="secondary" className="bg-red-500/20 text-red-400">
                              Expired
                            </Badge>
                          )}
                          {isNotYetValid(promo.valid_from) && (
                            <Badge variant="secondary" className="bg-yellow-500/20 text-yellow-400">
                              Not Yet Valid
                            </Badge>
                          )}
                        </div>
                        
                        <p className="text-copper-400 font-semibold mt-1">
                          {getDiscountDisplay(promo)}
                        </p>
                        
                        {promo.description && (
                          <p className="text-white/60 text-sm mt-2">{promo.description}</p>
                        )}
                        
                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-white/40 mt-3">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            Valid: {new Date(promo.valid_from).toLocaleDateString()} - {new Date(promo.valid_to).toLocaleDateString()}
                          </span>
                          
                          {promo.max_uses && (
                            <span>
                              Usage: {promo.current_uses || 0} / {promo.max_uses}
                            </span>
                          )}
                          
                          {promo.min_purchase_amount > 0 && (
                            <span>Min: ${promo.min_purchase_amount}</span>
                          )}
                          
                          {promo.applicable_packages && promo.applicable_packages.length > 0 && (
                            <span>
                              Packages: {promo.applicable_packages.map(pkg => 
                                PACKAGE_OPTIONS.find(opt => opt.value === pkg)?.label || pkg
                              ).join(', ')}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button
                      onClick={() => openDialog(promo)}
                      size="sm"
                      variant="outline"
                      className="bg-white/5 border-white/20 hover:bg-white/10"
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    {promo.is_active && (
                      <Button
                        onClick={() => promo.id && deletePromoMutation.mutate(promo.id)}
                        size="sm"
                        variant="outline"
                        className="bg-red-500/10 border-red-500/20 hover:bg-red-500/20 text-red-400"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="bg-zinc-900 border-white/10 text-white max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingPromo ? 'Edit Promo Code' : 'Create New Promo Code'}</DialogTitle>
            <DialogDescription className="text-white/60">
              {editingPromo ? 'Update the promo code details' : 'Create a new promo code for sponsors'}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 mt-4">
            <div>
              <Label>Promo Code</Label>
              <div className="flex gap-2 mt-1">
                <Input
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                  placeholder="SUMMER2025"
                  className="bg-white/10 border-white/20 text-white uppercase"
                  maxLength={50}
                />
                {!editingPromo && (
                  <Button
                    type="button"
                    onClick={generateCode}
                    variant="outline"
                    className="bg-white/5 border-white/20 hover:bg-white/10"
                  >
                    Generate
                  </Button>
                )}
              </div>
            </div>

            <div>
              <Label>Description (Optional)</Label>
              <Textarea
                value={formData.description || ''}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Summer promotion for new sponsors"
                className="bg-white/10 border-white/20 text-white mt-1"
                rows={2}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Discount Type</Label>
                <Select
                  value={formData.discount_type}
                  onValueChange={(value: any) => setFormData({ ...formData, discount_type: value })}
                >
                  <SelectTrigger className="bg-white/10 border-white/20 text-white mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">Percentage Off</SelectItem>
                    <SelectItem value="fixed_amount">Fixed Amount Off</SelectItem>
                    <SelectItem value="free_days">Free Days</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>
                  {formData.discount_type === 'percentage' ? 'Percentage' : 
                   formData.discount_type === 'fixed_amount' ? 'Amount ($)' : 'Days'}
                </Label>
                <Input
                  type="number"
                  value={formData.discount_value}
                  onChange={(e) => setFormData({ ...formData, discount_value: parseFloat(e.target.value) || 0 })}
                  className="bg-white/10 border-white/20 text-white mt-1"
                  min="0"
                  step={formData.discount_type === 'percentage' ? '1' : '0.01'}
                  max={formData.discount_type === 'percentage' ? '100' : undefined}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Valid From</Label>
                <Input
                  type="date"
                  value={formData.valid_from}
                  onChange={(e) => setFormData({ ...formData, valid_from: e.target.value })}
                  className="bg-white/10 border-white/20 text-white mt-1"
                />
              </div>

              <div>
                <Label>Valid To</Label>
                <Input
                  type="date"
                  value={formData.valid_to}
                  onChange={(e) => setFormData({ ...formData, valid_to: e.target.value })}
                  className="bg-white/10 border-white/20 text-white mt-1"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Max Uses (Optional)</Label>
                <Input
                  type="number"
                  value={formData.max_uses || ''}
                  onChange={(e) => setFormData({ ...formData, max_uses: e.target.value ? parseInt(e.target.value) : null })}
                  placeholder="Unlimited"
                  className="bg-white/10 border-white/20 text-white mt-1"
                  min="1"
                />
              </div>

              <div>
                <Label>Min Purchase ($)</Label>
                <Input
                  type="number"
                  value={formData.min_purchase_amount}
                  onChange={(e) => setFormData({ ...formData, min_purchase_amount: parseFloat(e.target.value) || 0 })}
                  className="bg-white/10 border-white/20 text-white mt-1"
                  min="0"
                  step="0.01"
                />
              </div>
            </div>

            <div>
              <Label>Applicable Packages (Optional)</Label>
              <div className="space-y-2 mt-2">
                <p className="text-xs text-white/60">Leave empty to apply to all packages</p>
                {PACKAGE_OPTIONS.map((pkg) => (
                  <div key={pkg.value} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id={pkg.value}
                      checked={formData.applicable_packages?.includes(pkg.value) || false}
                      onChange={(e) => {
                        const packages = formData.applicable_packages || [];
                        if (e.target.checked) {
                          setFormData({ ...formData, applicable_packages: [...packages, pkg.value] });
                        } else {
                          setFormData({ ...formData, applicable_packages: packages.filter(p => p !== pkg.value) });
                        }
                      }}
                      className="rounded border-white/20 bg-white/10 text-copper-500"
                    />
                    <label htmlFor={pkg.value} className="text-sm text-white/80">
                      {pkg.label}
                    </label>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="active">Active</Label>
              <Switch
                id="active"
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 mt-6">
            <Button
              onClick={closeDialog}
              variant="outline"
              className="bg-white/5 border-white/20 hover:bg-white/10"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!formData.code || formData.discount_value <= 0}
              className="bg-copper-500 hover:bg-copper-600 text-black"
            >
              {editingPromo ? 'Update' : 'Create'} Promo Code
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}