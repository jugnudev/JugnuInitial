// Pricing configuration for Promote v2.3
export const PRICING_CONFIG = {
  // Launch prices in CAD
  packages: {
    spotlight_banner: {
      name: 'Spotlight Banner',
      daily: 15,
      weekly: 75,
      description: 'Prime inline placement on events page',
      features: [
        'Prime inline placement after first row',
        'Desktop & mobile optimized (1600×400, 1080×600)',
        'Frequency capping (1×/day/user)',
        'Click tracking & UTM tagging',
        'Daily performance report',
        '2-3 day turnaround'
      ],
      sizeSpecs: {
        desktop: '1600×400px',
        mobile: '1080×600px'
      }
    },
    homepage_hero: {
      name: 'Homepage Hero',
      daily: 35,
      weekly: 175,
      description: 'High-impact below-the-fold hero placement',
      features: [
        'High-impact below-the-fold placement',
        'Custom creative (1600×900, safe area top 220px)',
        '7-day campaign duration',
        'Custom headline/subline/CTA',
        'Full impression & click tracking',
        'Weekly performance report'
      ],
      sizeSpecs: {
        desktop: '1600×900px (safe area top 220px)',
        mobile: 'Responsive design'
      }
    },
    full_feature: {
      name: 'Full Feature',
      base: 250,
      description: 'Complete multi-platform campaign',
      features: [
        'Optional dedicated landing page',
        'Instagram carousel (4-6 slides)',
        'Link-in-bio for 7 days',
        'Cross-platform performance report',
        'Custom creative development',
        '5-7 day turnaround'
      ]
    }
  },

  // Add-ons pricing
  addOns: {
    ig_story_boost: {
      name: 'IG Story Boost',
      price: 10,
      description: 'Instagram story amplification'
    },
    mid_run_repost: {
      name: 'Mid-Run Repost',
      price: 10,
      description: 'Additional social boost'
    },
    ig_carousel: {
      name: 'IG Carousel 4–6 slides',
      price: 60,
      description: 'Professional carousel content'
    },
    link_in_bio: {
      name: 'Link-in-bio 7 days',
      price: 15,
      description: 'Featured link placement'
    },
    creative_design: {
      name: 'Creative design help',
      price: 40,
      description: 'Professional design assistance'
    }
  },

  // Discounts
  discounts: {
    early_partner: {
      active: true, // LAUNCH_DISCOUNT_ACTIVE flag
      percentage: 20,
      description: 'Early partner discount: 20% off first 3 bookings',
      maxBookings: 3
    },
    multiWeek: {
      twoWeeks: 10,
      fourWeeks: 15
    }
  }
} as const;

export type PackageType = keyof typeof PRICING_CONFIG.packages;
export type AddOnType = keyof typeof PRICING_CONFIG.addOns;

export interface PricingCalculation {
  packagePrice: number;
  addOnsTotal: number;
  subtotal: number;
  discountAmount: number;
  total: number;
  discountDetails: string[];
}

export function calculatePricing(
  packageType: PackageType,
  duration: 'daily' | 'weekly',
  weeks: number = 1,
  selectedAddOns: AddOnType[] = [],
  isEarlyPartner: boolean = false
): PricingCalculation {
  const pkg = PRICING_CONFIG.packages[packageType] as any;
  
  // Calculate base package price
  let packagePrice = 0;
  if (packageType === 'full_feature') {
    packagePrice = (pkg as any).base;
  } else {
    const basePrice = duration === 'daily' ? (pkg as any).daily : (pkg as any).weekly;
    packagePrice = duration === 'daily' ? basePrice * 7 * weeks : basePrice * weeks;
  }

  // Calculate add-ons total
  const addOnsTotal = selectedAddOns.reduce((sum, addOn) => {
    return sum + PRICING_CONFIG.addOns[addOn].price;
  }, 0);

  const subtotal = packagePrice + addOnsTotal;
  let discountAmount = 0;
  const discountDetails: string[] = [];

  // Apply multi-week discount
  if (weeks >= 4) {
    const multiWeekDiscount = subtotal * (PRICING_CONFIG.discounts.multiWeek.fourWeeks / 100);
    discountAmount += multiWeekDiscount;
    discountDetails.push(`4+ weeks: -${PRICING_CONFIG.discounts.multiWeek.fourWeeks}%`);
  } else if (weeks >= 2) {
    const multiWeekDiscount = subtotal * (PRICING_CONFIG.discounts.multiWeek.twoWeeks / 100);
    discountAmount += multiWeekDiscount;
    discountDetails.push(`2+ weeks: -${PRICING_CONFIG.discounts.multiWeek.twoWeeks}%`);
  }

  // Apply early partner discount
  if (isEarlyPartner && PRICING_CONFIG.discounts.early_partner.active) {
    const earlyPartnerDiscount = (subtotal - discountAmount) * (PRICING_CONFIG.discounts.early_partner.percentage / 100);
    discountAmount += earlyPartnerDiscount;
    discountDetails.push(`Early partner: -${PRICING_CONFIG.discounts.early_partner.percentage}%`);
  }

  const total = Math.max(0, subtotal - discountAmount);

  return {
    packagePrice,
    addOnsTotal,
    subtotal,
    discountAmount,
    total,
    discountDetails
  };
}

export function formatCAD(amount: number): string {
  return new Intl.NumberFormat('en-CA', {
    style: 'currency',
    currency: 'CAD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
}