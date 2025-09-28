-- ============================================
-- ENHANCED COMMUNITIES PLATFORM SCHEMA
-- ============================================
-- This SQL creates all tables needed for the comprehensive Communities platform
-- Run this in Supabase SQL Editor after the existing schema
-- Note: This integrates with existing users, organizers, and organizerApplications tables

-- ============================================
-- PHASE 2: CORE COMMUNITIES SCHEMA
-- ============================================

-- Drop and recreate communities table with all required fields
DROP TABLE IF EXISTS public.communities CASCADE;
CREATE TABLE public.communities (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    organizer_id uuid NOT NULL REFERENCES public.organizers(id) ON DELETE CASCADE,
    
    -- Core fields
    name text NOT NULL,
    slug text UNIQUE NOT NULL,
    description text,
    short_description text, -- For discovery grid
    welcome_text text, -- Shown to new members
    
    -- Images
    cover_url text, -- Cover image for community header
    image_url text, -- Thumbnail/profile image
    
    -- Settings
    membership_policy text NOT NULL DEFAULT 'approval_required', -- approval_required | open | invite_only
    chat_mode text NOT NULL DEFAULT 'owner_only', -- owner_only | open_to_members
    chat_slowmode_seconds integer DEFAULT 0, -- 0 = no slow mode
    is_private boolean NOT NULL DEFAULT false,
    allow_member_posts boolean NOT NULL DEFAULT false,
    
    -- Billing & Status
    subscription_status text NOT NULL DEFAULT 'trialing', -- trialing | active | past_due | canceled
    subscription_ends_at timestamptz,
    status text NOT NULL DEFAULT 'active', -- active | suspended | archived
    
    -- Analytics
    total_members integer NOT NULL DEFAULT 0,
    total_posts integer NOT NULL DEFAULT 0,
    last_activity_at timestamptz DEFAULT now()
);

-- Community memberships with enhanced fields
DROP TABLE IF EXISTS public.community_memberships CASCADE;
CREATE TABLE public.community_memberships (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    community_id uuid NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
    user_id varchar NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    
    -- Membership details
    status text NOT NULL DEFAULT 'pending', -- pending | member | removed | banned
    role text NOT NULL DEFAULT 'member', -- member | moderator | admin | owner
    
    -- Timestamps
    requested_at timestamptz NOT NULL DEFAULT now(),
    joined_at timestamptz,
    left_at timestamptz,
    
    -- Approval tracking
    approved_by varchar REFERENCES public.users(id),
    approved_at timestamptz,
    rejection_reason text,
    
    -- Engagement
    last_seen_at timestamptz DEFAULT now(),
    posts_count integer NOT NULL DEFAULT 0,
    comments_count integer NOT NULL DEFAULT 0,
    
    -- Notifications
    email_notifications boolean NOT NULL DEFAULT true,
    in_app_notifications boolean NOT NULL DEFAULT true,
    
    -- Moderation
    is_muted boolean NOT NULL DEFAULT false,
    muted_until timestamptz,
    muted_by varchar REFERENCES public.users(id),
    mute_reason text,
    
    UNIQUE(community_id, user_id)
);

-- Rich content posts/announcements
DROP TABLE IF EXISTS public.community_posts CASCADE;
CREATE TABLE public.community_posts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    community_id uuid NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
    author_id varchar NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    
    -- Content
    title text NOT NULL,
    body text, -- Markdown content
    excerpt text, -- Auto-generated or manual excerpt
    
    -- Primary CTA
    primary_link_url text,
    primary_link_text text,
    primary_link_clicks integer NOT NULL DEFAULT 0,
    
    -- Post settings
    post_type text NOT NULL DEFAULT 'announcement', -- announcement | update | event | poll | deal
    status text NOT NULL DEFAULT 'draft', -- draft | scheduled | published | archived
    
    -- Scheduling
    scheduled_for timestamptz, -- UTC time for scheduling
    published_at timestamptz,
    expire_at timestamptz, -- Auto-hide after this time
    
    -- Features
    is_pinned boolean NOT NULL DEFAULT false,
    allow_comments boolean NOT NULL DEFAULT true,
    allow_reactions boolean NOT NULL DEFAULT true,
    
    -- Analytics
    view_count integer NOT NULL DEFAULT 0,
    unique_viewers integer NOT NULL DEFAULT 0,
    reaction_count integer NOT NULL DEFAULT 0,
    comment_count integer NOT NULL DEFAULT 0,
    share_count integer NOT NULL DEFAULT 0,
    
    -- SEO/Social
    meta_title text,
    meta_description text,
    og_image_url text,
    
    -- Tags & Categories
    tags text[] DEFAULT '{}',
    category text
);

-- Post image galleries (1-6 images per post)
CREATE TABLE public.community_post_images (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at timestamptz NOT NULL DEFAULT now(),
    post_id uuid NOT NULL REFERENCES public.community_posts(id) ON DELETE CASCADE,
    
    -- Image details
    url text NOT NULL,
    thumbnail_url text,
    alt_text text,
    caption text,
    
    -- Metadata
    width integer,
    height integer,
    size_bytes integer,
    mime_type text,
    
    -- Ordering
    display_order integer NOT NULL DEFAULT 0
);

-- Post reactions (❤️ 👍 🔥)
CREATE TABLE public.community_post_reactions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at timestamptz NOT NULL DEFAULT now(),
    post_id uuid NOT NULL REFERENCES public.community_posts(id) ON DELETE CASCADE,
    user_id varchar NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    reaction_type text NOT NULL, -- heart | thumbs_up | fire
    
    UNIQUE(post_id, user_id, reaction_type)
);

-- Comments on posts (single depth threading)
CREATE TABLE public.community_comments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    post_id uuid NOT NULL REFERENCES public.community_posts(id) ON DELETE CASCADE,
    author_id varchar NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    parent_comment_id uuid REFERENCES public.community_comments(id) ON DELETE CASCADE,
    
    -- Content
    content text NOT NULL,
    
    -- Moderation
    is_hidden boolean NOT NULL DEFAULT false,
    hidden_by varchar REFERENCES public.users(id),
    hidden_at timestamptz,
    hide_reason text,
    
    -- Analytics
    like_count integer NOT NULL DEFAULT 0,
    reply_count integer NOT NULL DEFAULT 0
);

-- Comment likes
CREATE TABLE public.community_comment_likes (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at timestamptz NOT NULL DEFAULT now(),
    comment_id uuid NOT NULL REFERENCES public.community_comments(id) ON DELETE CASCADE,
    user_id varchar NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    
    UNIQUE(comment_id, user_id)
);

-- ============================================
-- PHASE 5: CHAT & POLLS
-- ============================================

-- Community chat messages
CREATE TABLE public.community_chat_messages (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at timestamptz NOT NULL DEFAULT now(),
    community_id uuid NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
    author_id varchar NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    
    -- Content
    content text NOT NULL,
    
    -- Features
    is_pinned boolean NOT NULL DEFAULT false,
    is_announcement boolean NOT NULL DEFAULT false, -- Owner broadcast
    
    -- Moderation
    is_deleted boolean NOT NULL DEFAULT false,
    deleted_by varchar REFERENCES public.users(id),
    deleted_at timestamptz
);

-- Polls
CREATE TABLE public.community_polls (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    community_id uuid NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
    post_id uuid REFERENCES public.community_posts(id) ON DELETE CASCADE, -- Optional link to post
    author_id varchar NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    
    -- Poll details
    question text NOT NULL,
    description text,
    poll_type text NOT NULL DEFAULT 'single', -- single | multiple
    
    -- Settings
    allow_multiple_votes boolean NOT NULL DEFAULT false,
    show_results_before_vote boolean NOT NULL DEFAULT false,
    anonymous_voting boolean NOT NULL DEFAULT false,
    
    -- Timing
    closes_at timestamptz,
    is_closed boolean NOT NULL DEFAULT false,
    
    -- Analytics
    total_votes integer NOT NULL DEFAULT 0,
    unique_voters integer NOT NULL DEFAULT 0
);

-- Poll options
CREATE TABLE public.community_poll_options (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at timestamptz NOT NULL DEFAULT now(),
    poll_id uuid NOT NULL REFERENCES public.community_polls(id) ON DELETE CASCADE,
    
    -- Option details
    text text NOT NULL,
    description text,
    display_order integer NOT NULL DEFAULT 0,
    
    -- Results
    vote_count integer NOT NULL DEFAULT 0,
    vote_percentage numeric(5,2) DEFAULT 0
);

-- Poll votes
CREATE TABLE public.community_poll_votes (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at timestamptz NOT NULL DEFAULT now(),
    poll_id uuid NOT NULL REFERENCES public.community_polls(id) ON DELETE CASCADE,
    option_id uuid NOT NULL REFERENCES public.community_poll_options(id) ON DELETE CASCADE,
    user_id varchar NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    
    UNIQUE(poll_id, option_id, user_id)
);

-- ============================================
-- PHASE 4: ANALYTICS
-- ============================================

-- Post analytics tracking
CREATE TABLE public.community_post_analytics (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at timestamptz NOT NULL DEFAULT now(),
    post_id uuid NOT NULL REFERENCES public.community_posts(id) ON DELETE CASCADE,
    date date NOT NULL DEFAULT CURRENT_DATE,
    
    -- Metrics
    impressions integer NOT NULL DEFAULT 0,
    unique_viewers integer NOT NULL DEFAULT 0,
    clicks integer NOT NULL DEFAULT 0,
    reactions integer NOT NULL DEFAULT 0,
    comments integer NOT NULL DEFAULT 0,
    shares integer NOT NULL DEFAULT 0,
    
    -- Calculated
    ctr numeric(5,2) GENERATED ALWAYS AS (
        CASE WHEN impressions > 0 
        THEN ROUND((clicks::numeric / impressions::numeric) * 100, 2)
        ELSE 0 END
    ) STORED,
    
    UNIQUE(post_id, date)
);

-- Community analytics
CREATE TABLE public.community_analytics (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at timestamptz NOT NULL DEFAULT now(),
    community_id uuid NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
    date date NOT NULL DEFAULT CURRENT_DATE,
    
    -- Membership
    total_members integer NOT NULL DEFAULT 0,
    new_members integer NOT NULL DEFAULT 0,
    active_members integer NOT NULL DEFAULT 0, -- Posted/commented/reacted
    
    -- Content
    posts_published integer NOT NULL DEFAULT 0,
    total_reactions integer NOT NULL DEFAULT 0,
    total_comments integer NOT NULL DEFAULT 0,
    
    -- Engagement
    avg_post_impressions integer NOT NULL DEFAULT 0,
    avg_post_ctr numeric(5,2) DEFAULT 0,
    
    -- Best posting times (JSON array of {hour: 0-23, engagement_score: 0-100})
    best_posting_times jsonb DEFAULT '[]',
    
    UNIQUE(community_id, date)
);

-- ============================================
-- PHASE 6: BILLING (Organizer Subscriptions)
-- ============================================

-- Subscription tracking for organizers
CREATE TABLE public.community_subscriptions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    organizer_id uuid NOT NULL REFERENCES public.organizers(id) ON DELETE CASCADE,
    
    -- Stripe
    stripe_customer_id text UNIQUE,
    stripe_subscription_id text UNIQUE,
    stripe_price_id text,
    
    -- Plan details
    plan_type text NOT NULL DEFAULT 'monthly', -- monthly | yearly
    price_cents integer NOT NULL,
    currency text NOT NULL DEFAULT 'CAD',
    
    -- Status
    status text NOT NULL DEFAULT 'trialing', -- trialing | active | past_due | canceled | paused
    trial_ends_at timestamptz,
    current_period_starts_at timestamptz,
    current_period_ends_at timestamptz,
    canceled_at timestamptz,
    
    -- Payment
    last_payment_at timestamptz,
    next_payment_at timestamptz,
    payment_failed_at timestamptz,
    
    UNIQUE(organizer_id)
);

-- ============================================
-- PHASE 7: NOTIFICATIONS
-- ============================================

-- In-app notifications
CREATE TABLE public.community_notifications (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at timestamptz NOT NULL DEFAULT now(),
    user_id varchar NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    community_id uuid REFERENCES public.communities(id) ON DELETE CASCADE,
    
    -- Notification details
    type text NOT NULL, -- new_post | new_comment | reaction | member_joined | poll_created | chat_mention
    title text NOT NULL,
    body text,
    
    -- References
    post_id uuid REFERENCES public.community_posts(id) ON DELETE CASCADE,
    comment_id uuid REFERENCES public.community_comments(id) ON DELETE CASCADE,
    poll_id uuid REFERENCES public.community_polls(id) ON DELETE CASCADE,
    
    -- Status
    is_read boolean NOT NULL DEFAULT false,
    read_at timestamptz,
    
    -- Email
    email_sent boolean NOT NULL DEFAULT false,
    email_sent_at timestamptz
);

-- Email notification queue
CREATE TABLE public.community_email_queue (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at timestamptz NOT NULL DEFAULT now(),
    notification_id uuid REFERENCES public.community_notifications(id) ON DELETE CASCADE,
    user_id varchar NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    
    -- Email details
    to_email text NOT NULL,
    subject text NOT NULL,
    html_body text NOT NULL,
    
    -- Status
    status text NOT NULL DEFAULT 'pending', -- pending | sent | failed | skipped
    sent_at timestamptz,
    error text,
    retry_count integer NOT NULL DEFAULT 0
);

-- ============================================
-- PHASE 8: ADMIN & SELF-TEST
-- ============================================

-- Admin actions audit log
CREATE TABLE public.community_admin_audit (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at timestamptz NOT NULL DEFAULT now(),
    admin_id varchar NOT NULL REFERENCES public.users(id),
    
    -- Action details
    action text NOT NULL, -- approve_organizer | suspend_community | delete_post | etc
    target_type text, -- community | post | member | etc
    target_id text,
    
    -- Context
    reason text,
    metadata jsonb DEFAULT '{}',
    ip_address text,
    user_agent text
);

-- ============================================
-- EXTRA FEATURES: DEALS & GROWTH
-- ============================================

-- Community-exclusive deals
CREATE TABLE public.community_deals (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    community_id uuid NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
    post_id uuid REFERENCES public.community_posts(id) ON DELETE CASCADE,
    
    -- Deal details
    title text NOT NULL,
    description text NOT NULL,
    terms text,
    code text, -- Promo code if applicable
    
    -- Validity
    starts_at timestamptz DEFAULT now(),
    expires_at timestamptz,
    is_active boolean NOT NULL DEFAULT true,
    
    -- Limits
    max_uses integer,
    used_count integer NOT NULL DEFAULT 0,
    max_uses_per_member integer DEFAULT 1
);

-- Deal redemptions tracking
CREATE TABLE public.community_deal_redemptions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at timestamptz NOT NULL DEFAULT now(),
    deal_id uuid NOT NULL REFERENCES public.community_deals(id) ON DELETE CASCADE,
    user_id varchar NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    
    -- Redemption details
    redeemed_at timestamptz NOT NULL DEFAULT now(),
    metadata jsonb DEFAULT '{}'
);

-- Community invite links
CREATE TABLE public.community_invite_links (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at timestamptz NOT NULL DEFAULT now(),
    community_id uuid NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
    created_by varchar NOT NULL REFERENCES public.users(id),
    
    -- Link details
    code text UNIQUE NOT NULL,
    description text,
    
    -- Settings
    expires_at timestamptz,
    max_uses integer,
    used_count integer NOT NULL DEFAULT 0,
    is_active boolean NOT NULL DEFAULT true,
    
    -- Analytics
    click_count integer NOT NULL DEFAULT 0
);

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================

CREATE INDEX idx_communities_slug ON public.communities (slug);
CREATE INDEX idx_communities_status ON public.communities (status);
CREATE INDEX idx_communities_organizer ON public.communities (organizer_id);

CREATE INDEX idx_memberships_community ON public.community_memberships (community_id);
CREATE INDEX idx_memberships_user ON public.community_memberships (user_id);
CREATE INDEX idx_memberships_status ON public.community_memberships (community_id, status);

CREATE INDEX idx_posts_community ON public.community_posts (community_id);
CREATE INDEX idx_posts_status ON public.community_posts (status);
CREATE INDEX idx_posts_scheduled ON public.community_posts (scheduled_for) WHERE status = 'scheduled';
CREATE INDEX idx_posts_published ON public.community_posts (published_at);

CREATE INDEX idx_reactions_post ON public.community_post_reactions (post_id);
CREATE INDEX idx_reactions_user ON public.community_post_reactions (user_id);

CREATE INDEX idx_comments_post ON public.community_comments (post_id);
CREATE INDEX idx_comments_author ON public.community_comments (author_id);

CREATE INDEX idx_chat_community ON public.community_chat_messages (community_id);
CREATE INDEX idx_chat_created ON public.community_chat_messages (created_at);

CREATE INDEX idx_polls_community ON public.community_polls (community_id);
CREATE INDEX idx_polls_closes ON public.community_polls (closes_at) WHERE is_closed = false;

CREATE INDEX idx_notifications_user ON public.community_notifications (user_id, is_read);
CREATE INDEX idx_notifications_created ON public.community_notifications (created_at);

-- ============================================
-- STORAGE BUCKET FOR COMMUNITY ASSETS
-- ============================================

-- Create storage bucket for community assets (run in Supabase Dashboard)
-- INSERT INTO storage.buckets (id, name, public) VALUES ('communities', 'communities', true);

-- Storage policies would be:
-- 1. Anyone can read public community assets
-- 2. Only community owners can upload to their community folder
-- 3. File size limits: 5MB for images, 50MB for videos
-- 4. Allowed formats: jpg, png, gif, webp, mp4, webm

-- ============================================
-- RLS POLICIES
-- ============================================

-- Enable RLS on all tables
ALTER TABLE public.communities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_post_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_post_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_comment_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_polls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_poll_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_poll_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_post_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_email_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_admin_audit ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_deal_redemptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_invite_links ENABLE ROW LEVEL SECURITY;

-- Basic RLS Policies (These are examples - adjust based on your auth system)

-- Communities: Public read for discovery, owner write
CREATE POLICY "Communities are viewable by everyone" ON public.communities
    FOR SELECT USING (true);

CREATE POLICY "Only organizers can create communities" ON public.communities
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.organizers 
            WHERE id = communities.organizer_id 
            AND user_id = auth.uid()::varchar
        )
    );

CREATE POLICY "Only owners can update their communities" ON public.communities
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.organizers 
            WHERE id = communities.organizer_id 
            AND user_id = auth.uid()::varchar
        )
    );

-- Memberships: Members can view, owners can manage
CREATE POLICY "Users can view their memberships" ON public.community_memberships
    FOR SELECT USING (
        user_id = auth.uid()::varchar OR
        EXISTS (
            SELECT 1 FROM public.communities c
            JOIN public.organizers o ON o.id = c.organizer_id
            WHERE c.id = community_memberships.community_id
            AND o.user_id = auth.uid()::varchar
        )
    );

-- Posts: Members only visibility
CREATE POLICY "Only members can view posts" ON public.community_posts
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.community_memberships
            WHERE community_id = community_posts.community_id
            AND user_id = auth.uid()::varchar
            AND status = 'member'
        ) OR
        EXISTS (
            SELECT 1 FROM public.communities c
            JOIN public.organizers o ON o.id = c.organizer_id
            WHERE c.id = community_posts.community_id
            AND o.user_id = auth.uid()::varchar
        )
    );

-- Add more specific policies as needed...

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Function to schedule posts
CREATE OR REPLACE FUNCTION publish_scheduled_posts()
RETURNS void AS $$
BEGIN
    UPDATE public.community_posts
    SET status = 'published',
        published_at = now()
    WHERE status = 'scheduled'
    AND scheduled_for <= now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to expire posts
CREATE OR REPLACE FUNCTION expire_old_posts()
RETURNS void AS $$
BEGIN
    UPDATE public.community_posts
    SET status = 'archived'
    WHERE status = 'published'
    AND expire_at IS NOT NULL
    AND expire_at <= now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to calculate community analytics
CREATE OR REPLACE FUNCTION calculate_community_analytics()
RETURNS void AS $$
DECLARE
    comm RECORD;
BEGIN
    FOR comm IN SELECT id FROM public.communities WHERE status = 'active'
    LOOP
        INSERT INTO public.community_analytics (
            community_id,
            date,
            total_members,
            new_members,
            posts_published
        )
        VALUES (
            comm.id,
            CURRENT_DATE,
            (SELECT COUNT(*) FROM public.community_memberships WHERE community_id = comm.id AND status = 'member'),
            (SELECT COUNT(*) FROM public.community_memberships WHERE community_id = comm.id AND DATE(joined_at) = CURRENT_DATE),
            (SELECT COUNT(*) FROM public.community_posts WHERE community_id = comm.id AND DATE(published_at) = CURRENT_DATE)
        )
        ON CONFLICT (community_id, date) 
        DO UPDATE SET
            total_members = EXCLUDED.total_members,
            new_members = EXCLUDED.new_members,
            posts_published = EXCLUDED.posts_published,
            created_at = now();
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Schedule these functions with pg_cron if available:
-- SELECT cron.schedule('publish-scheduled-posts', '* * * * *', 'SELECT publish_scheduled_posts()');
-- SELECT cron.schedule('expire-old-posts', '0 * * * *', 'SELECT expire_old_posts()');
-- SELECT cron.schedule('calculate-analytics', '0 2 * * *', 'SELECT calculate_community_analytics()');

COMMENT ON SCHEMA public IS 'Enhanced Communities Platform - Complete Implementation';