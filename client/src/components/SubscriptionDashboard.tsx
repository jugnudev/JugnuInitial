import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sparkles, TrendingUp, Calendar, DollarSign, Shield, Info } from "lucide-react";
import { format } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";

interface CreditBalance {
  available: number;
  used: number;
  resetDate: string | null;
  isBeta: boolean;
}

interface CreditUsage {
  id: string;
  createdAt: string;
  placementsUsed: string[];
  creditsDeducted: number;
  startDate: string;
  endDate: string;
  notes?: string;
}

export function SubscriptionDashboard() {
  const { data: creditsData, isLoading: isLoadingCredits } = useQuery<{ ok: boolean; credits: CreditBalance }>({
    queryKey: ['/api/billing/credits/balance'],
  });

  const { data: usageData, isLoading: isLoadingUsage } = useQuery<{ ok: boolean; usage: CreditUsage[] }>({
    queryKey: ['/api/billing/credits/usage'],
  });

  const credits = creditsData?.credits;
  const usage = usageData?.usage || [];

  if (isLoadingCredits) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const totalCreditsInCycle = credits?.available ? credits.available + (credits.used || 0) : 2;

  return (
    <div className="space-y-6">
      {/* Beta Notice */}
      {credits?.isBeta && (
        <Card className="border-jade-500/30 bg-gradient-to-br from-jade-500/10 to-jade-600/5">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <Shield className="w-5 h-5 text-jade-400 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-jade-300 mb-1">FREE BETA Access</h3>
                <p className="text-sm text-white/70 leading-relaxed">
                  You're enjoying unlimited ad placement credits during our beta period. When billing launches at 
                  $50/month, you'll receive 2 credits monthly with your subscription.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Credit Balance Card */}
      <Card className="border-copper-500/30 bg-gradient-to-br from-white/[0.07] to-white/[0.02] backdrop-blur-xl">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-white flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-copper-400" />
                Ad Placement Credits
              </CardTitle>
              <CardDescription className="text-white/60">
                Monthly credits for homepage and events page placements
              </CardDescription>
            </div>
            <Link href="/pricing">
              <Button 
                variant="ghost" 
                size="sm"
                className="text-copper-400 hover:text-copper-300 hover:bg-copper-500/10"
                data-testid="button-learn-more"
              >
                <Info className="w-4 h-4 mr-2" />
                Learn More
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Credit Balance Display */}
          <div className="grid md:grid-cols-3 gap-4">
            <div className="p-4 rounded-lg bg-white/[0.05] border border-white/10">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="w-4 h-4 text-jade-400" />
                <span className="text-sm text-white/60">Available</span>
              </div>
              <div className="text-3xl font-bold text-white">
                {credits?.isBeta ? '∞' : credits?.available || 0}
              </div>
              <div className="text-xs text-white/50 mt-1">
                {credits?.isBeta ? 'Unlimited in Beta' : `of ${totalCreditsInCycle} this month`}
              </div>
            </div>

            <div className="p-4 rounded-lg bg-white/[0.05] border border-white/10">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-4 h-4 text-copper-400" />
                <span className="text-sm text-white/60">Used</span>
              </div>
              <div className="text-3xl font-bold text-white">{credits?.used || 0}</div>
              <div className="text-xs text-white/50 mt-1">
                {usage.length} placement{usage.length !== 1 ? 's' : ''} total
              </div>
            </div>

            <div className="p-4 rounded-lg bg-white/[0.05] border border-white/10">
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="w-4 h-4 text-amber-400" />
                <span className="text-sm text-white/60">Resets</span>
              </div>
              <div className="text-lg font-semibold text-white">
                {credits?.resetDate 
                  ? format(new Date(credits.resetDate), 'MMM dd')
                  : credits?.isBeta ? 'N/A' : 'Not Set'}
              </div>
              <div className="text-xs text-white/50 mt-1">
                {credits?.isBeta ? 'During beta period' : 'Next billing cycle'}
              </div>
            </div>
          </div>

          {/* How Credits Work */}
          <div className="p-4 rounded-lg bg-white/[0.03] border border-white/10">
            <h4 className="font-semibold text-white mb-3 text-sm">How Credits Work</h4>
            <div className="space-y-2 text-sm text-white/70">
              <div className="flex items-start gap-2">
                <DollarSign className="w-4 h-4 text-jade-400 flex-shrink-0 mt-0.5" />
                <span>1 credit = Feature on Homepage OR Events page for 1 day</span>
              </div>
              <div className="flex items-start gap-2">
                <Sparkles className="w-4 h-4 text-copper-400 flex-shrink-0 mt-0.5" />
                <span>2 credits = Feature on BOTH pages for 1 day</span>
              </div>
              <div className="flex items-start gap-2">
                <Calendar className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                <span>Credits reset monthly with your subscription billing cycle</span>
              </div>
            </div>
          </div>

          {/* Action Button */}
          <div className="flex items-center justify-between p-4 rounded-lg bg-gradient-to-r from-copper-500/10 to-amber-500/5 border border-copper-500/30">
            <div>
              <div className="font-semibold text-white mb-1">Ready to promote your event?</div>
              <div className="text-sm text-white/60">Use your credits or purchase additional placements</div>
            </div>
            <Link href="/promote">
              <Button 
                className="bg-gradient-to-r from-copper-500 to-amber-600 hover:from-copper-600 hover:to-amber-700"
                data-testid="button-promote-event"
              >
                Promote Event
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Usage History */}
      {usage.length > 0 && (
        <Card className="border-white/10 bg-gradient-to-br from-white/[0.07] to-white/[0.02] backdrop-blur-xl">
          <CardHeader>
            <CardTitle className="text-white">Credit Usage History</CardTitle>
            <CardDescription className="text-white/60">
              Your recent ad placement activity
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingUsage ? (
              <div className="space-y-3">
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
              </div>
            ) : (
              <div className="space-y-3">
                {usage.map((item) => (
                  <div 
                    key={item.id}
                    className="p-4 rounded-lg bg-white/[0.03] border border-white/10 hover:bg-white/[0.05] transition-colors"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge className="bg-copper-500/20 text-copper-400 border-copper-500/30">
                            {item.creditsDeducted} credit{item.creditsDeducted !== 1 ? 's' : ''}
                          </Badge>
                          {item.placementsUsed.map((placement) => (
                            <Badge 
                              key={placement}
                              variant="outline"
                              className="text-white/70 border-white/20"
                            >
                              {placement === 'home' ? 'Homepage' : 'Events Page'}
                            </Badge>
                          ))}
                        </div>
                        <div className="text-sm text-white/60">
                          <span className="text-white/80 font-medium">
                            {format(new Date(item.startDate), 'MMM dd, yyyy')}
                          </span>
                          {item.startDate !== item.endDate && (
                            <span> to {format(new Date(item.endDate), 'MMM dd, yyyy')}</span>
                          )}
                        </div>
                        {item.notes && (
                          <div className="text-xs text-white/50 mt-1">{item.notes}</div>
                        )}
                      </div>
                      <div className="text-xs text-white/40">
                        {format(new Date(item.createdAt), 'MMM dd')}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
