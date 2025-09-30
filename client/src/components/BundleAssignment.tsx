import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { CheckCircle2, Link2, Link2Off, AlertCircle, Package } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

interface Community {
  id: string;
  name: string;
  slug: string;
  subscription?: {
    id: string;
    bundleId?: string;
    status: string;
    plan: string;
  };
}

interface Bundle {
  id: string;
  bundleType: string;
  communitiesIncluded: number;
  communitiesUsed: number;
  status: string;
  communities?: { id: string; status: string }[];
  availableSlots?: number;
}

interface BundleAssignmentProps {
  organizerId: string;
}

export function BundleAssignment({ organizerId }: BundleAssignmentProps) {
  const [selectedCommunity, setSelectedCommunity] = useState<string>('');
  const [communityToRemove, setCommunityToRemove] = useState<Community | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch bundle details
  const { data: bundleData, isLoading: bundleLoading } = useQuery({
    queryKey: [`/api/billing/bundle/${organizerId}`],
    enabled: !!organizerId
  });

  // Fetch organizer's communities
  const { data: communitiesData, isLoading: communitiesLoading } = useQuery({
    queryKey: [`/api/organizers/${organizerId}/communities`],
    enabled: !!organizerId
  });

  const bundle: Bundle | null = bundleData?.bundle;
  const communities: Community[] = communitiesData?.communities || [];

  // Filter communities that are not already in a bundle
  const availableCommunities = communities.filter(
    c => !c.subscription?.bundleId
  );

  // Filter communities that are in this bundle
  const bundledCommunities = communities.filter(
    c => c.subscription?.bundleId === bundle?.id
  );

  // Assign community to bundle mutation
  const assignToBundleMutation = useMutation({
    mutationFn: async (params: { communityId: string; bundleId: string }) => {
      return apiRequest('/api/billing/assign-to-bundle', 'POST', params);
    },
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Community assigned to bundle successfully'
      });
      queryClient.invalidateQueries({ queryKey: [`/api/billing/bundle/${organizerId}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/organizers/${organizerId}/communities`] });
      setSelectedCommunity('');
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to assign community to bundle',
        variant: 'destructive'
      });
    }
  });

  // Remove from bundle mutation
  const removeFromBundleMutation = useMutation({
    mutationFn: async (params: { communityId: string; bundleId: string }) => {
      return apiRequest('/api/billing/remove-from-bundle', 'POST', params);
    },
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Community removed from bundle successfully'
      });
      queryClient.invalidateQueries({ queryKey: [`/api/billing/bundle/${organizerId}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/organizers/${organizerId}/communities`] });
      setCommunityToRemove(null);
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to remove community from bundle',
        variant: 'destructive'
      });
    }
  });

  const handleAssignToBundle = () => {
    if (!selectedCommunity || !bundle?.id) return;
    assignToBundleMutation.mutate({ 
      communityId: selectedCommunity, 
      bundleId: bundle.id 
    });
  };

  const handleRemoveFromBundle = () => {
    if (!communityToRemove || !bundle?.id) return;
    removeFromBundleMutation.mutate({ 
      communityId: communityToRemove.id, 
      bundleId: bundle.id 
    });
  };

  if (bundleLoading || communitiesLoading) {
    return (
      <Card className="w-full max-w-3xl mx-auto">
        <CardHeader>
          <CardTitle>Loading...</CardTitle>
        </CardHeader>
      </Card>
    );
  }

  if (!bundle) {
    return (
      <Card className="w-full max-w-3xl mx-auto">
        <CardHeader>
          <CardTitle>No Bundle Subscription</CardTitle>
          <CardDescription>
            You don't have an active bundle subscription. Purchase a bundle to manage multiple communities.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const availableSlots = bundle.communitiesIncluded - bundle.communitiesUsed;

  return (
    <>
      <Card className="w-full max-w-3xl mx-auto" data-testid="card-bundle-assignment">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Bundle Assignment
              </CardTitle>
              <CardDescription>
                Manage which communities are included in your bundle subscription
              </CardDescription>
            </div>
            <Badge variant={bundle.status === 'active' ? 'default' : 'secondary'} data-testid={`badge-bundle-status-${bundle.status}`}>
              {bundle.status}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Bundle Status */}
          <div className="bg-muted rounded-lg p-4 space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Bundle Capacity</span>
              <span className="text-sm" data-testid="text-bundle-capacity">
                {bundle.communitiesUsed} / {bundle.communitiesIncluded} communities
              </span>
            </div>
            <div className="w-full bg-background rounded-full h-2">
              <div 
                className="bg-primary h-2 rounded-full transition-all"
                style={{ width: `${(bundle.communitiesUsed / bundle.communitiesIncluded) * 100}%` }}
                data-testid="progress-bundle-usage"
              />
            </div>
            {availableSlots === 0 && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Your bundle is at full capacity. Remove a community to add a new one.
                </AlertDescription>
              </Alert>
            )}
          </div>

          {/* Add Community to Bundle */}
          {availableSlots > 0 && availableCommunities.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-medium">Add Community to Bundle</h3>
              <div className="flex gap-2">
                <Select value={selectedCommunity} onValueChange={setSelectedCommunity}>
                  <SelectTrigger className="flex-1" data-testid="select-community">
                    <SelectValue placeholder="Select a community to add" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableCommunities.map((community) => (
                      <SelectItem key={community.id} value={community.id} data-testid={`option-community-${community.id}`}>
                        {community.name}
                        {community.subscription?.plan === 'monthly' && (
                          <span className="ml-2 text-xs text-muted-foreground">
                            (Individual subscription)
                          </span>
                        )}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  onClick={handleAssignToBundle}
                  disabled={!selectedCommunity || assignToBundleMutation.isPending}
                  data-testid="button-assign-to-bundle"
                >
                  <Link2 className="h-4 w-4 mr-2" />
                  Add to Bundle
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Adding a community to the bundle will cancel its individual subscription if one exists.
              </p>
            </div>
          )}

          {/* Current Communities in Bundle */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium">Communities in Bundle</h3>
            {bundledCommunities.length > 0 ? (
              <div className="space-y-2">
                {bundledCommunities.map((community) => (
                  <div
                    key={community.id}
                    className="flex items-center justify-between p-3 border rounded-lg"
                    data-testid={`card-bundled-community-${community.id}`}
                  >
                    <div className="flex items-center gap-3">
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                      <div>
                        <p className="font-medium">{community.name}</p>
                        <p className="text-xs text-muted-foreground">/{community.slug}</p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setCommunityToRemove(community)}
                      disabled={removeFromBundleMutation.isPending}
                      data-testid={`button-remove-${community.id}`}
                    >
                      <Link2Off className="h-4 w-4 mr-2" />
                      Remove
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No communities assigned to this bundle yet.
              </p>
            )}
          </div>

          {/* Savings Information */}
          {bundle.communitiesUsed > 0 && (
            <Alert>
              <CheckCircle2 className="h-4 w-4" />
              <AlertDescription>
                You're saving ${(bundle.communitiesUsed * 20 - 75).toFixed(2)} CAD/month compared to individual subscriptions!
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Remove Confirmation Dialog */}
      <AlertDialog open={!!communityToRemove} onOpenChange={(open) => !open && setCommunityToRemove(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove from Bundle?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove "{communityToRemove?.name}" from your bundle? 
              The community will revert to the free plan unless you purchase an individual subscription.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-remove">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleRemoveFromBundle} data-testid="button-confirm-remove">
              Remove from Bundle
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}