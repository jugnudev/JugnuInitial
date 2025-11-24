import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Slider } from '@/components/ui/slider';
import { Progress } from '@/components/ui/progress';
import { Coins, TrendingUp, Settings, Info, Zap } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useLocation } from 'wouter';

interface LoyaltyConfig {
  id: string;
  organizer_id: string;
  issue_rate: number;
  redeem_cap_percent: number;
  included_jp_bank: number;
  purchased_jp_bank: number;
  created_at: string;
  updated_at: string;
}

interface ConfigResponse {
  ok: boolean;
  error?: string;
  config?: LoyaltyConfig;
}

export default function BizLoyaltyHome() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [issueRate, setIssueRate] = useState(100);

  const { data: response, isLoading, error } = useQuery<ConfigResponse>({
    queryKey: ['/api/loyalty/business/config'],
  });

  const config = response?.config;

  // Update local state when config loads
  if (config && issueRate === 100) {
    setIssueRate(config.issue_rate);
  }

  const totalBank = (config?.included_jp_bank || 0) + (config?.purchased_jp_bank || 0);
  const includedPercent = totalBank > 0 ? (config?.included_jp_bank || 0) / totalBank * 100 : 0;
  const purchasedPercent = totalBank > 0 ? (config?.purchased_jp_bank || 0) / totalBank * 100 : 0;

  const updateMutation = useMutation({
    mutationFn: async (data: { issue_rate: number }) => {
      const response = await apiRequest('PATCH', '/api/loyalty/business/config', data);
      return await response.json();
    },
    onSuccess: (data: any) => {
      if (data.ok) {
        queryClient.invalidateQueries({ queryKey: ['/api/loyalty/business/config'] });
        toast({
          title: 'Config updated',
          description: 'Your loyalty settings have been saved.',
        });
      } else {
        toast({
          title: 'Error',
          description: data.error || 'Failed to update config.',
          variant: 'destructive',
        });
      }
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Something went wrong.',
        variant: 'destructive',
      });
    }
  });

  const handleSave = () => {
    updateMutation.mutate({ issue_rate: issueRate });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background py-4 sm:py-8">
        <div className="container max-w-5xl mx-auto px-3 sm:px-4">
          <div className="mb-6">
            <Skeleton className="h-10 w-64 mb-2" />
            <Skeleton className="h-6 w-96" />
          </div>
          <div className="grid gap-6 md:grid-cols-2">
            <Skeleton className="h-64" />
            <Skeleton className="h-64" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !response?.ok) {
    return (
      <div className="min-h-screen bg-background py-4 sm:py-8">
        <div className="container max-w-5xl mx-auto px-3 sm:px-4">
          <Alert variant="destructive">
            <AlertDescription>
              {response?.error || 'Failed to load loyalty config. Please ensure you have an active business account.'}
            </AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  const issueRatePercentage = ((issueRate / 1000) * 100).toFixed(1);

  return (
    <div className="min-h-screen bg-background py-4 sm:py-8">
      <div className="container max-w-5xl mx-auto px-3 sm:px-4 space-y-6">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-3xl sm:text-4xl font-fraunces flex items-center gap-2">
            <Coins className="w-8 h-8 text-orange-500" />
            Loyalty Program
          </h1>
          <p className="text-muted-foreground">
            Manage your Jugnu Coalition Points settings and issue points to customers
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Point Bank Card */}
          <Card className="premium-gradient-border" data-testid="card-point-bank">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-orange-500" />
                Point Bank
              </CardTitle>
              <CardDescription>Your available points to issue to customers</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Total Bank */}
              <div className="space-y-2">
                <div className="flex items-baseline justify-between">
                  <div className="text-3xl font-bold text-orange-500" data-testid="text-total-points">
                    {totalBank.toLocaleString()} JP
                  </div>
                  <div className="text-sm text-muted-foreground">
                    = ${(totalBank / 1000).toFixed(2)} CAD
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">Total available points</p>
              </div>

              {/* Included JP Meter */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <Label>Included JP (Subscription)</Label>
                  <span className="font-medium" data-testid="text-included-points">
                    {(config?.included_jp_bank || 0).toLocaleString()} JP
                  </span>
                </div>
                <Progress 
                  value={includedPercent} 
                  className="h-2"
                  data-testid="progress-included"
                />
                <p className="text-xs text-muted-foreground">
                  {includedPercent.toFixed(0)}% of total bank
                </p>
              </div>

              {/* Purchased JP Meter */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <Label>Purchased JP (Top-ups)</Label>
                  <span className="font-medium" data-testid="text-purchased-points">
                    {(config?.purchased_jp_bank || 0).toLocaleString()} JP
                  </span>
                </div>
                <Progress 
                  value={purchasedPercent} 
                  className="h-2 [&>div]:bg-blue-500"
                  data-testid="progress-purchased"
                />
                <p className="text-xs text-muted-foreground">
                  {purchasedPercent.toFixed(0)}% of total bank
                </p>
              </div>

              {totalBank === 0 && (
                <Alert>
                  <Info className="w-4 h-4" />
                  <AlertDescription className="text-xs">
                    You've used all your points! Top up to continue issuing rewards.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>

          {/* Issue Rate Config Card */}
          <Card className="premium-gradient-border" data-testid="card-issue-rate">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5 text-orange-500" />
                Issue Rate
              </CardTitle>
              <CardDescription>How many points customers earn per dollar spent</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Current Rate Display */}
              <div className="text-center p-6 bg-muted/50 rounded-lg">
                <div className="text-4xl font-bold text-orange-500" data-testid="text-issue-rate">
                  {issueRate} JP
                </div>
                <div className="text-sm text-muted-foreground mt-1">
                  per $1 spent
                </div>
                <div className="text-xs text-muted-foreground mt-2">
                  = {issueRatePercentage}% cashback value
                </div>
              </div>

              {/* Slider */}
              <div className="space-y-4">
                <Label>Adjust issue rate (0-150 JP per $1)</Label>
                <Slider
                  min={0}
                  max={150}
                  step={5}
                  value={[issueRate]}
                  onValueChange={(value) => setIssueRate(value[0])}
                  className="w-full"
                  data-testid="slider-issue-rate"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>0 JP</span>
                  <span>75 JP</span>
                  <span>150 JP</span>
                </div>
              </div>

              <Alert className="bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
                <Info className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <AlertDescription className="text-xs text-blue-900 dark:text-blue-100">
                  Higher rates = more customer loyalty. Most merchants use 50-100 JP/$1.
                </AlertDescription>
              </Alert>

              {/* Save Button */}
              <Button
                onClick={handleSave}
                disabled={updateMutation.isPending || issueRate === config?.issue_rate}
                className="w-full"
                data-testid="button-save-config"
              >
                {updateMutation.isPending ? 'Saving...' : 'Save Configuration'}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="grid gap-4 md:grid-cols-2">
          <Button
            onClick={() => setLocation('/biz/loyalty/issue')}
            size="lg"
            className="h-16"
            data-testid="button-issue-points"
          >
            <Coins className="w-5 h-5 mr-2" />
            Issue Points to Customer
          </Button>
          <Button
            variant="outline"
            size="lg"
            className="h-16"
            disabled
            data-testid="button-view-history"
          >
            <TrendingUp className="w-5 h-5 mr-2" />
            View Transaction History (Coming Soon)
          </Button>
        </div>
      </div>
    </div>
  );
}
