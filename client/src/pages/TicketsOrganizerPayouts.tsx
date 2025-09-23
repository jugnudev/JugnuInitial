import { useQuery } from "@tanstack/react-query";
import { DollarSign, Calendar, Download, TrendingUp } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format } from "date-fns";

interface Payout {
  id: string;
  amount: number;
  status: 'pending' | 'processing' | 'paid' | 'failed';
  createdAt: Date;
  paidAt?: Date;
  method: string;
  description: string;
}

interface RevenueSummary {
  totalEarned: number;
  totalPaidOut: number;
  pendingBalance: number;
  lastPayoutDate?: string;
}

export function TicketsOrganizerPayouts() {
  const organizerId = localStorage.getItem('ticketsOrganizerId');

  const { data: revenueData, isLoading: revenueLoading } = useQuery<{ ok: boolean; summary: RevenueSummary }>({
    queryKey: ['/api/tickets/organizers/revenue-summary'],
    enabled: !!organizerId,
    meta: {
      headers: {
        'x-organizer-id': organizerId || ''
      }
    }
  });

  const { data: payoutsData, isLoading: payoutsLoading } = useQuery<{ ok: boolean; payouts: Payout[] }>({
    queryKey: ['/api/tickets/organizers', organizerId, 'payouts'],
    enabled: !!organizerId,
    meta: {
      headers: {
        'x-organizer-id': organizerId || ''
      }
    }
  });

  if (!organizerId) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <h1 className="text-2xl font-fraunces mb-4">Access Denied</h1>
        <p className="text-muted-foreground">Please log in to view payouts.</p>
      </div>
    );
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return <Badge className="bg-green-100 text-green-800">Paid</Badge>;
      case 'processing':
        return <Badge className="bg-blue-100 text-blue-800">Processing</Badge>;
      case 'pending':
        return <Badge variant="secondary">Pending</Badge>;
      case 'failed':
        return <Badge variant="destructive">Failed</Badge>;
      default:
        return null;
    }
  };

  const formatCurrency = (cents: number) => {
    return `$${(cents / 100).toFixed(2)}`;
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-fraunces mb-2">Payouts</h1>
          <p className="text-lg text-muted-foreground">
            Track your earnings and payout history
          </p>
        </div>

        {/* Revenue Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Earned</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {revenueLoading ? (
                  <Skeleton className="h-8 w-24" />
                ) : (
                  formatCurrency(revenueData?.summary?.totalEarned || 0)
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Platform fees deducted
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Paid Out</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {revenueLoading ? (
                  <Skeleton className="h-8 w-24" />
                ) : (
                  formatCurrency(revenueData?.summary?.totalPaidOut || 0)
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Transferred to your account
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Balance</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {revenueLoading ? (
                  <Skeleton className="h-8 w-24" />
                ) : (
                  formatCurrency(revenueData?.summary?.pendingBalance || 0)
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Ready for payout
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Last Payout</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-lg font-bold">
                {revenueData?.summary?.lastPayoutDate ? 
                  format(new Date(revenueData.summary.lastPayoutDate), 'MMM d') : 
                  'None yet'
                }
              </div>
              <p className="text-xs text-muted-foreground">
                Most recent transfer
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Payout History */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Payout History</CardTitle>
                <CardDescription>
                  All payouts are processed automatically every Friday
                </CardDescription>
              </div>
              <Button variant="outline" data-testid="button-download">
                <Download className="w-4 h-4 mr-2" />
                Download CSV
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="all" className="w-full">
              <TabsList>
                <TabsTrigger value="all">All Payouts</TabsTrigger>
                <TabsTrigger value="paid">Paid</TabsTrigger>
                <TabsTrigger value="pending">Pending</TabsTrigger>
              </TabsList>

              <TabsContent value="all" className="space-y-4">
                {payoutsLoading ? (
                  <div className="space-y-4">
                    {[1, 2, 3].map(i => (
                      <div key={i} className="flex items-center justify-between p-4 border rounded-lg">
                        <div>
                          <Skeleton className="h-4 w-32 mb-2" />
                          <Skeleton className="h-3 w-24" />
                        </div>
                        <Skeleton className="h-6 w-16" />
                      </div>
                    ))}
                  </div>
                ) : !payoutsData?.payouts?.length ? (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground mb-4">
                      No payouts yet. Your first payout will be processed once you have earnings.
                    </p>
                    <div className="text-sm text-muted-foreground">
                      <p>• Payouts are processed weekly on Fridays</p>
                      <p>• Minimum payout amount is $25</p>
                      <p>• Funds are typically available within 2-3 business days</p>
                    </div>
                  </div>
                ) : (
                  payoutsData.payouts.map(payout => (
                    <div 
                      key={payout.id}
                      className="flex items-center justify-between p-4 border rounded-lg"
                      data-testid={`payout-${payout.id}`}
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold">{formatCurrency(payout.amount)}</span>
                          {getStatusBadge(payout.status)}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {payout.description} • {payout.method}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Created: {format(new Date(payout.createdAt), 'PPP')}
                          {payout.paidAt && ` • Paid: ${format(new Date(payout.paidAt), 'PPP')}`}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </TabsContent>

              <TabsContent value="paid" className="space-y-4">
                {payoutsData?.payouts?.filter(p => p.status === 'paid').map(payout => (
                  <div 
                    key={payout.id}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold">{formatCurrency(payout.amount)}</span>
                        {getStatusBadge(payout.status)}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {payout.description} • {payout.method}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Paid: {payout.paidAt && format(new Date(payout.paidAt), 'PPP')}
                      </p>
                    </div>
                  </div>
                ))}
              </TabsContent>

              <TabsContent value="pending" className="space-y-4">
                {payoutsData?.payouts?.filter(p => p.status === 'pending' || p.status === 'processing').map(payout => (
                  <div 
                    key={payout.id}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold">{formatCurrency(payout.amount)}</span>
                        {getStatusBadge(payout.status)}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {payout.description} • {payout.method}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Created: {format(new Date(payout.createdAt), 'PPP')}
                      </p>
                    </div>
                  </div>
                ))}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Payout Information */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Payout Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
              <div>
                <h4 className="font-semibold mb-2">How Payouts Work</h4>
                <ul className="space-y-1 text-muted-foreground">
                  <li>• Payouts are processed automatically every Friday</li>
                  <li>• Minimum payout amount is $25</li>
                  <li>• Platform fee is 3% + $0.30 per transaction</li>
                  <li>• Funds typically arrive within 2-3 business days</li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold mb-2">Payment Methods</h4>
                <ul className="space-y-1 text-muted-foreground">
                  <li>• E-transfer to your registered email</li>
                  <li>• Direct deposit to your bank account</li>
                  <li>• PayPal (coming soon)</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}