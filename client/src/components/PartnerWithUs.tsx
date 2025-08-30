import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";

const partners = [
  "Restaurants",
  "Event Organizers",
  "Artists",
  "Musicians",
  "Fashion Brands",
  "Community Organizations"
];

export default function PartnerWithUs() {
  return (
    <section className="py-16 lg:py-20 relative">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="max-w-4xl mx-auto text-center"
        >
          <h2 className="font-fraunces text-3xl lg:text-4xl font-bold tracking-tight text-white mb-6">
            Partner With Jugnu
          </h2>
          
          <p className="text-lg text-muted mb-8">
            We've proudly worked with Vancouver's leading South Asian businesses and cultural organizations
          </p>
          
          {/* Partner Types */}
          <div className="flex flex-wrap justify-center gap-3 mb-10">
            {partners.map((partner, index) => (
              <motion.span
                key={partner}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
                className="px-4 py-2 bg-white/5 border border-white/10 rounded-full text-sm text-muted hover:bg-white/10 hover:border-copper-500/30 transition-all duration-200"
              >
                {partner}
              </motion.span>
            ))}
          </div>
          
          <p className="text-muted mb-10 max-w-2xl mx-auto">
            Connect with Vancouver's most engaged cultural community through exclusive sponsorship opportunities. 
            Premium placements starting from $60/week.
          </p>
          
          {/* CTA */}
          <Link href="/promote">
            <Button
              size="lg"
              className="bg-copper-500 hover:bg-copper-600 text-black font-semibold px-8 py-4 shadow-lg hover:shadow-xl transition-all duration-200"
              data-testid="partner-with-us-cta"
            >
              Learn About Sponsorship
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>
        </motion.div>
      </div>
    </section>
  );
}