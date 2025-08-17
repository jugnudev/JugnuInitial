import { getSupabaseAdmin } from '../supabaseAdmin';
import { z } from 'zod';

// Pricing configuration
const PRICING = {
  packages: {
    events_spotlight: { daily: 10, weekly: 60 },
    homepage_feature: { daily: 25, weekly: 140 },  
    full_feature: { daily: 0, weekly: 350 } // Full feature is weekly only
  },
  addOns: {
    ig_story: 10,
    email_feature: 30
  }
} as const;

export type PackageCode = keyof typeof PRICING.packages;
export type AddOnCode = keyof typeof PRICING.addOns;

// Schemas for validation
export const createQuoteSchema = z.object({
  packageCode: z.enum(['events_spotlight', 'homepage_feature', 'full_feature']),
  duration: z.enum(['daily', 'weekly']),
  numWeeks: z.number().min(1).default(1),
  numDays: z.number().min(1).default(1),
  selectedDates: z.array(z.string()).default([]),
  startDate: z.string().nullish(),
  endDate: z.string().nullish(),
  addOns: z.array(z.string()).default([]),
});

export const createApplicationSchema = z.object({
  // Quote reference (preferred)
  quoteId: z.string().uuid().optional(),
  
  // Contact info
  businessName: z.string().min(1),
  contactName: z.string().min(1),
  email: z.string().email(),
  instagram: z.string().optional(),
  website: z.string().url().optional(),
  
  // Selection (required if no quoteId)
  packageCode: z.enum(['events_spotlight', 'homepage_feature', 'full_feature']).optional(),
  duration: z.enum(['daily', 'weekly']).optional(),
  numWeeks: z.number().min(1).optional(),
  numDays: z.number().min(1).optional(),
  selectedDates: z.array(z.string()).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  addOns: z.array(z.string()).optional(),
  
  // Campaign details
  budgetRange: z.string().optional(),
  objective: z.string().optional(),
  ackExclusive: z.boolean().default(false),
  ackGuarantee: z.boolean().default(false),
  
  // Creatives
  desktopAssetUrl: z.string().url(),
  mobileAssetUrl: z.string().url(), 
  creativeLinks: z.string().optional(),
  
  // Notes
  comments: z.string().optional(),
});

// Check if September promo is active and if brand can use it
export async function canUseSeptemberPromo(email: string): Promise<boolean> {
  const now = new Date();
  const isSeptember = now.getMonth() === 8 && now.getFullYear() === 2025;
  
  if (!isSeptember) return false;
  
  // Check if this email has already redeemed the promo using Supabase
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from('sponsor_promo_redemptions')
    .select('id')
    .eq('sponsor_email', email)
    .eq('promo_code', 'SEPTEMBER_FREE_WEEK_2025')
    .limit(1);
  
  if (error) {
    console.error('Error checking promo redemption:', error);
    return false;
  }
  
  return !data || data.length === 0;
}

// Calculate pricing for a quote
export function calculatePricing(
  packageCode: PackageCode,
  duration: 'daily' | 'weekly',
  numWeeks: number,
  numDays: number,
  addOns: string[],
  promoApplied: boolean = false
) {
  const pkg = PRICING.packages[packageCode];
  
  // Calculate base price
  let basePrice: number;
  if (duration === 'daily') {
    // Smart conversion: full weeks at weekly rate + remaining days at daily rate
    const fullWeeks = Math.floor(numDays / 7);
    const remainingDays = numDays % 7;
    basePrice = (fullWeeks * pkg.weekly) + (remainingDays * pkg.daily);
  } else {
    basePrice = pkg.weekly * numWeeks;
  }
  
  // Calculate add-ons
  const addOnsPrice = addOns.reduce((sum, addOn) => {
    if (addOn in PRICING.addOns) {
      return sum + PRICING.addOns[addOn as AddOnCode];
    }
    return sum;
  }, 0);
  
  // Apply promo to base price only (not add-ons)
  const discountedBasePrice = promoApplied ? 0 : basePrice;
  
  return {
    basePriceCents: basePrice * 100,
    addonsCents: addOnsPrice * 100,
    subtotalCents: (basePrice + addOnsPrice) * 100,
    totalCents: (discountedBasePrice + addOnsPrice) * 100,
    promoSavingsCents: promoApplied ? basePrice * 100 : 0
  };
}

// Create a new quote
export async function createQuote(data: z.infer<typeof createQuoteSchema>): Promise<string> {
  // Validate Full Feature is weekly only
  if (data.packageCode === 'full_feature' && data.duration === 'daily') {
    throw new Error('Full Feature package is only available as weekly booking');
  }
  
  // Calculate pricing
  const pricing = calculatePricing(
    data.packageCode,
    data.duration,
    data.numWeeks,
    data.numDays || 1,
    data.addOns,
    false // Promo will be applied during application if eligible
  );
  
  const quote = {
    package_code: data.packageCode,
    duration: data.duration,
    num_weeks: data.numWeeks,
    selected_dates: data.selectedDates,
    start_date: data.startDate || null,
    end_date: data.endDate || null,
    add_ons: data.addOns.map(code => ({ code, price: PRICING.addOns[code as AddOnCode] || 0 })),
    base_price_cents: pricing.basePriceCents,
    promo_applied: false,
    promo_code: null,
    currency: 'CAD',
    total_cents: pricing.totalCents,
    expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
  };
  
  const supabase = getSupabaseAdmin();
  const { data: result, error } = await supabase
    .from('sponsor_quotes')
    .insert(quote)
    .select('id')
    .single();
  
  if (error) {
    throw new Error(`Failed to create quote: ${error.message}`);
  }
  
  return result.id;
}

// Get quote by ID
export async function getQuote(id: string) {
  const supabase = getSupabaseAdmin();
  const { data: quote, error } = await supabase
    .from('sponsor_quotes')
    .select('*')
    .eq('id', id)
    .single();
  
  if (error || !quote) {
    return null;
  }
  
  // Check if expired
  if (new Date() > new Date(quote.expires_at)) {
    throw new Error('Quote has expired');
  }
  
  return quote;
}

// Create application/lead
export async function createApplication(data: z.infer<typeof createApplicationSchema>, rawPayload: any): Promise<string> {
  let quoteData: any = null;
  let finalPackageCode: string;
  let finalDuration: string;
  let finalNumWeeks: number;
  let finalSelectedDates: string[];
  let finalStartDate: string | null;
  let finalEndDate: string | null;
  let finalAddOns: any[];
  let pricing: any;
  
  if (data.quoteId) {
    // Use quote data
    quoteData = await getQuote(data.quoteId);
    if (!quoteData) {
      throw new Error('Quote not found or expired');
    }
    
    finalPackageCode = quoteData.package_code;
    finalDuration = quoteData.duration;
    finalNumWeeks = quoteData.num_weeks;
    finalSelectedDates = quoteData.selected_dates || [];
    finalStartDate = quoteData.start_date;
    finalEndDate = quoteData.end_date;
    finalAddOns = quoteData.add_ons || [];
    
    // Verify selection matches quote if provided
    if (data.packageCode && data.packageCode !== quoteData.package_code) {
      throw new Error('Package selection does not match quote');
    }
    
    pricing = {
      basePriceCents: quoteData.base_price_cents,
      addonsCents: finalAddOns.reduce((sum: number, addon: any) => sum + (addon.price * 100), 0),
      subtotalCents: quoteData.base_price_cents + finalAddOns.reduce((sum: number, addon: any) => sum + (addon.price * 100), 0),
      totalCents: quoteData.total_cents
    };
  } else {
    // Calculate from scratch
    if (!data.packageCode || !data.duration) {
      throw new Error('Package code and duration are required when not using quote');
    }
    
    finalPackageCode = data.packageCode;
    finalDuration = data.duration;
    finalNumWeeks = data.numWeeks || 1;
    finalSelectedDates = data.selectedDates || [];
    finalStartDate = data.startDate || null;
    finalEndDate = data.endDate || null;
    finalAddOns = (data.addOns || []).map(code => ({ 
      code, 
      price: PRICING.addOns[code as AddOnCode] || 0 
    }));
    
    pricing = calculatePricing(
      finalPackageCode as PackageCode,
      finalDuration as 'daily' | 'weekly',
      finalNumWeeks,
      data.numDays || 1,
      data.addOns || [],
      false
    );
  }
  
  // Check for September promo eligibility
  const canUsePromo = await canUseSeptemberPromo(data.email);
  const promoApplied = canUsePromo && finalDuration === 'weekly';
  
  if (promoApplied) {
    // Apply promo to base price only
    pricing.totalCents = pricing.addonsCents;
    
    // Record promo redemption
    const supabase = getSupabaseAdmin();
    const { error: promoError } = await supabase
      .from('sponsor_promo_redemptions')
      .insert({
        sponsor_email: data.email,
        promo_code: 'SEPTEMBER_FREE_WEEK_2025',
        notes: `Applied to lead for ${finalPackageCode}`
      });
    
    if (promoError) {
      console.error('Failed to record promo redemption:', promoError);
    }
  }
  
  // Validate Full Feature requirements
  if (finalPackageCode === 'full_feature') {
    if (finalDuration !== 'weekly') {
      throw new Error('Full Feature must be weekly booking');
    }
    if (!data.ackExclusive || !data.ackGuarantee) {
      throw new Error('Full Feature requires acknowledgement of exclusivity and guarantee terms');
    }
  }
  
  // Create lead using Supabase
  const lead = {
    quote_id: data.quoteId || null,
    business_name: data.businessName,
    contact_name: data.contactName,
    email: data.email,
    instagram: data.instagram || null,
    website: data.website || null,
    package_code: finalPackageCode,
    duration: finalDuration,
    num_weeks: finalNumWeeks,
    selected_dates: finalSelectedDates,
    start_date: finalStartDate,
    end_date: finalEndDate,
    add_ons: finalAddOns,
    promo_applied: promoApplied,
    promo_code: promoApplied ? 'SEPTEMBER_FREE_WEEK_2025' : null,
    currency: 'CAD',
    subtotal_cents: pricing.subtotalCents,
    addons_cents: pricing.addonsCents,
    total_cents: pricing.totalCents,
    // placement column doesn't exist, using package_code only
    objective: data.objective || null,
    ack_exclusive: data.ackExclusive,
    ack_guarantee: data.ackGuarantee,
    desktop_asset_url: data.desktopAssetUrl,
    mobile_asset_url: data.mobileAssetUrl,
    creative_links: data.creativeLinks || null,
    comments: data.comments || null,
    status: 'new',
    payload: rawPayload || {} // payload column is required
  };
  
  const supabase = getSupabaseAdmin();
  const { data: result, error } = await supabase
    .from('sponsor_leads')
    .insert(lead)
    .select('id')
    .single();
  
  if (error) {
    throw new Error(`Failed to create lead: ${error.message}`);
  }
  
  return result.id;
}

// Get leads with filtering
export async function getLeads(filters: {
  status?: string;
  packageCode?: string;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
  limit?: number;
  offset?: number;
} = {}) {
  const supabase = getSupabaseAdmin();
  let query = supabase.from('sponsor_leads').select('*');
  
  if (filters.status) {
    query = query.eq('status', filters.status);
  }
  
  if (filters.packageCode) {
    query = query.eq('package_code', filters.packageCode);
  }
  
  if (filters.search) {
    query = query.or(`business_name.ilike.%${filters.search}%,contact_name.ilike.%${filters.search}%,email.ilike.%${filters.search}%`);
  }
  
  if (filters.dateFrom) {
    query = query.gte('created_at', filters.dateFrom);
  }
  
  if (filters.dateTo) {
    query = query.lte('created_at', filters.dateTo);
  }
  
  query = query.order('created_at', { ascending: false });
  
  if (filters.limit) {
    query = query.limit(filters.limit);
  }
  
  if (filters.offset) {
    query = query.range(filters.offset, filters.offset + (filters.limit || 50) - 1);
  }
  
  const { data, error } = await query;
  
  if (error) {
    throw new Error(`Failed to fetch leads: ${error.message}`);
  }
  
  return data || [];
}

// Get single lead by ID
export async function getLead(id: string) {
  const supabase = getSupabaseAdmin();
  const { data: lead, error } = await supabase
    .from('sponsor_leads')
    .select('*')
    .eq('id', id)
    .single();
  
  if (error) {
    if (error.code === 'PGRST116') {
      return null; // Not found
    }
    throw new Error(`Failed to fetch lead: ${error.message}`);
  }
  
  return lead;
}

// Update lead status
export async function updateLeadStatus(id: string, status: string, adminNotes?: string) {
  const supabase = getSupabaseAdmin();
  const updateData: any = { status, updated_at: new Date().toISOString() };
  
  if (adminNotes !== undefined) {
    updateData.admin_notes = adminNotes;
  }
  
  const { data: result, error } = await supabase
    .from('sponsor_leads')
    .update(updateData)
    .eq('id', id)
    .select('id')
    .single();
  
  if (error) {
    if (error.code === 'PGRST116') {
      return null; // Not found
    }
    throw new Error(`Failed to update lead status: ${error.message}`);
  }
  
  return result;
}