import { getSupabaseAdmin } from '../supabaseAdmin';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import slugify from 'slugify';

// Package to placements mapping
const PACKAGE_PLACEMENTS_MAP = {
  events_spotlight: ['events_banner'],
  homepage_feature: ['home_mid'],
  full_feature: ['events_banner', 'home_mid']
} as const;

// Onboarding form validation schema
export const onboardingFormSchema = z.object({
  // Campaign details
  campaignTitle: z.string().min(1, 'Campaign title is required'),
  headline: z.string().min(1, 'Headline is required'),
  subline: z.string().optional(),
  ctaText: z.string().min(1, 'CTA text is required'),
  clickUrl: z.string().url('Must be a valid URL'),
  
  // Creative URLs (optional - can replace existing)
  eventsDesktopUrl: z.string().url().optional(),
  eventsMobileUrl: z.string().url().optional(),
  homeDesktopUrl: z.string().url().optional(),
  homeMobileUrl: z.string().url().optional(),
});

// Get onboarding data by token
export async function getOnboardingData(token: string) {
  const supabase = getSupabaseAdmin();
  
  // Fetch lead by token
  const { data: lead, error } = await supabase
    .from('sponsor_leads')
    .select('*')
    .eq('onboarding_token', token)
    .single();
  
  if (error || !lead) {
    throw new Error('Invalid or expired onboarding link');
  }
  
  // Validate token status
  if (!['approved', 'onboarding_sent'].includes(lead.status)) {
    throw new Error('This onboarding link is no longer valid');
  }
  
  if (lead.onboarding_used_at) {
    throw new Error('This onboarding link has already been used');
  }
  
  const now = new Date();
  const expiresAt = new Date(lead.onboarding_expires_at);
  if (now > expiresAt) {
    throw new Error('This onboarding link has expired');
  }
  
  // Map package to placements
  const packagePlacements = PACKAGE_PLACEMENTS_MAP[lead.package_code as keyof typeof PACKAGE_PLACEMENTS_MAP];
  const placements: string[] = packagePlacements ? [...packagePlacements] : [];
  
  // Convert dates to PT timezone for start_at and end_at
  const startDate = new Date(lead.start_date);
  const endDate = new Date(lead.end_date);
  
  // Set to start/end of day in PT
  const startAt = new Date(startDate);
  startAt.setHours(0, 0, 0, 0);
  
  const endAt = new Date(endDate);
  endAt.setHours(23, 59, 59, 999);
  
  return {
    leadId: lead.id,
    businessName: lead.business_name,
    contactName: lead.contact_name,
    email: lead.email,
    packageCode: lead.package_code,
    placements,
    startDate: lead.start_date,
    endDate: lead.end_date,
    startAt: startAt.toISOString(),
    endAt: endAt.toISOString(),
    addOns: lead.add_ons || [],
    // Creative URLs from lead
    eventsDesktopUrl: lead.events_desktop_asset_url || lead.desktop_asset_url,
    eventsMobileUrl: lead.events_mobile_asset_url || lead.mobile_asset_url,
    homeDesktopUrl: lead.home_desktop_asset_url || lead.desktop_asset_url,
    homeMobileUrl: lead.home_mobile_asset_url || lead.mobile_asset_url,
  };
}

// Process onboarding form submission
export async function processOnboarding(token: string, formData: z.infer<typeof onboardingFormSchema>) {
  const supabase = getSupabaseAdmin();
  
  // Re-validate token and get lead data
  const onboardingData = await getOnboardingData(token);
  
  // Generate campaign slug
  const campaignSlug = slugify(formData.campaignTitle, { lower: true, strict: true });
  
  // Append UTM parameters to click URL
  const clickUrl = new URL(formData.clickUrl);
  clickUrl.searchParams.set('utm_source', 'jugnu');
  clickUrl.searchParams.set('utm_medium', 'sponsor');
  clickUrl.searchParams.set('utm_campaign', campaignSlug);
  const finalClickUrl = clickUrl.toString();
  
  // Create campaign
  const { data: campaign, error: campaignError } = await supabase
    .from('sponsor_campaigns')
    .insert({
      name: formData.campaignTitle,
      sponsor_name: onboardingData.businessName,
      headline: formData.headline,
      subline: formData.subline || null,
      cta_text: formData.ctaText,
      click_url: finalClickUrl,
      placements: onboardingData.placements,
      start_at: onboardingData.startAt,
      end_at: onboardingData.endAt,
      is_active: false, // Start inactive, admin will activate
      source_lead_id: onboardingData.leadId,
    })
    .select()
    .single();
  
  if (campaignError) {
    throw new Error(`Failed to create campaign: ${campaignError.message}`);
  }
  
  // Create creative entries based on placements
  const creatives: Array<{
    campaign_id: string;
    placement: string;
    device_type: string;
    asset_url: string;
    is_active: boolean;
  }> = [];
  
  // Determine which creative URLs to use (form data overrides lead data)
  const eventsDesktopUrl = formData.eventsDesktopUrl || onboardingData.eventsDesktopUrl;
  const eventsMobileUrl = formData.eventsMobileUrl || onboardingData.eventsMobileUrl;
  const homeDesktopUrl = formData.homeDesktopUrl || onboardingData.homeDesktopUrl;
  const homeMobileUrl = formData.homeMobileUrl || onboardingData.homeMobileUrl;
  
  if (onboardingData.placements.includes('events_banner')) {
    if (eventsDesktopUrl) {
      creatives.push({
        campaign_id: campaign.id,
        placement: 'events_banner',
        device_type: 'desktop',
        asset_url: eventsDesktopUrl,
        is_active: true,
      });
    }
    if (eventsMobileUrl) {
      creatives.push({
        campaign_id: campaign.id,
        placement: 'events_banner',
        device_type: 'mobile',
        asset_url: eventsMobileUrl,
        is_active: true,
      });
    }
  }
  
  if (onboardingData.placements.includes('home_mid')) {
    if (homeDesktopUrl) {
      creatives.push({
        campaign_id: campaign.id,
        placement: 'home_mid',
        device_type: 'desktop',
        asset_url: homeDesktopUrl,
        is_active: true,
      });
    }
    if (homeMobileUrl) {
      creatives.push({
        campaign_id: campaign.id,
        placement: 'home_mid',
        device_type: 'mobile',
        asset_url: homeMobileUrl,
        is_active: true,
      });
    }
  }
  
  // Insert creatives
  if (creatives.length > 0) {
    const { error: creativesError } = await supabase
      .from('sponsor_creatives')
      .insert(creatives);
    
    if (creativesError) {
      console.error('Failed to create creatives:', creativesError);
      // Don't fail the whole operation if creatives fail
    }
  }
  
  // Update lead with campaign reference and mark as onboarded
  const { error: leadUpdateError } = await supabase
    .from('sponsor_leads')
    .update({
      source_campaign_id: campaign.id,
      status: 'onboarded',
      onboarding_used_at: new Date().toISOString(),
    })
    .eq('id', onboardingData.leadId);
  
  if (leadUpdateError) {
    console.error('Failed to update lead:', leadUpdateError);
  }
  
  // Create portal token for campaign
  // Set expiration to 90 days from now (matching standard sponsor portal duration)
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 90);
  
  // Use the new UUID-based system - let database generate the ID
  const { data: tokenData, error: portalError } = await supabase
    .from('sponsor_portal_tokens')
    .insert({
      campaign_id: campaign.id,
      expires_at: expiresAt.toISOString(),
      is_active: true,
    })
    .select('id, campaign_id, expires_at')
    .single();
  
  if (portalError) {
    console.error('Failed to create portal token:', portalError);
    // Still return success for campaign creation, just without portal
    return {
      ok: true,
      campaignId: campaign.id,
      portalLink: null,
    };
  }
  
  // Use the UUID id returned from database as the portal token
  const portalToken = tokenData?.id;
  
  if (!portalToken) {
    console.error('Portal token created but no ID was returned');
    return {
      ok: true,
      campaignId: campaign.id,
      portalLink: null,
    };
  }
  
  const portalLink = `${process.env.APP_BASE_URL || 'https://thehouseofjugnu.com'}/sponsor/${portalToken}`;
  
  return {
    ok: true,
    campaignId: campaign.id,
    portalLink,
  };
}