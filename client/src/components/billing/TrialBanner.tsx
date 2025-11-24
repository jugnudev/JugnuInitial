import { AlertCircle, Sparkles } from 'lucide-react';
import { Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

interface TrialBannerProps {
  daysRemaining: number;
  communityId: string;
  className?: string;
}

/**
 * Displays a prominent trial status banner with upgrade CTA
 */
export function TrialBanner({ daysRemaining, communityId, className = '' }: TrialBannerProps) {
  const isExpiringSoon = daysRemaining <= 3;
  const hasExpired = daysRemaining <= 0;

  return (
    <Card 
      className={`border-amber-500/30 bg-gradient-to-r from-amber-500/10 to-amber-600/10 ${className}`}
      data-testid="card-trial-banner"
    >
      <CardContent className="pt-6">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex items-start gap-3 flex-1">
            <AlertCircle className={`w-5 h-5 flex-shrink-0 ${hasExpired ? 'text-red-400' : isExpiringSoon ? 'text-amber-400' : 'text-amber-400'}`} />
            <div>
              <p className={`font-semibold ${hasExpired ? 'text-red-400' : 'text-white'}`}>
                {hasExpired ? (
                  '⚠️ Trial Expired'
                ) : isExpiringSoon ? (
                  `⏰ Trial Ending Soon - ${daysRemaining} day${daysRemaining !== 1 ? 's' : ''} remaining`
                ) : (
                  `🎉 Free Trial Active - ${daysRemaining} day${daysRemaining !== 1 ? 's' : ''} remaining`
                )}
              </p>
              <p className="text-white/60 text-sm mt-1">
                {hasExpired ? (
                  'Subscribe now to restore access to all platform features'
                ) : (
                  'Subscribe to $50/month to continue using all features after your trial ends'
                )}
              </p>
            </div>
          </div>
          
          <Link href={`/subscribe/${communityId}`}>
            <Button 
              className="bg-copper-500 hover:bg-copper-600 text-black font-semibold whitespace-nowrap"
              data-testid="button-upgrade-trial"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              {hasExpired ? 'Subscribe Now' : 'Upgrade to Paid'}
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
