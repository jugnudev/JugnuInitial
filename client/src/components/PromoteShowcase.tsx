import { motion } from "framer-motion";
import { ArrowRight, Eye, Users, TrendingUp, Calendar, Shield, Zap } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

const benefits = [
  {
    icon: Eye,
    title: "Maximum Visibility",
    description: "Premium placement on events page and homepage with exclusive daily slots"
  },
  {
    icon: Users,
    title: "Targeted Audience",
    description: "Reach Vancouver's engaged South Asian cultural community"
  },
  {
    icon: TrendingUp,
    title: "Real-time Analytics",
    description: "Track impressions, clicks, and engagement with live dashboard"
  },
  {
    icon: Calendar,
    title: "Flexible Campaigns",
    description: "Daily or weekly packages starting from just $60/week"
  },
  {
    icon: Shield,
    title: "Brand Safety",
    description: "Exclusive placements ensure your brand stands out without competition"
  },
  {
    icon: Zap,
    title: "Quick Setup",
    description: "Launch your campaign in 24 hours with our streamlined process"
  }
];

const packages = [
  {
    name: "Events Spotlight",
    price: "$60",
    duration: "per week",
    placement: "Events page banner",
    impressions: "2,000+ weekly",
    color: "copper"
  },
  {
    name: "Homepage Hero",
    price: "$140",
    duration: "per week",
    placement: "Homepage premium spot",
    impressions: "5,000+ weekly",
    color: "gradient"
  },
  {
    name: "Full Feature",
    price: "$175",
    duration: "per week",
    placement: "Both placements",
    impressions: "7,000+ weekly",
    color: "copper"
  }
];

export default function PromoteShowcase() {
  return (
    <section className="py-20 lg:py-24 relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-white/3 to-transparent pointer-events-none" />
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-copper-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-copper-500/10 rounded-full blur-3xl pointer-events-none" />
      
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="font-fraunces text-3xl lg:text-5xl font-bold tracking-tight text-white mb-4">
            Promote Your Business
          </h2>
          <p className="text-lg text-muted max-w-3xl mx-auto">
            Connect with Vancouver's most engaged cultural community. 
            Our premium sponsorship packages deliver real results with exclusive placements and detailed analytics.
          </p>
        </motion.div>

        {/* Package Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
          {packages.map((pkg, index) => (
            <motion.div
              key={pkg.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
            >
              <Card className={`
                bg-white/5 border-white/10 p-6 hover:bg-white/10 
                hover:border-copper-500/30 transition-all duration-300
                ${index === 1 ? 'md:scale-105 border-copper-500/20' : ''}
              `}>
                {index === 1 && (
                  <div className="bg-gradient-to-r from-copper-500 to-copper-600 text-black text-xs font-bold px-3 py-1 rounded-full inline-block mb-4">
                    MOST POPULAR
                  </div>
                )}
                <h3 className="text-xl font-bold text-white mb-2">{pkg.name}</h3>
                <div className="mb-4">
                  <span className="text-3xl font-bold text-copper-400">{pkg.price}</span>
                  <span className="text-muted ml-2">{pkg.duration}</span>
                </div>
                <div className="space-y-3 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-copper-500 rounded-full" />
                    <span className="text-muted">{pkg.placement}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-copper-500 rounded-full" />
                    <span className="text-muted">{pkg.impressions}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-copper-500 rounded-full" />
                    <span className="text-muted">Exclusive daily slots</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-copper-500 rounded-full" />
                    <span className="text-muted">Real-time analytics</span>
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Benefits Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          {benefits.map((benefit, index) => {
            const Icon = benefit.icon;
            return (
              <motion.div
                key={benefit.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.05 }}
                className="flex gap-4"
              >
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 bg-copper-500/10 rounded-lg flex items-center justify-center">
                    <Icon className="w-6 h-6 text-copper-400" />
                  </div>
                </div>
                <div>
                  <h3 className="font-semibold text-white mb-1">{benefit.title}</h3>
                  <p className="text-sm text-muted">{benefit.description}</p>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Visual Mockup */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="bg-white/5 border border-white/10 rounded-2xl p-8 mb-12"
        >
          <h3 className="text-xl font-bold text-white mb-4 text-center">Where Your Ads Appear</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <div className="bg-copper-500/10 border border-copper-500/30 rounded-lg p-4">
                <div className="text-sm font-semibold text-copper-400 mb-2">Events Page Banner</div>
                <div className="bg-white/5 rounded h-20 flex items-center justify-center text-muted text-xs">
                  Your banner at the top of events listings
                </div>
              </div>
              <p className="text-sm text-muted">
                Premium placement above all event listings, visible to everyone browsing upcoming events
              </p>
            </div>
            <div className="space-y-3">
              <div className="bg-copper-500/10 border border-copper-500/30 rounded-lg p-4">
                <div className="text-sm font-semibold text-copper-400 mb-2">Homepage Feature</div>
                <div className="bg-white/5 rounded h-20 flex items-center justify-center text-muted text-xs">
                  Your feature on the homepage
                </div>
              </div>
              <p className="text-sm text-muted">
                Eye-catching placement on our homepage, the first thing visitors see
              </p>
            </div>
          </div>
        </motion.div>

        {/* CTA Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="text-center"
        >
          <p className="text-lg text-muted mb-6">
            Join leading brands already connecting with our community
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/promote">
              <Button
                size="lg"
                className="bg-copper-500 hover:bg-copper-600 text-black font-semibold px-8 py-4 text-lg shadow-lg hover:shadow-xl transition-all duration-200"
                data-testid="get-started-promote"
              >
                Get Started Today
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <Link href="/promote#faq">
              <Button
                size="lg"
                variant="outline"
                className="border-white/20 text-white hover:bg-white/10"
                data-testid="learn-more-promote"
              >
                Learn More
              </Button>
            </Link>
          </div>
        </motion.div>
      </div>
    </section>
  );
}