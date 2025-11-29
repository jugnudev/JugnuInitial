import { useEffect } from 'react';
import { useLocation } from 'wouter';
import { Helmet } from 'react-helmet-async';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  CheckCircle, 
  Sparkles, 
  Star, 
  Building2, 
  Ticket, 
  Users, 
  Megaphone,
  ArrowRight,
  CreditCard,
  Loader2
} from 'lucide-react';
import { Link } from 'wouter';
import confetti from 'canvas-confetti';

export default function SubscriptionSuccessPage() {
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();

  const { data: subscriptionData, isLoading } = useQuery<{ 
    ok: boolean; 
    subscription: any;
    communities: any[];
  }>({
    queryKey: ['/api/billing/organizer/subscription'],
    refetchOnMount: true,
    staleTime: 0,
  });

  const subscription = subscriptionData?.subscription;
  const communities = subscriptionData?.communities || [];
  const isTrialing = subscription?.status === 'trialing';

  useEffect(() => {
    queryClient.invalidateQueries({ queryKey: ['/api/billing/organizer/subscription'] });
    
    const duration = 3000;
    const animationEnd = Date.now() + duration;
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 100 };

    const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;

    const interval = setInterval(() => {
      const timeLeft = animationEnd - Date.now();

      if (timeLeft <= 0) {
        clearInterval(interval);
        return;
      }

      const particleCount = 50 * (timeLeft / duration);

      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
        colors: ['#c0580f', '#f5a623', '#16a34a', '#ffffff']
      });
      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
        colors: ['#c0580f', '#f5a623', '#16a34a', '#ffffff']
      });
    }, 250);

    return () => clearInterval(interval);
  }, [queryClient]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-charcoal-950 via-charcoal-900 to-charcoal-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-copper-400" />
          <p className="text-white/60">Loading subscription details...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>Welcome to Jugnu Business! | Subscription Activated</title>
        <meta name="description" content="Your Jugnu subscription is now active. Get started with your communities and events." />
      </Helmet>

      <div className="min-h-screen bg-gradient-to-br from-charcoal-950 via-charcoal-900 to-charcoal-950 py-12 px-4">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-jade-500 to-jade-600 mb-6">
              <CheckCircle className="w-10 h-10 text-white" />
            </div>
            
            <Badge className="mb-4 bg-jade-500/20 text-jade-400 border-jade-500/30">
              <Sparkles className="w-3 h-3 mr-1" />
              {isTrialing ? 'Trial Started' : 'Subscription Active'}
            </Badge>
            
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-3">
              Welcome to Jugnu Business!
            </h1>
            <p className="text-white/60 text-lg max-w-xl mx-auto">
              {isTrialing 
                ? "Your 14-day free trial has started. Explore all the features Jugnu has to offer!"
                : "Your subscription is now active. You have full access to all platform features."
              }
            </p>
          </div>

          <Card className="premium-surface-elevated border-copper-500/30 mb-8" data-testid="card-features">
            <CardHeader className="text-center pb-2">
              <CardTitle className="text-xl text-white">What You Get</CardTitle>
              <CardDescription className="text-white/60">
                Your subscription includes everything you need to grow
              </CardDescription>
            </CardHeader>
            <CardContent className="grid md:grid-cols-2 gap-4 pt-4">
              <div className="flex items-start gap-3 p-4 rounded-lg bg-white/5">
                <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-copper-500/20 flex items-center justify-center">
                  <Building2 className="w-5 h-5 text-copper-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-white">Unlimited Communities</h3>
                  <p className="text-sm text-white/60">Create and manage as many communities as you need</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-4 rounded-lg bg-white/5">
                <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-copper-500/20 flex items-center justify-center">
                  <Ticket className="w-5 h-5 text-copper-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-white">Zero Commission Ticketing</h3>
                  <p className="text-sm text-white/60">Keep 100% of your ticket sales revenue</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-4 rounded-lg bg-white/5">
                <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-copper-500/20 flex items-center justify-center">
                  <Star className="w-5 h-5 text-copper-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-white">2 Placement Credits</h3>
                  <p className="text-sm text-white/60">Feature your events on homepage each month</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-4 rounded-lg bg-white/5">
                <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-copper-500/20 flex items-center justify-center">
                  <Users className="w-5 h-5 text-copper-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-white">Member Management</h3>
                  <p className="text-sm text-white/60">Engage with your community members</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="premium-surface-elevated border-white/10 mb-8" data-testid="card-next-steps">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg text-white flex items-center gap-2">
                <Megaphone className="w-5 h-5 text-copper-400" />
                Get Started
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {communities.length > 0 ? (
                <Link href={`/communities/${communities[0].slug}`}>
                  <Button className="w-full justify-between bg-copper-500 hover:bg-copper-600 text-white" data-testid="button-go-to-community">
                    <span>Go to {communities[0].name}</span>
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </Link>
              ) : (
                <Link href="/community/create">
                  <Button className="w-full justify-between bg-copper-500 hover:bg-copper-600 text-white" data-testid="button-create-community">
                    <span>Create Your First Community</span>
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </Link>
              )}
              
              <Link href="/tickets/organizer/dashboard">
                <Button variant="outline" className="w-full justify-between border-white/20 text-white hover:bg-white/5" data-testid="button-create-event">
                  <span>Create Your First Event</span>
                  <Ticket className="w-4 h-4" />
                </Button>
              </Link>

              <Link href="/account/billing">
                <Button variant="ghost" className="w-full justify-between text-white/70 hover:text-white hover:bg-white/5" data-testid="button-manage-billing">
                  <span>Manage Billing & Subscription</span>
                  <CreditCard className="w-4 h-4" />
                </Button>
              </Link>
            </CardContent>
          </Card>

          {isTrialing && (
            <div className="text-center text-white/50 text-sm">
              Your trial will automatically convert to a paid subscription after 14 days.
              <br />
              You can cancel anytime from your billing page.
            </div>
          )}
        </div>
      </div>
    </>
  );
}
