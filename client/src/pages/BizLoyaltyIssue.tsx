import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft, Sparkles, CheckCircle2, AlertCircle } from 'lucide-react';
import { Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';

const issueSchema = z.object({
  userEmail: z.string().email('Please enter a valid email address'),
  billAmount: z.string().min(1, 'Bill amount is required')
    .refine((val) => !isNaN(parseFloat(val)) && parseFloat(val) > 0, 'Must be a positive number'),
  reference: z.string().optional(),
});

type IssueFormData = z.infer<typeof issueSchema>;

interface ConfigResponse {
  ok: boolean;
  config: {
    organizerId: string;
    businessName: string;
    issueRatePerDollar: number;
    redeemCapPercentage: number;
    pointBankIncluded: number;
    pointBankPurchased: number;
    totalPointBank: number;
    subscriptionTier: string;
    subscriptionStatus: string;
    isBetaFree: boolean;
  };
}

interface IssueResponse {
  ok: boolean;
  error?: string;
  transaction?: {
    userEmail: string;
    pointsIssued: number;
    billAmountCents: number;
    cadValue: string;
    bucketUsed: 'included' | 'purchased' | 'both';
    remainingBank: {
      included: number;
      purchased: number;
      total: number;
    };
  };
}

export default function BizLoyaltyIssue() {
  const { toast } = useToast();
  const [successData, setSuccessData] = useState<IssueResponse['transaction'] | null>(null);

  const { data: response, isLoading } = useQuery<ConfigResponse>({
    queryKey: ['/api/loyalty/business/config'],
  });

  const config = response?.config;

  const form = useForm<IssueFormData>({
    resolver: zodResolver(issueSchema),
    defaultValues: {
      userEmail: '',
      billAmount: '',
      reference: '',
    },
  });

  const issueMutation = useMutation({
    mutationFn: async (data: { userEmail: string; billAmountCents: number; reference?: string }) => {
      const response = await apiRequest('POST', '/api/loyalty/business/issue', data);
      return await response.json();
    },
    onSuccess: (data: any) => {
      if (data.ok && data.transaction) {
        setSuccessData(data.transaction);
        queryClient.invalidateQueries({ queryKey: ['/api/loyalty/business/config'] });
        form.reset();
      } else {
        toast({
          title: 'Error',
          description: data.error || 'Failed to issue points.',
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

  const handleSubmit = (data: IssueFormData) => {
    const billAmountCents = Math.round(parseFloat(data.billAmount) * 100);
    
    issueMutation.mutate({
      userEmail: data.userEmail,
      billAmountCents,
      reference: data.reference || undefined,
    });
  };

  const watchedBillAmount = form.watch('billAmount');
  const previewPoints = watchedBillAmount && !isNaN(parseFloat(watchedBillAmount)) && config
    ? Math.floor(parseFloat(watchedBillAmount) * config.issueRatePerDollar)
    : 0;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background py-4 sm:py-8">
        <div className="container max-w-4xl mx-auto px-3 sm:px-4">
          <Skeleton className="h-10 w-64 mb-6" />
          <Skeleton className="h-96" />
        </div>
      </div>
    );
  }

  if (!config) {
    return (
      <div className="min-h-screen bg-background py-4 sm:py-8">
        <div className="container max-w-4xl mx-auto px-3 sm:px-4">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Failed to load loyalty configuration. Please try again.
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
          <Link href="/biz/loyalty/home">
            <Button variant="ghost" size="sm" className="mb-4" data-testid="button-back-home">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Loyalty Home
            </Button>
          </Link>
          <h1 className="text-3xl font-bold mb-2" data-testid="text-page-title">Issue Points</h1>
          <p className="text-muted-foreground" data-testid="text-page-description">
            Issue Jugnu Coalition Points to customers for purchases at your business
          </p>
        </div>

        {/* FREE BETA Alert */}
        {config.isBetaFree && (
          <Alert className="mb-6 border-orange-200 dark:border-orange-900 bg-orange-50 dark:bg-orange-950/20" data-testid="alert-beta">
            <Sparkles className="h-4 w-4 text-orange-600 dark:text-orange-400" />
            <AlertDescription className="text-orange-900 dark:text-orange-100">
              <strong>FREE BETA</strong> — Loyalty is free during beta. Issue points at no cost!
            </AlertDescription>
          </Alert>
        )}

        {/* Success Message */}
        {successData && (
          <Card className="mb-6 border-green-200 dark:border-green-900 bg-green-50 dark:bg-green-950/20" data-testid="card-success">
            <CardHeader>
              <div className="flex items-start gap-3">
                <CheckCircle2 className="h-6 w-6 text-green-600 dark:text-green-400 mt-1" />
                <div>
                  <CardTitle className="text-green-900 dark:text-green-100">Points Issued Successfully!</CardTitle>
                  <CardDescription className="text-green-700 dark:text-green-300">
                    Transaction completed for {successData.userEmail}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Points Issued</p>
                  <p className="text-2xl font-bold text-orange-600 dark:text-orange-400" data-testid="text-points-issued">
                    {successData.pointsIssued.toLocaleString()} JP
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Bill Amount</p>
                  <p className="text-2xl font-bold" data-testid="text-bill-amount">
                    ${successData.cadValue}
                  </p>
                </div>
              </div>
              <Separator />
              <div>
                <p className="text-sm text-muted-foreground mb-2">Point Bank Remaining</p>
                <div className="grid grid-cols-3 gap-2 text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground">Included</p>
                    <p className="font-semibold" data-testid="text-remaining-included">
                      {successData.remainingBank.included.toLocaleString()} JP
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Purchased</p>
                    <p className="font-semibold" data-testid="text-remaining-purchased">
                      {successData.remainingBank.purchased.toLocaleString()} JP
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Total</p>
                    <p className="font-semibold text-orange-600 dark:text-orange-400" data-testid="text-remaining-total">
                      {successData.remainingBank.total.toLocaleString()} JP
                    </p>
                  </div>
                </div>
              </div>
              <Button 
                onClick={() => setSuccessData(null)} 
                className="w-full mt-4"
                data-testid="button-issue-another"
              >
                Issue More Points
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Issue Form */}
        {!successData && (
          <Card data-testid="card-issue-form">
            <CardHeader>
              <CardTitle>Customer & Purchase Details</CardTitle>
              <CardDescription>
                Enter customer email and bill amount to calculate and issue points
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
                  {/* User Email */}
                  <FormField
                    control={form.control}
                    name="userEmail"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Customer Email</FormLabel>
                        <FormControl>
                          <Input 
                            type="email" 
                            placeholder="customer@example.com" 
                            {...field}
                            data-testid="input-user-email"
                          />
                        </FormControl>
                        <FormDescription>
                          The customer must have a Jugnu account with this email
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
                          Total bill amount before tax and tips
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Reference (Optional) */}
                  <FormField
                    control={form.control}
                    name="reference"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Reference (Optional)</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Receipt #, Invoice ID, etc." 
                            {...field}
                            data-testid="input-reference"
                          />
                        </FormControl>
                        <FormDescription>
                          Internal reference for your records
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Preview Section */}
                  {previewPoints > 0 && (
                    <div className="bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-950/30 dark:to-amber-950/30 p-6 rounded-lg border border-orange-200 dark:border-orange-900">
                      <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
                        <Sparkles className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                        Points Preview
                      </h3>
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-700 dark:text-gray-300">Bill Amount:</span>
                          <span className="font-semibold text-gray-900 dark:text-gray-100" data-testid="text-preview-bill">
                            ${parseFloat(watchedBillAmount).toFixed(2)} CAD
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-700 dark:text-gray-300">Current Issue Rate:</span>
                          <span className="font-semibold text-gray-900 dark:text-gray-100" data-testid="text-preview-rate">
                            {config.issueRatePerDollar} JP / $1
                          </span>
                        </div>
                        <Separator />
                        <div className="flex justify-between items-center">
                          <span className="font-semibold text-gray-900 dark:text-gray-100">Points to Issue:</span>
                          <span className="text-2xl font-bold text-orange-600 dark:text-orange-400" data-testid="text-preview-points">
                            {previewPoints.toLocaleString()} JP
                          </span>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-gray-700 dark:text-gray-300">Value to Customer:</span>
                          <span className="font-medium text-gray-900 dark:text-gray-100" data-testid="text-preview-cad-value">
                            ${(previewPoints / 1000).toFixed(2)} CAD
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Point Bank Warning */}
                  {config.totalPointBank === 0 && (
                    <Alert variant="destructive" data-testid="alert-no-points">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        Your point bank is empty. You cannot issue points until you top up your balance.
                      </AlertDescription>
                    </Alert>
                  )}

                  {/* Low Points Warning */}
                  {config.totalPointBank > 0 && previewPoints > config.totalPointBank && (
                    <Alert variant="destructive" data-testid="alert-insufficient-points">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        Insufficient points in your bank. You have {config.totalPointBank.toLocaleString()} JP available, 
                        but need {previewPoints.toLocaleString()} JP for this transaction.
                      </AlertDescription>
                    </Alert>
                  )}

                  {/* Submit Button */}
                  <div className="flex gap-3 pt-4">
                    <Button
                      type="submit"
                      disabled={issueMutation.isPending || config.totalPointBank === 0 || previewPoints > config.totalPointBank}
                      className="flex-1"
                      data-testid="button-issue-points"
                    >
                      {issueMutation.isPending ? 'Issuing...' : 'Issue Points'}
                    </Button>
                    <Link href="/biz/loyalty/home">
                      <Button type="button" variant="outline" data-testid="button-cancel">
                        Cancel
                      </Button>
                    </Link>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
