import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Wallet, QrCode, TrendingUp, Store, Coins, Info, Clock } from 'lucide-react';
import { useState, useEffect } from 'react';
import QRCodeLib from 'qrcode';
import { useLocation } from 'wouter';
import { format } from 'date-fns';

interface WalletData {
  wallet: {
    id: string;
    user_id: string;
    total_points: number;
    created_at: string;
    updated_at: string;
  };
  merchantEarnings: Array<{
    id: string;
    merchant_id: string;
    total_earned: number;
    business_name?: string;
  }>;
}

interface WalletResponse {
  ok: boolean;
  error?: string;
  data?: WalletData;
}

interface Transaction {
  id: string;
  createdAt: string;
  type: 'earn' | 'redeem';
  points: number;
  cadValue: string | null;
  businessName: string;
  reference: string | null;
}

interface TransactionsResponse {
  ok: boolean;
  error?: string;
  transactions?: Transaction[];
}

export default function WalletPage() {
  const [, setLocation] = useLocation();
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');

  const { data: response, isLoading, error } = useQuery<WalletResponse>({
    queryKey: ['/api/loyalty/wallet'],
  });

  const { data: qrResponse, error: qrError } = useQuery<{ ok: boolean; token?: string; error?: string }>({
    queryKey: ['/api/loyalty/wallet/qr'],
    enabled: !!response?.data?.wallet,
  });

  const { data: txResponse, isLoading: txLoading } = useQuery<TransactionsResponse>({
    queryKey: ['/api/loyalty/transactions'],
    enabled: !!response?.data?.wallet,
  });

  const wallet = response?.data?.wallet;
  const merchantEarnings = response?.data?.merchantEarnings || [];
  const transactions = txResponse?.transactions || [];
  const totalPoints = wallet?.total_points || 0;
  const cadValue = (totalPoints / 1000).toFixed(2);

  useEffect(() => {
    if (qrResponse?.token) {
      QRCodeLib.toDataURL(qrResponse.token, { errorCorrectionLevel: 'M', width: 300 })
        .then(setQrCodeUrl)
        .catch(console.error);
    }
  }, [qrResponse]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background py-4 sm:py-8">
        <div className="container max-w-4xl mx-auto px-3 sm:px-4">
          <div className="mb-6">
            <Skeleton className="h-10 w-64 mb-2" />
            <Skeleton className="h-6 w-96" />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
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
        <div className="container max-w-4xl mx-auto px-3 sm:px-4">
          <Alert variant="destructive">
            <AlertDescription>
              {response?.error || 'Failed to load wallet. Please try again.'}
            </AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-4 sm:py-8">
      <div className="container max-w-4xl mx-auto px-3 sm:px-4 space-y-6">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-3xl sm:text-4xl font-fraunces flex items-center gap-2">
            <Wallet className="w-8 h-8 text-orange-500" />
            My Wallet
          </h1>
          <p className="text-muted-foreground">
            Your Jugnu Coalition Points wallet - Canada's South Asian rewards
          </p>
        </div>

        {/* Balance Card */}
        <Card className="premium-gradient-border" data-testid="card-balance">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Coins className="w-5 h-5 text-orange-500" />
              Total Balance
            </CardTitle>
            <CardDescription>Your available loyalty points</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1">
              <div className="text-4xl sm:text-5xl font-bold text-orange-500" data-testid="text-balance-points">
                {totalPoints.toLocaleString()} JP
              </div>
              <div className="text-lg text-muted-foreground" data-testid="text-balance-cad">
                = ${cadValue} CAD
              </div>
            </div>
            <Alert className="bg-orange-50 dark:bg-orange-950/20 border-orange-200 dark:border-orange-800">
              <Info className="w-4 h-4 text-orange-600 dark:text-orange-400" />
              <AlertDescription className="text-sm text-orange-900 dark:text-orange-100">
                Fixed value: 1,000 JP = $1.00 CAD
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>

        <div className="grid gap-6 md:grid-cols-2">
          {/* QR Code Card */}
          <Card data-testid="card-qr">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <QrCode className="w-5 h-5 text-orange-500" />
                My QR Code
              </CardTitle>
              <CardDescription>Scan to earn points at checkout</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center space-y-4">
              {qrError || qrResponse?.error ? (
                <Alert variant="destructive" className="w-full">
                  <AlertDescription>
                    {qrResponse?.error || 'Failed to generate QR code. Please try again later.'}
                  </AlertDescription>
                </Alert>
              ) : qrCodeUrl ? (
                <div className="bg-white p-4 rounded-lg">
                  <img 
                    src={qrCodeUrl} 
                    alt="Wallet QR Code" 
                    className="w-48 h-48"
                    data-testid="img-qr-code"
                  />
                </div>
              ) : (
                <Skeleton className="w-56 h-56" />
              )}
              <p className="text-sm text-muted-foreground text-center">
                Show this code to merchants when making purchases
              </p>
            </CardContent>
          </Card>

          {/* Merchant Breakdown Card */}
          <Card data-testid="card-merchant-breakdown">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Store className="w-5 h-5 text-orange-500" />
                Earned by Merchant
              </CardTitle>
              <CardDescription>Points earned from each business</CardDescription>
            </CardHeader>
            <CardContent>
              {merchantEarnings.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <TrendingUp className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No earnings yet</p>
                  <p className="text-xs mt-1">Start earning points at participating businesses</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {merchantEarnings.map((earning, index) => (
                    <div 
                      key={earning.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                      data-testid={`merchant-earning-${index}`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-orange-100 dark:bg-orange-900/20 flex items-center justify-center">
                          <Store className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                        </div>
                        <div>
                          <div className="font-medium" data-testid={`text-merchant-name-${index}`}>
                            {earning.business_name || 'Business'}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Lifetime earned
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold text-orange-600 dark:text-orange-400" data-testid={`text-merchant-points-${index}`}>
                          {earning.total_earned.toLocaleString()} JP
                        </div>
                        <div className="text-xs text-muted-foreground">
                          ${(earning.total_earned / 1000).toFixed(2)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Transaction History */}
        <Card data-testid="card-transactions">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-orange-500" />
              Transaction History
            </CardTitle>
            <CardDescription>Your recent points activity</CardDescription>
          </CardHeader>
          <CardContent>
            {txLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => (
                  <Skeleton key={i} className="h-16" />
                ))}
              </div>
            ) : transactions.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Info className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p className="font-medium">No transactions yet</p>
                <p className="text-sm mt-1">Your earn and redeem activity will appear here</p>
              </div>
            ) : (
              <div className="space-y-3">
                {transactions.map((tx, index) => (
                  <div 
                    key={tx.id}
                    className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                    data-testid={`transaction-${index}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        tx.type === 'earn' 
                          ? 'bg-green-100 dark:bg-green-900/20' 
                          : 'bg-blue-100 dark:bg-blue-900/20'
                      }`}>
                        {tx.type === 'earn' ? (
                          <Coins className="w-5 h-5 text-green-600 dark:text-green-400" />
                        ) : (
                          <Store className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                        )}
                      </div>
                      <div>
                        <div className="font-medium" data-testid={`text-tx-business-${index}`}>
                          {tx.businessName}
                        </div>
                        <div className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {format(new Date(tx.createdAt), 'MMM d, yyyy h:mm a')}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`font-semibold ${
                        tx.type === 'earn' 
                          ? 'text-green-600 dark:text-green-400' 
                          : 'text-blue-600 dark:text-blue-400'
                      }`} data-testid={`text-tx-points-${index}`}>
                        {tx.type === 'earn' ? '+' : '-'}{tx.points.toLocaleString()} JP
                      </div>
                      {tx.cadValue && (
                        <div className="text-xs text-muted-foreground">
                          ${tx.cadValue}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {transactions.length >= 10 && (
                  <div className="text-center pt-4">
                    <p className="text-sm text-muted-foreground">
                      Showing last {transactions.length} transactions
                    </p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <Button
            onClick={() => setLocation('/wallet/redeem')}
            className="flex-1"
            disabled={totalPoints === 0}
            data-testid="button-redeem"
          >
            Redeem Points
          </Button>
          <Button
            variant="outline"
            onClick={() => setLocation('/')}
            data-testid="button-home"
          >
            Back to Home
          </Button>
        </div>
      </div>
    </div>
  );
}
