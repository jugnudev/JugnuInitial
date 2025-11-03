import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft, Sparkles, CheckCircle2, AlertCircle, Store } from 'lucide-react';
import { Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Slider } from '@/components/ui/slider';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';

const redeemSchema = z.object({
  businessId: z.string().min(1, 'Please select a business'),
  billAmount: z.string().min(1, 'Bill amount is required')
    .refine((val) => !isNaN(parseFloat(val)) && parseFloat(val) > 0, 'Must be a positive number'),
  pointsToRedeem: z.number().int().min(1, 'Points to redeem must be at least 1'),
});

type RedeemFormData = z.infer<typeof redeemSchema>;

interface WalletResponse {
  ok: boolean;
  error?: string;
  data?: {
    wallet: {
      total_points: number;
    };
  };
}

interface RedeemResponse {
  ok: boolean;
  error?: string;
  transaction?: {
    pointsRedeemed: number;
    cadValue: string;
    billAmountCents: number;
    billDollars: string;
    newWalletBalance: number;
    maxRedeemablePoints: number;
    businessName: string;
  };
}

interface Business {
  id: string;
  name: string;
  redeemCapPercentage: number;
}

interface BusinessesResponse {
  ok: boolean;
  error?: string;
  businesses?: Business[];
}

export default function WalletRedeemPage() {
  const { toast } = useToast();
  const [successData, setSuccessData] = useState<RedeemResponse['transaction'] | null>(null);

  const { data: walletResponse, isLoading: walletLoading } = useQuery<WalletResponse>({
    queryKey: ['/api/loyalty/wallet'],
  });

  const { data: businessesResponse, isLoading: businessesLoading } = useQuery<BusinessesResponse>({
    queryKey: ['/api/loyalty/participating-businesses'],
  });

  const wallet = walletResponse?.data?.wallet;
  const totalPoints = wallet?.total_points || 0;
  const businesses = businessesResponse?.businesses || [];

  const form = useForm<RedeemFormData>({
    resolver: zodResolver(redeemSchema),
    defaultValues: {
      businessId: '',
      billAmount: '',
      pointsToRedeem: 0,
    },
  });

  const redeemMutation = useMutation({
    mutationFn: async (data: { businessId: string; billAmountCents: number; pointsToRedeem: number }) => {
      const response = await apiRequest('POST', '/api/loyalty/redeem', data);
      return await response.json();
    },
    onSuccess: (data: any) => {
      if (data.ok && data.transaction) {
        setSuccessData(data.transaction);
        queryClient.invalidateQueries({ queryKey: ['/api/loyalty/wallet'] });
        queryClient.invalidateQueries({ queryKey: ['/api/loyalty/transactions'] });
        form.reset();
      } else {
        toast({
          title: 'Error',
          description: data.error || 'Failed to redeem points.',
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

  const handleSubmit = (data: RedeemFormData) => {
    const billAmountCents = Math.round(parseFloat(data.billAmount) * 100);
    
    redeemMutation.mutate({
      businessId: data.businessId,
      billAmountCents,
      pointsToRedeem: data.pointsToRedeem,
    });
  };

  const watchedBillAmount = form.watch('billAmount');
  const watchedPoints = form.watch('pointsToRedeem');
  const watchedBusinessId = form.watch('businessId');
  
  const billDollars = watchedBillAmount && !isNaN(parseFloat(watchedBillAmount)) 
    ? parseFloat(watchedBillAmount) 
    : 0;
  
  // Get merchant-specific redeem cap
  const selectedBusiness = businesses.find(b => b.id === watchedBusinessId);
  const redeemCap = selectedBusiness?.redeemCapPercentage || 20; // Fallback to 20%
  
  const maxRedeemableCad = billDollars * (redeemCap / 100);
  const maxRedeemablePoints = Math.floor(maxRedeemableCad * 1000);
  const actualMax = Math.min(maxRedeemablePoints, totalPoints);
  
  const redeemCadValue = (watchedPoints / 1000).toFixed(2);

  if (walletLoading || businessesLoading) {
    return (
      <div className="min-h-screen bg-background py-4 sm:py-8">
        <div className="container max-w-4xl mx-auto px-3 sm:px-4">
          <Skeleton className="h-10 w-64 mb-6" />
          <Skeleton className="h-96" />
        </div>
      </div>
    );
  }

  if (!wallet) {
    return (
      <div className="min-h-screen bg-background py-4 sm:py-8">
        <div className="container max-w-4xl mx-auto px-3 sm:px-4">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Failed to load wallet. Please try again.
            </AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-4 sm:py-8">
      <div className="container max-w-4xl mx-auto px-3 sm:px-4">
        {/* Header */}
        <div className="mb-6">
          <Link href="/wallet">
            <Button variant="ghost" size="sm" className="mb-4" data-testid="button-back-wallet">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Wallet
            </Button>
          </Link>
          <h1 className="text-3xl font-bold mb-2" data-testid="text-page-title">Redeem Points</h1>
          <p className="text-muted-foreground" data-testid="text-page-description">
            Use your Jugnu Coalition Points for discounts at participating businesses
          </p>
        </div>

        {/* Current Balance */}
        <Card className="mb-6 bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-950/30 dark:to-amber-950/30 border-orange-200 dark:border-orange-900" data-testid="card-balance">
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-1">Available Balance</p>
              <p className="text-4xl font-bold text-orange-600 dark:text-orange-400" data-testid="text-balance">
                {totalPoints.toLocaleString()} JP
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                ${(totalPoints / 1000).toFixed(2)} CAD value
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Success Message */}
        {successData && (
          <Card className="mb-6 border-green-200 dark:border-green-900 bg-green-50 dark:bg-green-950/20" data-testid="card-success">
            <CardHeader>
              <div className="flex items-start gap-3">
                <CheckCircle2 className="h-6 w-6 text-green-600 dark:text-green-400 mt-1" />
                <div>
                  <CardTitle className="text-green-900 dark:text-green-100">Points Redeemed Successfully!</CardTitle>
                  <CardDescription className="text-green-700 dark:text-green-300">
                    Saved ${successData.cadValue} at {successData.businessName}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Points Used</p>
                  <p className="text-2xl font-bold text-orange-600 dark:text-orange-400" data-testid="text-points-used">
                    {successData.pointsRedeemed.toLocaleString()} JP
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Discount Applied</p>
                  <p className="text-2xl font-bold text-green-600 dark:text-green-400" data-testid="text-discount">
                    ${successData.cadValue}
                  </p>
                </div>
              </div>
              <Separator />
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">New Balance:</span>
                <span className="font-semibold text-lg" data-testid="text-new-balance">
                  {successData.newWalletBalance.toLocaleString()} JP
                </span>
              </div>
              <Button 
                onClick={() => setSuccessData(null)} 
                className="w-full mt-4"
                data-testid="button-redeem-more"
              >
                Redeem More Points
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Redeem Form */}
        {!successData && (
          <Card data-testid="card-redeem-form">
            <CardHeader>
              <CardTitle>Redeem Your Points</CardTitle>
              <CardDescription>
                Get instant discounts on your bill{selectedBusiness ? ` (max ${redeemCap}% at ${selectedBusiness.name})` : ''}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {totalPoints === 0 ? (
                <Alert variant="destructive" data-testid="alert-no-points">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    You don't have any points to redeem. Start earning points at participating businesses!
                  </AlertDescription>
                </Alert>
              ) : (
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
                    {/* Business Selection */}
                    <FormField
                      control={form.control}
                      name="businessId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Business</FormLabel>
                          <FormControl>
                            <select
                              {...field}
                              className="w-full px-3 py-2 border rounded-md bg-background"
                              data-testid="select-business"
                            >
                              <option value="">Select a business...</option>
                              {businesses.map(biz => (
                                <option key={biz.id} value={biz.id}>
                                  {biz.name} ({biz.redeemCapPercentage}% max)
                                </option>
                              ))}
                            </select>
                          </FormControl>
                          <FormDescription>
                            Choose where you're redeeming your points
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Bill Amount */}
                    <FormField
                      control={form.control}
                      name="billAmount"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Bill Amount (CAD)</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                              <Input 
                                type="number" 
                                step="0.01"
                                placeholder="0.00" 
                                className="pl-7"
                                {...field}
                                data-testid="input-bill-amount"
                              />
                            </div>
                          </FormControl>
                          <FormDescription>
                            Total bill amount before discount
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Points Slider */}
                    {actualMax > 0 && (
                      <FormField
                        control={form.control}
                        name="pointsToRedeem"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Points to Redeem</FormLabel>
                            <FormControl>
                              <div className="space-y-4">
                                <div className="text-center py-4 bg-muted/50 rounded-lg">
                                  <p className="text-3xl font-bold text-orange-600 dark:text-orange-400" data-testid="text-slider-points">
                                    {field.value.toLocaleString()} JP
                                  </p>
                                  <p className="text-sm text-muted-foreground">
                                    = ${redeemCadValue} CAD discount
                                  </p>
                                </div>
                                <Slider
                                  min={0}
                                  max={actualMax}
                                  step={100}
                                  value={[field.value]}
                                  onValueChange={(value) => field.onChange(value[0])}
                                  className="w-full"
                                  data-testid="slider-points"
                                />
                                <div className="flex justify-between text-xs text-muted-foreground">
                                  <span>0 JP</span>
                                  <span>{Math.floor(actualMax / 2).toLocaleString()} JP</span>
                                  <span>{actualMax.toLocaleString()} JP</span>
                                </div>
                              </div>
                            </FormControl>
                            <FormDescription>
                              Max redeemable: {actualMax.toLocaleString()} JP (${maxRedeemableCad.toFixed(2)})
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}

                    {/* Preview */}
                    {watchedPoints > 0 && (
                      <div className="bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950/30 dark:to-cyan-950/30 p-6 rounded-lg border border-blue-200 dark:border-blue-900">
                        <h3 className="font-semibold mb-4">Transaction Preview</h3>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Original Bill:</span>
                            <span className="font-medium">${billDollars.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Points Discount:</span>
                            <span className="font-medium text-green-600 dark:text-green-400">-${redeemCadValue}</span>
                          </div>
                          <Separator />
                          <div className="flex justify-between items-center">
                            <span className="font-semibold">Final Bill:</span>
                            <span className="text-xl font-bold">${(billDollars - parseFloat(redeemCadValue)).toFixed(2)}</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Submit Button */}
                    <div className="flex gap-3 pt-4">
                      <Button
                        type="submit"
                        disabled={redeemMutation.isPending || watchedPoints === 0 || totalPoints === 0}
                        className="flex-1"
                        data-testid="button-redeem"
                      >
                        {redeemMutation.isPending ? 'Redeeming...' : 'Redeem Points'}
                      </Button>
                      <Link href="/wallet">
                        <Button type="button" variant="outline" data-testid="button-cancel">
                          Cancel
                        </Button>
                      </Link>
                    </div>
                  </form>
                </Form>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
