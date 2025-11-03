import { Helmet } from 'react-helmet-async';
import { Link } from 'wouter';
import { 
  Sparkles, 
  Gift, 
  Users, 
  TrendingUp, 
  DollarSign, 
  QrCode,
  Calendar,
  Heart,
  Shield,
  CheckCircle2,
  ArrowRight,
  Star
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useQuery } from '@tanstack/react-query';
import weddingImage from '@assets/stock_images/indian_wedding_celeb_02922724.jpg';
import restaurantImage from '@assets/stock_images/south_asian_restaura_c2012f34.jpg';
import festivalImage from '@assets/stock_images/diwali_festival_cele_c36482fa.jpg';
import businessImage from '@assets/stock_images/south_asian_business_9d78d8db.jpg';

export default function LoyaltyLanding() {
  // Check if user is authenticated
  const { data: user } = useQuery<{ id: string; email: string } | null>({
    queryKey: ['/api/user'],
  });

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
      {
        "@type": "Question",
        "name": "Will I lose out if customers redeem points elsewhere?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Not at all! With our optional Home Boost feature, points are worth more when redeemed at your business (e.g., 1,000 JP = $1.25 at home vs $1.00 elsewhere). Plus, you can set redemption caps to manage costs while still attracting new customers who earned points at other partners."
        }
      },
      {
        "@type": "Question",
        "name": "Do guests get confused by points?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Our system is intentionally simple: 1,000 Jugnu Points = $1.00 CAD everywhere in Canada. No complex tiers, no expiring points, no confusion. Just clear value that works nationwide."
        }
      },
      {
        "@type": "Question",
        "name": "Is it app-only or do I need special hardware?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Jugnu Loyalty works on any web browser—no app required, no POS swap needed. Customers can show QR codes from their phone, and you can process transactions from your existing devices."
        }
      },
      {
        "@type": "Question",
        "name": "What about taxes?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "All transactions are in CAD. GST/HST/QST apply to merchants on point redemptions as they would for any discount or loyalty program. We recommend consulting with your accountant for specific tax treatment."
        }
      }
    ]
  };

  return (
    <>
      <Helmet>
        <title>Jugnu Loyalty — Canada's South Asian Rewards Wallet (1,000 Points = $1)</title>
        <meta 
          name="description" 
          content="Earn at desi restaurants, events, and markets; spend anywhere. One simple rule: 1,000 points = $1. Canada-wide soon." 
        />
        <meta name="keywords" content="South Asian rewards, desi loyalty program, Indian restaurant rewards, Canada coalition points, ethnic business loyalty" />
        
        {/* Open Graph */}
        <meta property="og:title" content="Jugnu Loyalty — Canada's South Asian Rewards Wallet" />
        <meta property="og:description" content="Earn at desi restaurants, events, and markets; spend anywhere. 1,000 points = $1 CAD." />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://jugnucanada.com/loyalty" />
        
        {/* Twitter Card */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Jugnu Loyalty — Canada's South Asian Rewards Wallet" />
        <meta name="twitter:description" content="Earn at desi restaurants, events, and markets; spend anywhere. 1,000 points = $1 CAD." />
        
        {/* FAQ Schema */}
        <script type="application/ld+json">
          {JSON.stringify(faqSchema)}
        </script>
      </Helmet>

      <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/20">
        {/* Coming Soon Badge */}
        <div className="bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-amber-500/10 border-y border-amber-500/20 py-2">
          <div className="container mx-auto px-4 text-center">
            <p className="text-sm font-medium text-amber-600 dark:text-amber-400 flex items-center justify-center gap-2">
              <Sparkles className="w-4 h-4" />
              Coming Soon — Be among the first to join Canada's South Asian rewards network
              <Sparkles className="w-4 h-4" />
            </p>
          </div>
        </div>

        {/* Hero Section */}
        <section className="relative overflow-hidden py-16 sm:py-24 lg:py-32">
          <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 via-orange-500/5 to-rose-500/5" />
          <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-amber-500/10 to-transparent rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-gradient-to-tr from-orange-500/10 to-transparent rounded-full blur-3xl" />
          
          <div className="container mx-auto px-4 relative z-10">
            <div className="max-w-4xl mx-auto text-center">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20 mb-8">
                <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                <span className="text-sm font-medium text-amber-600 dark:text-amber-400">Canada's South Asian Rewards Wallet</span>
              </div>
              
              <h1 className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-bold mb-6 bg-gradient-to-r from-amber-600 via-orange-600 to-amber-600 bg-clip-text text-transparent leading-tight">
                1,000 JP = $1
              </h1>
              
              <p className="text-xl sm:text-2xl lg:text-3xl text-muted-foreground mb-4 max-w-3xl mx-auto leading-relaxed">
                Earn at restaurants, events, salons, markets.
              </p>
              <p className="text-xl sm:text-2xl lg:text-3xl font-semibold text-foreground mb-12 max-w-3xl mx-auto">
                Spend anywhere on Jugnu.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                {user ? (
                  <Button 
                    asChild
                    size="lg"
                    className="bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 text-base sm:text-lg px-8 py-6"
                    data-testid="button-join-waitlist-hero"
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
                    className="bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 text-base sm:text-lg px-8 py-6"
                    data-testid="button-join-waitlist-hero"
                  >
                    <Link href="/#newsletter">
                      Join the Waitlist
                      <ArrowRight className="ml-2 w-5 h-5" />
                    </Link>
                  </Button>
                )}
                
                <Button 
                  asChild
                  size="lg"
                  variant="outline"
                  className="border-2 border-amber-600/20 hover:bg-amber-500/10 text-base sm:text-lg px-8 py-6"
                  data-testid="button-become-partner-hero"
                >
                  <Link href="/organizer/signup">
                    Become a Partner
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section className="py-16 sm:py-24 bg-muted/30">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4">
                How It Works
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                The simplest loyalty program in Canada — one rule, nationwide value.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
              {/* Card 1: Earn Anywhere */}
              <div className="bg-card border border-border rounded-2xl p-8 hover:shadow-lg transition-shadow" data-testid="card-earn-anywhere">
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center mb-6">
                  <Gift className="w-7 h-7 text-white" />
                </div>
                <h3 className="text-2xl font-bold mb-3">Earn Anywhere</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Shop at any participating business across Canada. Businesses can scan your wallet QR code or enter your phone/email to award points instantly.
                </p>
              </div>

              {/* Card 2: Fixed Value */}
              <div className="bg-card border border-amber-500/30 rounded-2xl p-8 hover:shadow-lg transition-shadow shadow-amber-500/10" data-testid="card-fixed-value">
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center mb-6">
                  <DollarSign className="w-7 h-7 text-white" />
                </div>
                <h3 className="text-2xl font-bold mb-3">Fixed Value</h3>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  <span className="font-bold text-amber-600 dark:text-amber-400 text-xl">1,000 JP = $1.00 CAD</span>
                </p>
                <p className="text-muted-foreground leading-relaxed">
                  No complex math, no expiring points, no confusion. Clear, honest value everywhere.
                </p>
              </div>

              {/* Card 3: Spend Anywhere */}
              <div className="bg-card border border-border rounded-2xl p-8 hover:shadow-lg transition-shadow" data-testid="card-spend-anywhere">
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-violet-500 to-purple-500 flex items-center justify-center mb-6">
                  <Users className="w-7 h-7 text-white" />
                </div>
                <h3 className="text-2xl font-bold mb-3">Spend Anywhere</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Redeem your points at any Jugnu partner nationwide. Earned at a restaurant? Use them at a salon, market, or event.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* For Users Benefits */}
        <section className="py-16 sm:py-24">
          <div className="container mx-auto px-4">
            <div className="grid lg:grid-cols-2 gap-12 items-center max-w-7xl mx-auto">
              <div>
                <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-6">
                  For Users
                </h2>
                <p className="text-lg text-muted-foreground mb-8">
                  One wallet, endless possibilities across Canada's vibrant South Asian community.
                </p>

                <div className="space-y-6">
                  <div className="flex gap-4" data-testid="benefit-simple-value">
                    <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-gradient-to-br from-blue-500/10 to-blue-600/10 flex items-center justify-center border border-blue-500/20">
                      <CheckCircle2 className="w-6 h-6 text-blue-500" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-lg mb-1">Simple Value</h4>
                      <p className="text-muted-foreground">
                        1,000 points = $1 everywhere. No tier confusion, no expiry stress.
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-4" data-testid="benefit-festival-promos">
                    <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-gradient-to-br from-amber-500/10 to-amber-600/10 flex items-center justify-center border border-amber-500/20">
                      <Calendar className="w-6 h-6 text-amber-500" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-lg mb-1">Festival Promos</h4>
                      <p className="text-muted-foreground">
                        Bonus points during Diwali, Eid, Vaisakhi, Navratri, and more cultural celebrations.
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-4" data-testid="benefit-national-coverage">
                    <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-gradient-to-br from-emerald-500/10 to-emerald-600/10 flex items-center justify-center border border-emerald-500/20">
                      <TrendingUp className="w-6 h-6 text-emerald-500" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-lg mb-1">National Coverage</h4>
                      <p className="text-muted-foreground">
                        Earn in Toronto, spend in Vancouver. Your points work coast to coast.
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-4" data-testid="benefit-wallet-qr">
                    <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-gradient-to-br from-violet-500/10 to-violet-600/10 flex items-center justify-center border border-violet-500/20">
                      <QrCode className="w-6 h-6 text-violet-500" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-lg mb-1">Easy Wallet QR</h4>
                      <p className="text-muted-foreground">
                        Show your QR code, earn or spend instantly. No app download required.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-br from-amber-500/20 to-orange-500/20 rounded-3xl blur-2xl" />
                <img 
                  src={festivalImage} 
                  alt="Cultural celebration with festival lights"
                  className="relative rounded-2xl shadow-2xl w-full h-auto object-cover"
                />
              </div>
            </div>
          </div>
        </section>

        {/* For Businesses Benefits */}
        <section className="py-16 sm:py-24 bg-muted/30">
          <div className="container mx-auto px-4">
            <div className="grid lg:grid-cols-2 gap-12 items-center max-w-7xl mx-auto">
              <div className="order-2 lg:order-1 relative">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/20 to-violet-500/20 rounded-3xl blur-2xl" />
                <img 
                  src={businessImage} 
                  alt="South Asian business owner"
                  className="relative rounded-2xl shadow-2xl w-full h-auto object-cover"
                />
              </div>

              <div className="order-1 lg:order-2">
                <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-6">
                  For Businesses
                </h2>
                <p className="text-lg text-muted-foreground mb-8">
                  Attract new customers and reward loyalty — without breaking the bank.
                </p>

                <div className="space-y-6">
                  <div className="flex gap-4" data-testid="benefit-new-customers">
                    <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-gradient-to-br from-rose-500/10 to-rose-600/10 flex items-center justify-center border border-rose-500/20">
                      <Users className="w-6 h-6 text-rose-500" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-lg mb-1">New Customers</h4>
                      <p className="text-muted-foreground">
                        Customers who earned points elsewhere will discover your business to redeem them.
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-4" data-testid="benefit-control-cashback">
                    <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-gradient-to-br from-amber-500/10 to-amber-600/10 flex items-center justify-center border border-amber-500/20">
                      <TrendingUp className="w-6 h-6 text-amber-500" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-lg mb-1">You Control Cashback</h4>
                      <p className="text-muted-foreground">
                        Set your own issue rate (20–50 JP per $1 ≈ 2–5% back). Adjust anytime.
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-4" data-testid="benefit-subscription-includes-jp">
                    <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-gradient-to-br from-emerald-500/10 to-emerald-600/10 flex items-center justify-center border border-emerald-500/20">
                      <Gift className="w-6 h-6 text-emerald-500" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-lg mb-1">Subscription Includes JP</h4>
                      <p className="text-muted-foreground">
                        $50/month includes 20,000 Jugnu Points. Issue immediately or save for promotions.
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-4" data-testid="benefit-volume-discounts">
                    <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-gradient-to-br from-blue-500/10 to-blue-600/10 flex items-center justify-center border border-blue-500/20">
                      <DollarSign className="w-6 h-6 text-blue-500" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-lg mb-1">Volume Discounts</h4>
                      <p className="text-muted-foreground">
                        Buy more points at lower rates. The more you issue, the less you pay per point.
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-4" data-testid="benefit-no-pos-swap">
                    <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-gradient-to-br from-violet-500/10 to-violet-600/10 flex items-center justify-center border border-violet-500/20">
                      <Shield className="w-6 h-6 text-violet-500" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-lg mb-1">No POS Swap</h4>
                      <p className="text-muted-foreground">
                        Works on any browser. No new hardware, no complicated integrations.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* South Asian-First Section */}
        <section className="py-16 sm:py-24">
          <div className="container mx-auto px-4">
            <div className="max-w-7xl mx-auto">
              <div className="text-center mb-12">
                <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4">
                  Built for Our Community
                </h2>
                <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
                  From wedding week celebrations to cultural events, Jugnu Loyalty understands the unique needs of South Asian businesses and customers across Canada.
                </p>
              </div>

              <div className="grid md:grid-cols-2 gap-8">
                <div className="bg-card border border-border rounded-2xl overflow-hidden hover:shadow-lg transition-shadow" data-testid="card-wedding-week">
                  <img 
                    src={weddingImage} 
                    alt="South Asian wedding celebration"
                    className="w-full h-64 object-cover"
                  />
                  <div className="p-6">
                    <h3 className="text-2xl font-bold mb-3 flex items-center gap-2">
                      <Heart className="w-6 h-6 text-rose-500" />
                      Wedding Week
                    </h3>
                    <p className="text-muted-foreground leading-relaxed">
                      Earn points at your mehendi venue, spend them on catering, decor, or gifts. Your celebration, your rewards, all in one wallet.
                    </p>
                  </div>
                </div>

                <div className="bg-card border border-border rounded-2xl overflow-hidden hover:shadow-lg transition-shadow" data-testid="card-community-events">
                  <img 
                    src={restaurantImage} 
                    alt="Fine dining experience"
                    className="w-full h-64 object-cover"
                  />
                  <div className="p-6">
                    <h3 className="text-2xl font-bold mb-3 flex items-center gap-2">
                      <Calendar className="w-6 h-6 text-amber-500" />
                      Community Events
                    </h3>
                    <p className="text-muted-foreground leading-relaxed">
                      From Diwali dinners to Eid shopping, Vaisakhi markets to Navratri celebrations — your points work wherever the community gathers.
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-8 bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-amber-500/10 border border-amber-500/20 rounded-2xl p-8 text-center">
                <p className="text-lg text-muted-foreground mb-2">
                  <span className="font-semibold text-foreground">Coming soon:</span> Discover veg, Jain, and halal-certified partners with ease.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Pricing Snapshot */}
        <section className="py-16 sm:py-24 bg-muted/30">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto text-center">
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-6">
                Simple, Transparent Pricing
              </h2>
              <p className="text-lg text-muted-foreground mb-12">
                One subscription. Points included. Volume discounts available.
              </p>

              <div className="bg-card border-2 border-amber-500/30 rounded-3xl p-8 sm:p-12 shadow-xl shadow-amber-500/10 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-amber-500/20 to-transparent rounded-full blur-3xl" />
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-gradient-to-tr from-orange-500/20 to-transparent rounded-full blur-3xl" />
                
                <div className="relative z-10">
                  <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-500/10 border border-amber-500/20 mb-6">
                    <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                    <span className="text-sm font-medium text-amber-600 dark:text-amber-400">Business Plan</span>
                  </div>
                  
                  <div className="mb-6">
                    <div className="text-5xl sm:text-6xl font-bold mb-2">
                      <span className="bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent">$50</span>
                      <span className="text-2xl text-muted-foreground">/month</span>
                    </div>
                    <p className="text-lg font-semibold text-foreground mb-1">Full Platform Access</p>
                    <p className="text-base text-muted-foreground">Includes 20,000 Jugnu Points + Communities</p>
                  </div>

                  <div className="max-w-md mx-auto space-y-3 mb-8">
                    <div className="flex items-center gap-3 justify-center" data-testid="pricing-feature-1">
                      <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                      <span className="text-foreground">Issue & redeem transactions</span>
                    </div>
                    <div className="flex items-center gap-3 justify-center" data-testid="pricing-feature-2">
                      <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                      <span className="text-foreground">Set your own cashback rate</span>
                    </div>
                    <div className="flex items-center gap-3 justify-center" data-testid="pricing-feature-3">
                      <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                      <span className="text-foreground">Business dashboard & analytics</span>
                    </div>
                    <div className="flex items-center gap-3 justify-center" data-testid="pricing-feature-4">
                      <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                      <span className="text-foreground">Volume discounts on JP top-ups</span>
                    </div>
                  </div>

                  <p className="text-sm text-muted-foreground italic">
                    Need more points? Larger bundles available at lower rates.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="py-16 sm:py-24" id="faq">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto">
              <div className="text-center mb-12">
                <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4">
                  Frequently Asked Questions
                </h2>
                <p className="text-lg text-muted-foreground">
                  Everything you need to know about Jugnu Coalition Points.
                </p>
              </div>

              <div className="space-y-6">
                <div className="bg-card border border-border rounded-xl p-6 hover:shadow-lg transition-shadow" data-testid="faq-lose-out">
                  <h3 className="text-xl font-bold mb-3 flex items-start gap-3">
                    <span className="flex-shrink-0 w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-600 dark:text-amber-400 font-bold">Q</span>
                    Will I lose out if customers redeem points elsewhere?
                  </h3>
                  <div className="ml-11 text-muted-foreground leading-relaxed">
                    <p className="mb-3">
                      <strong className="text-foreground">Not at all!</strong> With our optional <strong>Home Boost</strong> feature, points are worth more when redeemed at your business (e.g., 1,000 JP = $1.25 at home vs $1.00 elsewhere).
                    </p>
                    <p>
                      Plus, you can set redemption caps to manage costs while still attracting new customers who earned points at other partners.
                    </p>
                  </div>
                </div>

                <div className="bg-card border border-border rounded-xl p-6 hover:shadow-lg transition-shadow" data-testid="faq-confusion">
                  <h3 className="text-xl font-bold mb-3 flex items-start gap-3">
                    <span className="flex-shrink-0 w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-600 dark:text-amber-400 font-bold">Q</span>
                    Do guests get confused by points?
                  </h3>
                  <div className="ml-11 text-muted-foreground leading-relaxed">
                    <p>
                      Our system is intentionally simple: <strong className="text-foreground">1,000 Jugnu Points = $1.00 CAD</strong> everywhere in Canada. No complex tiers, no expiring points, no confusion. Just clear value that works nationwide.
                    </p>
                  </div>
                </div>

                <div className="bg-card border border-border rounded-xl p-6 hover:shadow-lg transition-shadow" data-testid="faq-app-hardware">
                  <h3 className="text-xl font-bold mb-3 flex items-start gap-3">
                    <span className="flex-shrink-0 w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-600 dark:text-amber-400 font-bold">Q</span>
                    Is it app-only or do I need special hardware?
                  </h3>
                  <div className="ml-11 text-muted-foreground leading-relaxed">
                    <p>
                      Jugnu Loyalty works on <strong className="text-foreground">any web browser</strong>—no app required, no POS swap needed. Customers can show QR codes from their phone, and you can process transactions from your existing devices.
                    </p>
                  </div>
                </div>

                <div className="bg-card border border-border rounded-xl p-6 hover:shadow-lg transition-shadow" data-testid="faq-taxes">
                  <h3 className="text-xl font-bold mb-3 flex items-start gap-3">
                    <span className="flex-shrink-0 w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-600 dark:text-amber-400 font-bold">Q</span>
                    What about taxes?
                  </h3>
                  <div className="ml-11 text-muted-foreground leading-relaxed">
                    <p>
                      All transactions are in CAD. GST/HST/QST apply to merchants on point redemptions as they would for any discount or loyalty program. We recommend consulting with your accountant for specific tax treatment.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="py-16 sm:py-24 bg-gradient-to-br from-amber-500/10 via-orange-500/10 to-rose-500/10 border-y border-amber-500/20">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto text-center">
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-6">
                Launching Soon in Canada
              </h2>
              <p className="text-xl text-muted-foreground mb-10">
                Be among the first to join Canada's South Asian rewards network.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                {user ? (
                  <Button 
                    asChild
                    size="lg"
                    className="bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 text-base sm:text-lg px-10 py-6"
                    data-testid="button-join-waitlist-final"
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
                    className="bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 text-base sm:text-lg px-10 py-6"
                    data-testid="button-join-waitlist-final"
                  >
                    <Link href="/#newsletter">
                      Join the Waitlist
                      <ArrowRight className="ml-2 w-5 h-5" />
                    </Link>
                  </Button>
                )}
                
                <Button 
                  asChild
                  size="lg"
                  variant="outline"
                  className="border-2 border-amber-600/30 hover:bg-amber-500/10 text-base sm:text-lg px-10 py-6"
                  data-testid="button-become-partner-final"
                >
                  <Link href="/organizer/signup">
                    Become a Partner
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
