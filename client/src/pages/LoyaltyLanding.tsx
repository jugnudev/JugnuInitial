import { Helmet } from 'react-helmet-async';
import { Link } from 'wouter';
import { 
  Sparkles, 
  ArrowRight,
  Coins,
  Store,
  Wallet
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useQuery } from '@tanstack/react-query';

export default function LoyaltyLanding() {
  const { data: authData } = useQuery<{ user?: { id: string; email: string } }>({
    queryKey: ['/api/auth/me'],
  });
  const user = authData?.user;

  return (
    <>
      <Helmet>
        <title>Jugnu Loyalty — Coming Soon | 1,000 Points = $1</title>
        <meta 
          name="description" 
          content="Earn at desi restaurants, events, and markets; spend anywhere. One simple rule: 1,000 points = $1. Coming soon to Canada." 
        />
        <meta property="og:title" content="Jugnu Loyalty — Coming Soon" />
        <meta property="og:description" content="Earn at desi restaurants, events, and markets; spend anywhere. 1,000 points = $1 CAD." />
        <meta property="og:type" content="website" />
      </Helmet>

      <div className="min-h-[calc(100vh-80px)] flex flex-col items-center justify-center relative overflow-hidden px-4 py-16">
        {/* Background Elements */}
        <div className="absolute inset-0 bg-gradient-to-b from-background via-background to-amber-950/5" />
        <div className="absolute top-1/4 -left-32 w-96 h-96 bg-amber-500/10 rounded-full blur-[100px]" />
        <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-orange-500/10 rounded-full blur-[100px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-br from-amber-500/5 to-orange-500/5 rounded-full blur-[80px]" />
        
        {/* Content */}
        <div className="relative z-10 max-w-2xl mx-auto text-center space-y-8">
          {/* Coming Soon Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-500/10 border border-amber-500/20">
            <Sparkles className="w-4 h-4 text-amber-500" />
            <span className="text-sm font-medium text-amber-600 dark:text-amber-400">Coming Soon</span>
          </div>

          {/* Main Headline */}
          <div className="space-y-4">
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight">
              <span className="bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 bg-clip-text text-transparent">
                Jugnu Loyalty
              </span>
            </h1>
            <p className="text-xl sm:text-2xl text-muted-foreground font-light">
              Canada's South Asian Rewards Wallet
            </p>
          </div>

          {/* Core Value Prop */}
          <div className="py-6 border-y border-border/50">
            <p className="text-4xl sm:text-5xl font-bold text-foreground mb-2">
              1,000 JP = $1
            </p>
            <p className="text-muted-foreground">
              One simple rule. Nationwide.
            </p>
          </div>

          {/* Three Pillars */}
          <div className="grid grid-cols-3 gap-4 sm:gap-8 py-4">
            <div className="flex flex-col items-center gap-3" data-testid="pillar-earn">
              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-emerald-600/10 border border-emerald-500/20 flex items-center justify-center">
                <Coins className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-500" />
              </div>
              <div className="text-center">
                <p className="font-semibold text-sm sm:text-base">Earn</p>
                <p className="text-xs sm:text-sm text-muted-foreground">at any partner</p>
              </div>
            </div>

            <div className="flex flex-col items-center gap-3" data-testid="pillar-collect">
              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-br from-amber-500/20 to-amber-600/10 border border-amber-500/20 flex items-center justify-center">
                <Wallet className="w-5 h-5 sm:w-6 sm:h-6 text-amber-500" />
              </div>
              <div className="text-center">
                <p className="font-semibold text-sm sm:text-base">Collect</p>
                <p className="text-xs sm:text-sm text-muted-foreground">in one wallet</p>
              </div>
            </div>

            <div className="flex flex-col items-center gap-3" data-testid="pillar-spend">
              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-br from-violet-500/20 to-violet-600/10 border border-violet-500/20 flex items-center justify-center">
                <Store className="w-5 h-5 sm:w-6 sm:h-6 text-violet-500" />
              </div>
              <div className="text-center">
                <p className="font-semibold text-sm sm:text-base">Spend</p>
                <p className="text-xs sm:text-sm text-muted-foreground">anywhere on Jugnu</p>
              </div>
            </div>
          </div>

          {/* Description */}
          <p className="text-muted-foreground text-base sm:text-lg leading-relaxed max-w-lg mx-auto">
            Restaurants, events, salons, markets — earn points at one, spend them at any. 
            No expiry. No confusion. Just real value.
          </p>

          {/* CTA */}
          <div className="pt-4">
            {user ? (
              <Button 
                asChild
                size="lg"
                className="bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white shadow-lg shadow-amber-500/20 hover:shadow-xl hover:shadow-amber-500/30 transition-all duration-300 text-base px-8 py-6 rounded-xl"
                data-testid="button-manage-account"
              >
                <Link href="/account/profile">
                  Manage Account
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Link>
              </Button>
            ) : (
              <Button 
                asChild
                size="lg"
                className="bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white shadow-lg shadow-amber-500/20 hover:shadow-xl hover:shadow-amber-500/30 transition-all duration-300 text-base px-8 py-6 rounded-xl"
                data-testid="button-join-waitlist"
              >
                <Link href="/#newsletter">
                  Join the Waitlist
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Link>
              </Button>
            )}
          </div>

          {/* Partner Link */}
          <p className="text-sm text-muted-foreground">
            Business owner?{' '}
            <Link href="/organizer/signup" className="text-amber-600 dark:text-amber-400 hover:underline font-medium" data-testid="link-become-partner">
              Become a partner
            </Link>
          </p>
        </div>

        {/* Decorative bottom gradient */}
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent pointer-events-none" />
      </div>
    </>
  );
}
