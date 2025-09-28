-- ============================================
-- FIXED COMMUNITIES PLATFORM MIGRATION
-- ============================================
-- This SQL fixes the type mismatch issues with user IDs
-- Uses UUID for user references to match your database

-- ============================================
-- PHASE 2: CORE COMMUNITIES SCHEMA (SAFE ALTERATIONS)
-- ============================================

-- Safely enhance communities table with missing fields
ALTER TABLE public.communities 
ADD COLUMN IF NOT EXISTS short_description text,
ADD COLUMN IF NOT EXISTS welcome_text text,
ADD COLUMN IF NOT EXISTS chat_mode text DEFAULT 'owner_only',
ADD COLUMN IF NOT EXISTS chat_slowmode_seconds integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS allow_member_posts boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS subscription_status text DEFAULT 'trialing',
ADD COLUMN IF NOT EXISTS subscription_ends_at timestamptz,
ADD COLUMN IF NOT EXISTS total_members integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_posts integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_activity_at timestamptz DEFAULT now();

-- Enhance community_memberships table with correct UUID types
ALTER TABLE public.community_memberships 
ADD COLUMN IF NOT EXISTS joined_at timestamptz,
ADD COLUMN IF NOT EXISTS left_at timestamptz,
ADD COLUMN IF NOT EXISTS rejection_reason text,
ADD COLUMN IF NOT EXISTS last_seen_at timestamptz DEFAULT now(),
ADD COLUMN IF NOT EXISTS posts_count integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS comments_count integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS email_notifications boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS in_app_notifications boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS is_muted boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS muted_until timestamptz,
ADD COLUMN IF NOT EXISTS muted_by uuid REFERENCES public.users(id),  -- Fixed: UUID type
ADD COLUMN IF NOT EXISTS mute_reason text;

-- Add unique constraint for memberships if it doesn't exist
DO $$ 
BEGIN 
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'unique_community_user'
    ) THEN
        ALTER TABLE public.community_memberships
        ADD CONSTRAINT unique_community_user UNIQUE (community_id, user_id);
    END IF;
END $$;

-- Enhance community_posts table
ALTER TABLE public.community_posts 
ADD COLUMN IF NOT EXISTS body text,
ADD COLUMN IF NOT EXISTS excerpt text,
ADD COLUMN IF NOT EXISTS primary_link_url text,
ADD COLUMN IF NOT EXISTS primary_link_text text,
ADD COLUMN IF NOT EXISTS primary_link_clicks integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS scheduled_for timestamptz,
ADD COLUMN IF NOT EXISTS published_at timestamptz,
ADD COLUMN IF NOT EXISTS expire_at timestamptz,
ADD COLUMN IF NOT EXISTS allow_comments boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS allow_reactions boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS view_count integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS unique_viewers integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS reaction_count integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS comment_count integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS share_count integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS meta_title text,
ADD COLUMN IF NOT EXISTS meta_description text,
ADD COLUMN IF NOT EXISTS og_image_url text,
ADD COLUMN IF NOT EXISTS category text;

-- Create new tables for missing features

-- Post image galleries (1-6 images per post)
CREATE TABLE IF NOT EXISTS public.community_post_images (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at timestamptz NOT NULL DEFAULT now(),
    post_id uuid NOT NULL REFERENCES public.community_posts(id) ON DELETE CASCADE,
    url text NOT NULL,
    thumbnail_url text,
    alt_text text,
    caption text,
    width integer,
    height integer,
    size_bytes integer,
    mime_type text,
    display_order integer NOT NULL DEFAULT 0
);

-- Post reactions with proper UUID type for user_id
CREATE TABLE IF NOT EXISTS public.community_post_reactions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at timestamptz NOT NULL DEFAULT now(),
    post_id uuid NOT NULL REFERENCES public.community_posts(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,  -- Fixed: UUID type
    reaction_type text NOT NULL CHECK (reaction_type IN ('heart', 'thumbs_up', 'fire')),
    UNIQUE(post_id, user_id, reaction_type)
);

-- Comments on posts with UUID user references
CREATE TABLE IF NOT EXISTS public.community_comments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    post_id uuid NOT NULL REFERENCES public.community_posts(id) ON DELETE CASCADE,
    author_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,  -- Fixed: UUID type
    parent_comment_id uuid REFERENCES public.community_comments(id) ON DELETE CASCADE,
    content text NOT NULL,
    is_hidden boolean NOT NULL DEFAULT false,
    hidden_by uuid REFERENCES public.users(id),  -- Fixed: UUID type
    hidden_at timestamptz,
    hide_reason text,
    like_count integer NOT NULL DEFAULT 0,
    reply_count integer NOT NULL DEFAULT 0
);

-- Comment likes with UUID user references
CREATE TABLE IF NOT EXISTS public.community_comment_likes (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at timestamptz NOT NULL DEFAULT now(),
    comment_id uuid NOT NULL REFERENCES public.community_comments(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,  -- Fixed: UUID type
    UNIQUE(comment_id, user_id)
);

-- ============================================
-- PHASE 5: CHAT & POLLS
-- ============================================

-- Community chat messages with UUID user references
CREATE TABLE IF NOT EXISTS public.community_chat_messages (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at timestamptz NOT NULL DEFAULT now(),
    community_id uuid NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
    author_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,  -- Fixed: UUID type
    content text NOT NULL,
    is_pinned boolean NOT NULL DEFAULT false,
    is_announcement boolean NOT NULL DEFAULT false,
    is_deleted boolean NOT NULL DEFAULT false,
    deleted_by uuid REFERENCES public.users(id),  -- Fixed: UUID type
    deleted_at timestamptz
);

-- Polls with UUID user references
CREATE TABLE IF NOT EXISTS public.community_polls (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    community_id uuid NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
    post_id uuid REFERENCES public.community_posts(id) ON DELETE CASCADE,
    author_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,  -- Fixed: UUID type
    question text NOT NULL,
    description text,
    poll_type text NOT NULL DEFAULT 'single' CHECK (poll_type IN ('single', 'multiple')),
    allow_multiple_votes boolean NOT NULL DEFAULT false,
    show_results_before_vote boolean NOT NULL DEFAULT false,
    anonymous_voting boolean NOT NULL DEFAULT false,
    closes_at timestamptz,
    is_closed boolean NOT NULL DEFAULT false,
    total_votes integer NOT NULL DEFAULT 0,
    unique_voters integer NOT NULL DEFAULT 0
);

-- Poll options
CREATE TABLE IF NOT EXISTS public.community_poll_options (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at timestamptz NOT NULL DEFAULT now(),
    poll_id uuid NOT NULL REFERENCES public.community_polls(id) ON DELETE CASCADE,
    text text NOT NULL,
    description text,
    display_order integer NOT NULL DEFAULT 0,
    vote_count integer NOT NULL DEFAULT 0,
    vote_percentage numeric(5,2) DEFAULT 0
);

-- Poll votes with UUID user references
CREATE TABLE IF NOT EXISTS public.community_poll_votes (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at timestamptz NOT NULL DEFAULT now(),
    poll_id uuid NOT NULL REFERENCES public.community_polls(id) ON DELETE CASCADE,
    option_id uuid NOT NULL REFERENCES public.community_poll_options(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,  -- Fixed: UUID type
    UNIQUE(poll_id, option_id, user_id)
);

-- Create function to enforce single-choice polls
CREATE OR REPLACE FUNCTION enforce_single_choice_poll()
RETURNS TRIGGER AS $$
DECLARE
    poll_type text;
    existing_votes integer;
BEGIN
    -- Get the poll type
    SELECT p.poll_type INTO poll_type
    FROM community_polls p
    WHERE p.id = NEW.poll_id;
    
    -- If it's a single-choice poll, check for existing votes
    IF poll_type = 'single' THEN
        SELECT COUNT(*) INTO existing_votes
        FROM community_poll_votes
        WHERE poll_id = NEW.poll_id AND user_id = NEW.user_id;
        
        IF existing_votes > 0 THEN
            RAISE EXCEPTION 'User has already voted in this single-choice poll';
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for single-choice enforcement
DROP TRIGGER IF EXISTS enforce_single_choice_poll_trigger ON public.community_poll_votes;
CREATE TRIGGER enforce_single_choice_poll_trigger
BEFORE INSERT ON public.community_poll_votes
FOR EACH ROW EXECUTE FUNCTION enforce_single_choice_poll();

-- ============================================
-- PHASE 4: ANALYTICS
-- ============================================

CREATE TABLE IF NOT EXISTS public.community_post_analytics (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at timestamptz NOT NULL DEFAULT now(),
    post_id uuid NOT NULL REFERENCES public.community_posts(id) ON DELETE CASCADE,
    date date NOT NULL DEFAULT CURRENT_DATE,
    impressions integer NOT NULL DEFAULT 0,
    unique_viewers integer NOT NULL DEFAULT 0,
    clicks integer NOT NULL DEFAULT 0,
    reactions integer NOT NULL DEFAULT 0,
    comments integer NOT NULL DEFAULT 0,
    shares integer NOT NULL DEFAULT 0,
    ctr numeric(5,2) GENERATED ALWAYS AS (
        CASE WHEN impressions > 0 
        THEN ROUND((clicks::numeric / impressions::numeric) * 100, 2)
        ELSE 0 END
    ) STORED,
    UNIQUE(post_id, date)
);

CREATE TABLE IF NOT EXISTS public.community_analytics (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at timestamptz NOT NULL DEFAULT now(),
    community_id uuid NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
    date date NOT NULL DEFAULT CURRENT_DATE,
    total_members integer NOT NULL DEFAULT 0,
    new_members integer NOT NULL DEFAULT 0,
    active_members integer NOT NULL DEFAULT 0,
    posts_published integer NOT NULL DEFAULT 0,
    total_reactions integer NOT NULL DEFAULT 0,
    total_comments integer NOT NULL DEFAULT 0,
    avg_post_impressions integer NOT NULL DEFAULT 0,
    avg_post_ctr numeric(5,2) DEFAULT 0,
    best_posting_times jsonb DEFAULT '[]',
    UNIQUE(community_id, date)
);

-- ============================================
-- PHASE 6: BILLING
-- ============================================

CREATE TABLE IF NOT EXISTS public.community_subscriptions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    organizer_id uuid NOT NULL REFERENCES public.organizers(id) ON DELETE CASCADE,
    stripe_customer_id text UNIQUE,
    stripe_subscription_id text UNIQUE,
    stripe_price_id text,
    plan_type text NOT NULL DEFAULT 'monthly' CHECK (plan_type IN ('monthly', 'yearly')),
    price_cents integer NOT NULL,
    currency text NOT NULL DEFAULT 'CAD',
    status text NOT NULL DEFAULT 'trialing' CHECK (status IN ('trialing', 'active', 'past_due', 'canceled', 'paused')),
    trial_ends_at timestamptz,
    current_period_starts_at timestamptz,
    current_period_ends_at timestamptz,
    canceled_at timestamptz,
    last_payment_at timestamptz,
    next_payment_at timestamptz,
    payment_failed_at timestamptz,
    UNIQUE(organizer_id)
);

-- ============================================
-- PHASE 7: NOTIFICATIONS
-- ============================================

CREATE TABLE IF NOT EXISTS public.community_notifications (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at timestamptz NOT NULL DEFAULT now(),
    user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,  -- Fixed: UUID type
    community_id uuid REFERENCES public.communities(id) ON DELETE CASCADE,
    type text NOT NULL CHECK (type IN ('new_post', 'new_comment', 'reaction', 'member_joined', 'poll_created', 'chat_mention')),
    title text NOT NULL,
    body text,
    post_id uuid REFERENCES public.community_posts(id) ON DELETE CASCADE,
    comment_id uuid REFERENCES public.community_comments(id) ON DELETE CASCADE,
    poll_id uuid REFERENCES public.community_polls(id) ON DELETE CASCADE,
    is_read boolean NOT NULL DEFAULT false,
    read_at timestamptz,
    email_sent boolean NOT NULL DEFAULT false,
    email_sent_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.community_email_queue (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at timestamptz NOT NULL DEFAULT now(),
    notification_id uuid REFERENCES public.community_notifications(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,  -- Fixed: UUID type
    to_email text NOT NULL,
    subject text NOT NULL,
    html_body text NOT NULL,
    status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'skipped')),
    sent_at timestamptz,
    error text,
    retry_count integer NOT NULL DEFAULT 0
);

-- ============================================
-- PHASE 8: ADMIN & SELF-TEST
-- ============================================

CREATE TABLE IF NOT EXISTS public.community_admin_audit (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at timestamptz NOT NULL DEFAULT now(),
    admin_id uuid NOT NULL REFERENCES public.users(id),  -- Fixed: UUID type
    action text NOT NULL,
    target_type text,
    target_id text,
    reason text,
    metadata jsonb DEFAULT '{}',
    ip_address text,
    user_agent text
);

-- ============================================
-- EXTRA FEATURES
-- ============================================

CREATE TABLE IF NOT EXISTS public.community_deals (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    community_id uuid NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
    post_id uuid REFERENCES public.community_posts(id) ON DELETE CASCADE,
    title text NOT NULL,
    description text NOT NULL,
    terms text,
    code text,
    starts_at timestamptz DEFAULT now(),
    expires_at timestamptz,
    is_active boolean NOT NULL DEFAULT true,
    max_uses integer,
    used_count integer NOT NULL DEFAULT 0,
    max_uses_per_member integer DEFAULT 1
);

CREATE TABLE IF NOT EXISTS public.community_deal_redemptions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at timestamptz NOT NULL DEFAULT now(),
    deal_id uuid NOT NULL REFERENCES public.community_deals(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,  -- Fixed: UUID type
    redeemed_at timestamptz NOT NULL DEFAULT now(),
    metadata jsonb DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS public.community_invite_links (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at timestamptz NOT NULL DEFAULT now(),
    community_id uuid NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
    created_by uuid NOT NULL REFERENCES public.users(id),  -- Fixed: UUID type
    code text UNIQUE NOT NULL,
    description text,
    expires_at timestamptz,
    max_uses integer,
    used_count integer NOT NULL DEFAULT 0,
    is_active boolean NOT NULL DEFAULT true,
    click_count integer NOT NULL DEFAULT 0
);

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================

CREATE INDEX IF NOT EXISTS idx_communities_slug ON public.communities (slug);
CREATE INDEX IF NOT EXISTS idx_communities_status ON public.communities (status);
CREATE INDEX IF NOT EXISTS idx_communities_organizer ON public.communities (organizer_id);

CREATE INDEX IF NOT EXISTS idx_memberships_community ON public.community_memberships (community_id);
CREATE INDEX IF NOT EXISTS idx_memberships_user ON public.community_memberships (user_id);
CREATE INDEX IF NOT EXISTS idx_memberships_status ON public.community_memberships (community_id, status);

CREATE INDEX IF NOT EXISTS idx_posts_community ON public.community_posts (community_id);
CREATE INDEX IF NOT EXISTS idx_posts_status ON public.community_posts (status);
CREATE INDEX IF NOT EXISTS idx_posts_scheduled ON public.community_posts (scheduled_for) WHERE status = 'scheduled';
CREATE INDEX IF NOT EXISTS idx_posts_published ON public.community_posts (published_at);

CREATE INDEX IF NOT EXISTS idx_reactions_post ON public.community_post_reactions (post_id);
CREATE INDEX IF NOT EXISTS idx_reactions_user ON public.community_post_reactions (user_id);

CREATE INDEX IF NOT EXISTS idx_comments_post ON public.community_comments (post_id);
CREATE INDEX IF NOT EXISTS idx_comments_author ON public.community_comments (author_id);

CREATE INDEX IF NOT EXISTS idx_chat_community ON public.community_chat_messages (community_id);
CREATE INDEX IF NOT EXISTS idx_chat_created ON public.community_chat_messages (created_at);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON public.community_notifications (user_id, is_read);

-- ============================================
-- ENABLE ROW LEVEL SECURITY ON ALL TABLES
-- ============================================

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

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Function to update member counts
CREATE OR REPLACE FUNCTION update_community_member_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
        UPDATE public.communities
        SET total_members = (
            SELECT COUNT(*) FROM public.community_memberships
            WHERE community_id = NEW.community_id AND status = 'member'
        ),
        last_activity_at = now()
        WHERE id = NEW.community_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE public.communities
        SET total_members = (
            SELECT COUNT(*) FROM public.community_memberships
            WHERE community_id = OLD.community_id AND status = 'member'
        )
        WHERE id = OLD.community_id;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_community_member_count_trigger ON public.community_memberships;
CREATE TRIGGER update_community_member_count_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.community_memberships
FOR EACH ROW EXECUTE FUNCTION update_community_member_count();

-- Function to update post counts
CREATE OR REPLACE FUNCTION update_community_post_count()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.communities
    SET total_posts = (
        SELECT COUNT(*) FROM public.community_posts
        WHERE community_id = NEW.community_id AND status = 'published'
    ),
    last_activity_at = now()
    WHERE id = NEW.community_id;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_community_post_count_trigger ON public.community_posts;
CREATE TRIGGER update_community_post_count_trigger
AFTER INSERT OR UPDATE ON public.community_posts
FOR EACH ROW 
WHEN (NEW.status = 'published')
EXECUTE FUNCTION update_community_post_count();

COMMENT ON SCHEMA public IS 'Fixed migration for Communities Platform with correct UUID types';