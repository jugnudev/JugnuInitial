import { motion } from "framer-motion";
import { Check, Zap, TrendingUp, Users, BarChart3, Star, Shield, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Link } from "wouter";

const features = [
  {
    icon: Users,
    title: "Community Platform",
    description: "Build and engage your exclusive member community"
  },
  {
    icon: TrendingUp,
    title: "Event Ticketing",
    description: "Sell tickets with 0% commission - keep 100% of revenue"
  },
  {
    icon: BarChart3,
    title: "Analytics Dashboard",
    description: "Track engagement, sales, and community growth"
  },
  {
    icon: Sparkles,
    title: "2 Ad Placement Credits",
    description: "Monthly credits for homepage or events page placement"
  }
];

const competitorComparison = [
  { feature: "Platform Fee", jugnu: "0%", others: "5-10%" },
  { feature: "Monthly Subscription", jugnu: "$50", others: "$0-$99+" },
  { feature: "Ticket Commission", jugnu: "Keep 100%", others: "Lose 5-10%" },
  { feature: "Ad Placements", jugnu: "2 credits/month", others: "Pay per placement" },
  { feature: "Community Tools", jugnu: "Included", others: "Extra cost" },
  { feature: "Analytics", jugnu: "Full access", others: "Limited/Paid" }
];

const faqItems = [
  {
    question: "How does the $50/month subscription work?",
    answer: "For a flat monthly fee of $50 CAD, you get full access to everything on Jugnu - community platform, event ticketing, analytics, and 2 monthly ad placement credits. No hidden fees, no commissions."
  },
  {
    question: "What are ad placement credits?",
    answer: "Each month, you receive 2 placement credits. One credit lets you feature your event on either the homepage OR events page for one full day. Want both placements for one day? That uses 2 credits. Need more? Purchase additional placements anytime."
  },
  {
    question: "Do you take a commission on ticket sales?",
    answer: "Absolutely not! Unlike platforms that charge 5-10% commission per ticket, you keep 100% of your ticket revenue. We only charge the flat $50/month subscription - that's it."
  },
  {
    question: "Can I cancel anytime?",
    answer: "Yes! There are no long-term contracts. Cancel your subscription anytime and you'll have access until the end of your current billing period."
  },
  {
    question: "How does this compare to Eventbrite or similar platforms?",
    answer: "Most platforms charge 5-10% per ticket sold, which adds up fast. If you sell $10,000 in tickets, that's $500-$1,000 in fees! With Jugnu, you pay $50/month and keep everything else. Plus you get community tools and ad credits included."
  }
];

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-charcoal-950 via-charcoal-900 to-charcoal-950">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-copper-500/10 to-transparent pointer-events-none" />
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center space-y-6"
          >
            <Badge className="bg-copper-500/20 text-copper-400 border-copper-500/30 px-4 py-2">
              <Star className="w-4 h-4 mr-2 inline" />
              Simple, Flat-Rate Pricing
            </Badge>
            
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold text-white">
              Simple, Transparent
              <span className="block bg-gradient-to-r from-copper-400 to-amber-500 bg-clip-text text-transparent">
                Pricing
              </span>
            </h1>
            
            <p className="text-xl text-white/70 max-w-3xl mx-auto leading-relaxed">
              One straightforward subscription. No commissions. No hidden fees.
              <br />
              Keep 100% of your ticket revenue.
            </p>
          </motion.div>
        </div>
      </div>

      {/* Main Pricing Card */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="relative overflow-hidden border-copper-500/30 bg-gradient-to-br from-white/[0.07] to-white/[0.02] backdrop-blur-xl">
            {/* Glow effect */}
            <div className="absolute inset-0 bg-gradient-to-br from-copper-500/20 via-transparent to-transparent pointer-events-none" />
            
            <CardHeader className="text-center space-y-6 pb-8">
              <div className="space-y-2">
                <CardTitle className="text-3xl font-bold text-white">
                  Business Subscription
                </CardTitle>
                <CardDescription className="text-white/60 text-lg">
                  Everything you need to grow your events business
                </CardDescription>
              </div>

              <div className="space-y-4">
                <div className="flex items-baseline justify-center gap-2">
                  <span className="text-6xl font-bold text-white">$50</span>
                  <span className="text-2xl text-white/60">/month</span>
                </div>
                
                <div className="inline-flex items-center gap-2 bg-jade-500/20 text-jade-400 px-4 py-2 rounded-full text-sm font-medium">
                  <Shield className="w-4 h-4" />
                  Currently FREE in Beta
                </div>
              </div>

              <Link href="/business/signup">
                <Button 
                  size="lg" 
                  className="bg-gradient-to-r from-copper-500 to-amber-600 hover:from-copper-600 hover:to-amber-700 text-white font-semibold px-8 py-6 text-lg"
                  data-testid="button-get-started"
                >
                  <Zap className="w-5 h-5 mr-2" />
                  Get Started Free
                </Button>
              </Link>
            </CardHeader>

            <Separator className="bg-white/10" />

            <CardContent className="pt-8">
              <div className="grid md:grid-cols-2 gap-6">
                {features.map((feature, index) => (
                  <motion.div
                    key={feature.title}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 * index }}
                    className="flex gap-4 p-4 rounded-lg bg-white/[0.03] hover:bg-white/[0.06] transition-colors"
                  >
                    <div className="flex-shrink-0">
                      <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-copper-500/20 to-amber-500/20 flex items-center justify-center">
                        <feature.icon className="w-6 h-6 text-copper-400" />
                      </div>
                    </div>
                    <div>
                      <h3 className="font-semibold text-white mb-1">{feature.title}</h3>
                      <p className="text-sm text-white/60">{feature.description}</p>
                    </div>
                  </motion.div>
                ))}
              </div>

              <div className="mt-8 p-6 rounded-lg bg-white/[0.03] border border-white/10">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <Check className="w-5 h-5 text-jade-400" />
                  What's Included
                </h3>
                <div className="grid sm:grid-cols-2 gap-3">
                  {[
                    "No limits on members",
                    "No limits on events or tickets",
                    "Real-time analytics",
                    "Email notifications",
                    "Mobile-optimized design",
                    "QR code check-in",
                    "Bulk messaging",
                    "24/7 support"
                  ].map((item) => (
                    <div key={item} className="flex items-center gap-2 text-white/80">
                      <Check className="w-4 h-4 text-jade-400 flex-shrink-0" />
                      <span className="text-sm">{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Comparison Table */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mt-20"
        >
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold text-white mb-3">
              Why Choose Jugnu?
            </h2>
            <p className="text-white/60 text-lg">
              Compare us to other event platforms
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left py-4 px-6 text-white/60 font-medium">Feature</th>
                  <th className="text-center py-4 px-6">
                    <div className="inline-flex items-center gap-2 text-copper-400 font-bold text-lg">
                      <Sparkles className="w-5 h-5" />
                      Jugnu
                    </div>
                  </th>
                  <th className="text-center py-4 px-6 text-white/60 font-medium">Other Platforms</th>
                </tr>
              </thead>
              <tbody>
                {competitorComparison.map((row, index) => (
                  <tr 
                    key={row.feature}
                    className={`border-b border-white/5 ${index % 2 === 0 ? 'bg-white/[0.02]' : ''}`}
                  >
                    <td className="py-4 px-6 text-white/80">{row.feature}</td>
                    <td className="py-4 px-6 text-center">
                      <span className="inline-flex items-center gap-2 bg-jade-500/20 text-jade-400 px-3 py-1 rounded-full text-sm font-medium">
                        <Check className="w-4 h-4" />
                        {row.jugnu}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-center text-white/50">{row.others}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>

        {/* FAQ Section */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="mt-20"
        >
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold text-white mb-3">
              Frequently Asked Questions
            </h2>
            <p className="text-white/60 text-lg">
              Everything you need to know about our pricing
            </p>
          </div>

          <Accordion type="single" collapsible className="space-y-4">
            {faqItems.map((item, index) => (
              <AccordionItem 
                key={index} 
                value={`item-${index}`}
                className="border border-white/10 rounded-lg bg-white/[0.03] px-6 data-[state=open]:bg-white/[0.06]"
              >
                <AccordionTrigger className="text-white hover:text-copper-400 py-5 text-left">
                  {item.question}
                </AccordionTrigger>
                <AccordionContent className="text-white/70 pb-5">
                  {item.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </motion.div>

        {/* CTA Section */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="mt-20 text-center"
        >
          <Card className="border-copper-500/30 bg-gradient-to-br from-copper-500/10 to-amber-500/5 backdrop-blur-xl">
            <CardContent className="py-12 px-6">
              <h2 className="text-3xl font-bold text-white mb-4">
                Ready to Grow Your Events Business?
              </h2>
              <p className="text-white/70 text-lg mb-8 max-w-2xl mx-auto">
                Join Canada's premier South Asian events platform. Start building your community today - completely free during our beta period.
              </p>
              <Link href="/business/signup">
                <Button 
                  size="lg" 
                  className="bg-gradient-to-r from-copper-500 to-amber-600 hover:from-copper-600 hover:to-amber-700 text-white font-semibold px-8 py-6 text-lg"
                  data-testid="button-cta-signup"
                >
                  Create Your Business Account
                </Button>
              </Link>
              <p className="text-white/50 text-sm mt-4">
                No credit card required · Free during beta · Cancel anytime
              </p>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
