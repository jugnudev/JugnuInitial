// Pricing configuration and calculation logic

export type PackageType = 'events_spotlight' | 'homepage_feature' | 'full_feature';
export type AddOnType = 'ig_story' | 'mid_run_repost';
export type DurationType = 'daily' | 'weekly';

// Base pricing in CAD
// Global perks shown on ALL cards (identical wording)
const GLOBAL_PERKS = [
  'Real-time impressions & clicks with UTM tracking',
  'Custom headline, subline, and CTA', 
  'Frequency capping to prevent ad fatigue',
  'Viewable impression tracking (billable)',
  'Sponsor portal + CSV export'
];

export const PRICING_CONFIG = {
  packages: {
    events_spotlight: {
      name: 'Events Spotlight Banner',
      description: 'Prime inline placement after the first row of events',
      daily: 15,
      weekly: 85,
      base: 85,
      supportsDailyBooking: true,
      globalPerks: GLOBAL_PERKS,
      features: [
        'Prime inline placement after the first row of events',
        'Native look on mobile & desktop',
        'Book daily or weekly'
      ],
      sizeSpecs: {
        desktop: '1600×400',
        mobile: '400×300'
      },
      cta: 'Choose Events Spotlight'
    },
    homepage_feature: {
      name: 'Homepage Feature Banner',
      description: 'High-visibility placement in the homepage feed',
      daily: 35,
      weekly: 210,
      base: 210,
      supportsDailyBooking: true,
      globalPerks: GLOBAL_PERKS,
      features: [
        'High-visibility placement in the homepage feed',
        'Book daily or weekly'
      ],
      sizeSpecs: {
        desktop: '1080×600',
        mobile: '600×400'
      },
      cta: 'Choose Homepage Feature'
    },
    full_feature: {
      name: 'Full Feature (Both Placements + IG Story)',
      description: 'Both placements for the same 7 days + 1 Instagram Story',
      daily: 499, // Not applicable - weekly only
      weekly: 499,
      base: 499,
      supportsDailyBooking: false,
      globalPerks: GLOBAL_PERKS,
      features: [
        'Both placements for the same 7 days',
        '1 Instagram Story during your week (creative provided or simple template)',
        'Delivery guarantee: We guarantee at least {X} viewable impressions{and_clicks} during your week. If we deliver less, we continue at no cost until the target is met.'
      ],
      sizeSpecs: {
        desktop: '1600×400 (desktop), 400×300 (mobile)',
        mobile: '1080×600 (desktop), 600×400 (mobile)'
      },
      cta: 'Choose Full Feature',
      isWeeklyOnly: true
    }
  },
  addOns: {
    ig_story: {
      name: 'IG Story Boost',
      description: 'Instagram story feature on @jugnu.events',
      price: 10
    },
    mid_run_repost: {
      name: 'Mid-run Repost',
      description: 'Additional social media push during campaign',
      price: 10
    }
  },
  discounts: {
    multiWeek: {
      threshold: 2,
      rate: 0.10, // 10% discount for 2+ weeks
      label: 'Multi-week discount'
    },
    earlyPartner: {
      rate: 0.20, // 20% early partner discount
      label: 'Early partner discount',
      enabled: true
    }
  },
  
  // September Launch Promo
  promos: {
    septemberFreeWeek: {
      code: 'SEPTEMBER_FREE_WEEK_2025',
      description: 'First 7-day booking free (September)',
      isActive: () => {
        const now = new Date();
        return now.getMonth() === 8 && now.getFullYear() === 2025; // September is month 8
      },
      applies: (durationType: DurationType) => durationType === 'weekly',
      badge: '🎉 Launch Offer: First 7-day booking free (September)'
    }
  }
};

export interface PricingCalculation {
  basePrice: number;
  weeklyPrice: number;
  addOnsTotal: number;
  subtotal: number;
  multiWeekDiscount: number;
  earlyPartnerDiscount: number;
  total: number;
  savings: number;
  weeklySavingsPercent: number; // Savings percentage vs daily×7
  breakdown: {
    package: string;
    duration: string;
    addOns: { name: string; price: number }[];
    discounts: { name: string; amount: number }[];
  };
}

export function calculatePricing(
  packageType: PackageType,
  durationType: DurationType,
  weekDuration: number,
  addOns: AddOnType[]
): PricingCalculation {
  const pkg = PRICING_CONFIG.packages[packageType];
  
  // Calculate base price
  const basePrice = durationType === 'daily' 
    ? pkg.daily * 7 * weekDuration // Convert daily to weekly
    : pkg.weekly * weekDuration;
  
  // Calculate weekly savings percentage vs daily
  const dailyEquivalent = pkg.daily * 7;
  const weeklySavingsPercent = dailyEquivalent > 0 
    ? Math.round(((dailyEquivalent - pkg.weekly) / dailyEquivalent) * 100)
    : 0;
  
  // Calculate add-ons
  const addOnsTotal = addOns.reduce((sum, addOn) => {
    return sum + PRICING_CONFIG.addOns[addOn].price;
  }, 0);
  
  const subtotal = basePrice + addOnsTotal;
  
  // Calculate discounts with 30% cap
  let multiWeekDiscount = 0;
  if (weekDuration >= PRICING_CONFIG.discounts.multiWeek.threshold) {
    multiWeekDiscount = subtotal * PRICING_CONFIG.discounts.multiWeek.rate;
  }
  
  let earlyPartnerDiscount = 0;
  if (PRICING_CONFIG.discounts.earlyPartner.enabled) {
    earlyPartnerDiscount = (subtotal - multiWeekDiscount) * PRICING_CONFIG.discounts.earlyPartner.rate;
  }
  
  // Cap total discounts at 30%
  const totalDiscountsUncapped = multiWeekDiscount + earlyPartnerDiscount;
  const maxDiscount = subtotal * 0.30; // 30% cap
  const totalDiscounts = Math.min(totalDiscountsUncapped, maxDiscount);
  
  // If we hit the cap, proportionally reduce discounts
  if (totalDiscountsUncapped > maxDiscount) {
    const ratio = maxDiscount / totalDiscountsUncapped;
    multiWeekDiscount = multiWeekDiscount * ratio;
    earlyPartnerDiscount = earlyPartnerDiscount * ratio;
  }
  
  const total = subtotal - totalDiscounts;
  const savings = totalDiscounts;
  
  return {
    basePrice,
    weeklyPrice: pkg.weekly,
    addOnsTotal,
    subtotal,
    multiWeekDiscount,
    earlyPartnerDiscount,
    total,
    savings,
    weeklySavingsPercent,
    breakdown: {
      package: `${pkg.name} (${weekDuration} week${weekDuration > 1 ? 's' : ''})`,
      duration: durationType === 'daily' ? `${weekDuration * 7} days` : `${weekDuration} week${weekDuration > 1 ? 's' : ''}`,
      addOns: addOns.map(addOn => ({
        name: PRICING_CONFIG.addOns[addOn].name,
        price: PRICING_CONFIG.addOns[addOn].price
      })),
      discounts: [
        ...(multiWeekDiscount > 0 ? [{ name: PRICING_CONFIG.discounts.multiWeek.label, amount: multiWeekDiscount }] : []),
        ...(earlyPartnerDiscount > 0 ? [{ name: PRICING_CONFIG.discounts.earlyPartner.label, amount: earlyPartnerDiscount }] : [])
      ]
    }
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

export function getPricingText(packageType: PackageType, durationType: DurationType): string {
  const pkg = PRICING_CONFIG.packages[packageType];
  const price = durationType === 'daily' ? pkg.daily : pkg.weekly;
  const period = durationType === 'daily' ? 'day' : 'week';
  return `${formatCAD(price)}/${period}`;
}