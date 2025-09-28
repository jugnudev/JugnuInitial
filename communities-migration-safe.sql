-- ============================================
-- SAFE COMMUNITIES PLATFORM MIGRATION
-- ============================================
-- This SQL safely adds/alters tables for the comprehensive Communities platform
-- Run this in Supabase SQL Editor - it preserves existing data
-- Note: Uses varchar for user IDs to match existing schema

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

-- Add constraints to communities
ALTER TABLE public.communities
ADD CONSTRAINT chk_membership_policy CHECK (membership_policy IN ('approval_required', 'open', 'invite_only')),
ADD CONSTRAINT chk_chat_mode CHECK (chat_mode IN ('owner_only', 'open_to_members')),
ADD CONSTRAINT chk_subscription_status CHECK (subscription_status IN ('trialing', 'active', 'past_due', 'canceled')),
ADD CONSTRAINT chk_status CHECK (status IN ('active', 'suspended', 'archived'));

-- Enhance community_memberships table
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
ADD COLUMN IF NOT EXISTS muted_by varchar REFERENCES public.users(id),
ADD COLUMN IF NOT EXISTS mute_reason text;

-- Fix user_id type in community_memberships (it should be varchar, not uuid)
DO $$ 
BEGIN 
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'community_memberships' 
        AND column_name = 'user_id' 
        AND data_type = 'uuid'
    ) THEN
        ALTER TABLE public.community_memberships 
        ALTER COLUMN user_id TYPE varchar USING user_id::varchar;
        
        ALTER TABLE public.community_memberships
        ADD CONSTRAINT fk_membership_user FOREIGN KEY (user_id) 
        REFERENCES public.users(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Add unique constraint for memberships
ALTER TABLE public.community_memberships
DROP CONSTRAINT IF EXISTS unique_community_user,
ADD CONSTRAINT unique_community_user UNIQUE (community_id, user_id);

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

-- Fix author_id type in community_posts
DO $$ 
BEGIN 
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'community_posts' 
        AND column_name = 'author_id' 
        AND data_type = 'uuid'
    ) THEN
        ALTER TABLE public.community_posts 
        ALTER COLUMN author_id TYPE varchar USING author_id::varchar;
        
        ALTER TABLE public.community_posts
        ADD CONSTRAINT fk_post_author FOREIGN KEY (author_id) 
        REFERENCES public.users(id) ON DELETE CASCADE;
    END IF;
END $$;

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

-- Post reactions with proper constraint
CREATE TABLE IF NOT EXISTS public.community_post_reactions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at timestamptz NOT NULL DEFAULT now(),
    post_id uuid NOT NULL REFERENCES public.community_posts(id) ON DELETE CASCADE,
    user_id varchar NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    reaction_type text NOT NULL CHECK (reaction_type IN ('heart', 'thumbs_up', 'fire')),
    UNIQUE(post_id, user_id, reaction_type)
);

-- Comments on posts
CREATE TABLE IF NOT EXISTS public.community_comments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    post_id uuid NOT NULL REFERENCES public.community_posts(id) ON DELETE CASCADE,
    author_id varchar NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    parent_comment_id uuid REFERENCES public.community_comments(id) ON DELETE CASCADE,
    content text NOT NULL,
    is_hidden boolean NOT NULL DEFAULT false,
    hidden_by varchar REFERENCES public.users(id),
    hidden_at timestamptz,
    hide_reason text,
    like_count integer NOT NULL DEFAULT 0,
    reply_count integer NOT NULL DEFAULT 0
);

-- Comment likes
CREATE TABLE IF NOT EXISTS public.community_comment_likes (
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
CREATE TABLE IF NOT EXISTS public.community_chat_messages (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at timestamptz NOT NULL DEFAULT now(),
    community_id uuid NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
    author_id varchar NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    content text NOT NULL,
    is_pinned boolean NOT NULL DEFAULT false,
    is_announcement boolean NOT NULL DEFAULT false,
    is_deleted boolean NOT NULL DEFAULT false,
    deleted_by varchar REFERENCES public.users(id),
    deleted_at timestamptz
);

-- Polls with proper constraints
CREATE TABLE IF NOT EXISTS public.community_polls (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    community_id uuid NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
    post_id uuid REFERENCES public.community_posts(id) ON DELETE CASCADE,
    author_id varchar NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
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

-- Poll votes with proper constraints for single/multiple choice enforcement
CREATE TABLE IF NOT EXISTS public.community_poll_votes (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at timestamptz NOT NULL DEFAULT now(),
    poll_id uuid NOT NULL REFERENCES public.community_polls(id) ON DELETE CASCADE,
    option_id uuid NOT NULL REFERENCES public.community_poll_options(id) ON DELETE CASCADE,
    user_id varchar NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
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
    user_id varchar NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
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
    user_id varchar NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
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
    admin_id varchar NOT NULL REFERENCES public.users(id),
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
    user_id varchar NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    redeemed_at timestamptz NOT NULL DEFAULT now(),
    metadata jsonb DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS public.community_invite_links (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at timestamptz NOT NULL DEFAULT now(),
    community_id uuid NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
    created_by varchar NOT NULL REFERENCES public.users(id),
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
-- COMPREHENSIVE RLS POLICIES
-- ============================================

-- Communities: Public read for discovery, owner write
DROP POLICY IF EXISTS "Communities are viewable by everyone" ON public.communities;
CREATE POLICY "Communities are viewable by everyone" ON public.communities
    FOR SELECT USING (
        status = 'active' -- Only active communities are public
    );

DROP POLICY IF EXISTS "Organizers can create communities" ON public.communities;
CREATE POLICY "Organizers can create communities" ON public.communities
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.organizers 
            WHERE id = communities.organizer_id 
            AND user_id = auth.uid()::varchar
            AND status = 'active'
        )
    );

DROP POLICY IF EXISTS "Organizers can update their communities" ON public.communities;
CREATE POLICY "Organizers can update their communities" ON public.communities
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.organizers 
            WHERE id = communities.organizer_id 
            AND user_id = auth.uid()::varchar
        )
    );

DROP POLICY IF EXISTS "Organizers can delete their communities" ON public.communities;
CREATE POLICY "Organizers can delete their communities" ON public.communities
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.organizers 
            WHERE id = communities.organizer_id 
            AND user_id = auth.uid()::varchar
        )
    );

-- Memberships: Users can view their own, owners can manage all
DROP POLICY IF EXISTS "Users can view memberships" ON public.community_memberships;
CREATE POLICY "Users can view memberships" ON public.community_memberships
    FOR SELECT USING (
        user_id = auth.uid()::varchar OR -- Own membership
        EXISTS ( -- Community owner can see all
            SELECT 1 FROM public.communities c
            JOIN public.organizers o ON o.id = c.organizer_id
            WHERE c.id = community_memberships.community_id
            AND o.user_id = auth.uid()::varchar
        )
    );

DROP POLICY IF EXISTS "Users can request membership" ON public.community_memberships;
CREATE POLICY "Users can request membership" ON public.community_memberships
    FOR INSERT WITH CHECK (
        user_id = auth.uid()::varchar AND
        status = 'pending'
    );

DROP POLICY IF EXISTS "Owners can update memberships" ON public.community_memberships;
CREATE POLICY "Owners can update memberships" ON public.community_memberships
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.communities c
            JOIN public.organizers o ON o.id = c.organizer_id
            WHERE c.id = community_memberships.community_id
            AND o.user_id = auth.uid()::varchar
        )
    );

-- Posts: STRICT members-only visibility
DROP POLICY IF EXISTS "Members only can view posts" ON public.community_posts;
CREATE POLICY "Members only can view posts" ON public.community_posts
    FOR SELECT USING (
        status = 'published' AND (
            -- Member of the community
            EXISTS (
                SELECT 1 FROM public.community_memberships
                WHERE community_id = community_posts.community_id
                AND user_id = auth.uid()::varchar
                AND status = 'member'
            ) OR
            -- Community owner
            EXISTS (
                SELECT 1 FROM public.communities c
                JOIN public.organizers o ON o.id = c.organizer_id
                WHERE c.id = community_posts.community_id
                AND o.user_id = auth.uid()::varchar
            )
        )
    );

DROP POLICY IF EXISTS "Owners can create posts" ON public.community_posts;
CREATE POLICY "Owners can create posts" ON public.community_posts
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.communities c
            JOIN public.organizers o ON o.id = c.organizer_id
            WHERE c.id = community_posts.community_id
            AND o.user_id = auth.uid()::varchar
        )
    );

DROP POLICY IF EXISTS "Owners can update posts" ON public.community_posts;
CREATE POLICY "Owners can update posts" ON public.community_posts
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.communities c
            JOIN public.organizers o ON o.id = c.organizer_id
            WHERE c.id = community_posts.community_id
            AND o.user_id = auth.uid()::varchar
        )
    );

DROP POLICY IF EXISTS "Owners can delete posts" ON public.community_posts;
CREATE POLICY "Owners can delete posts" ON public.community_posts
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.communities c
            JOIN public.organizers o ON o.id = c.organizer_id
            WHERE c.id = community_posts.community_id
            AND o.user_id = auth.uid()::varchar
        )
    );

-- Post images: Follow post visibility
DROP POLICY IF EXISTS "Post images follow post visibility" ON public.community_post_images;
CREATE POLICY "Post images follow post visibility" ON public.community_post_images
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.community_posts p
            WHERE p.id = community_post_images.post_id
            AND p.status = 'published'
            AND EXISTS (
                SELECT 1 FROM public.community_memberships m
                WHERE m.community_id = p.community_id
                AND m.user_id = auth.uid()::varchar
                AND m.status = 'member'
            )
        )
    );

-- Reactions: Members can react
DROP POLICY IF EXISTS "Members can view reactions" ON public.community_post_reactions;
CREATE POLICY "Members can view reactions" ON public.community_post_reactions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.community_posts p
            JOIN public.community_memberships m ON m.community_id = p.community_id
            WHERE p.id = community_post_reactions.post_id
            AND m.user_id = auth.uid()::varchar
            AND m.status = 'member'
        )
    );

DROP POLICY IF EXISTS "Members can add reactions" ON public.community_post_reactions;
CREATE POLICY "Members can add reactions" ON public.community_post_reactions
    FOR INSERT WITH CHECK (
        user_id = auth.uid()::varchar AND
        EXISTS (
            SELECT 1 FROM public.community_posts p
            JOIN public.community_memberships m ON m.community_id = p.community_id
            WHERE p.id = community_post_reactions.post_id
            AND m.user_id = auth.uid()::varchar
            AND m.status = 'member'
        )
    );

DROP POLICY IF EXISTS "Users can remove own reactions" ON public.community_post_reactions;
CREATE POLICY "Users can remove own reactions" ON public.community_post_reactions
    FOR DELETE USING (user_id = auth.uid()::varchar);

-- Comments: Members can comment
DROP POLICY IF EXISTS "Members can view comments" ON public.community_comments;
CREATE POLICY "Members can view comments" ON public.community_comments
    FOR SELECT USING (
        NOT is_hidden AND
        EXISTS (
            SELECT 1 FROM public.community_posts p
            JOIN public.community_memberships m ON m.community_id = p.community_id
            WHERE p.id = community_comments.post_id
            AND m.user_id = auth.uid()::varchar
            AND m.status = 'member'
        )
    );

DROP POLICY IF EXISTS "Members can create comments" ON public.community_comments;
CREATE POLICY "Members can create comments" ON public.community_comments
    FOR INSERT WITH CHECK (
        author_id = auth.uid()::varchar AND
        EXISTS (
            SELECT 1 FROM public.community_posts p
            JOIN public.community_memberships m ON m.community_id = p.community_id
            WHERE p.id = community_comments.post_id
            AND m.user_id = auth.uid()::varchar
            AND m.status = 'member'
            AND p.allow_comments = true
        )
    );

DROP POLICY IF EXISTS "Authors can update own comments" ON public.community_comments;
CREATE POLICY "Authors can update own comments" ON public.community_comments
    FOR UPDATE USING (author_id = auth.uid()::varchar);

DROP POLICY IF EXISTS "Authors and owners can delete comments" ON public.community_comments;
CREATE POLICY "Authors and owners can delete comments" ON public.community_comments
    FOR DELETE USING (
        author_id = auth.uid()::varchar OR
        EXISTS (
            SELECT 1 FROM public.community_posts p
            JOIN public.communities c ON c.id = p.community_id
            JOIN public.organizers o ON o.id = c.organizer_id
            WHERE p.id = community_comments.post_id
            AND o.user_id = auth.uid()::varchar
        )
    );

-- Chat messages: Members only based on chat_mode
DROP POLICY IF EXISTS "Members can view chat" ON public.community_chat_messages;
CREATE POLICY "Members can view chat" ON public.community_chat_messages
    FOR SELECT USING (
        NOT is_deleted AND
        EXISTS (
            SELECT 1 FROM public.community_memberships m
            WHERE m.community_id = community_chat_messages.community_id
            AND m.user_id = auth.uid()::varchar
            AND m.status = 'member'
        )
    );

DROP POLICY IF EXISTS "Chat access based on mode" ON public.community_chat_messages;
CREATE POLICY "Chat access based on mode" ON public.community_chat_messages
    FOR INSERT WITH CHECK (
        author_id = auth.uid()::varchar AND
        EXISTS (
            SELECT 1 FROM public.communities c
            JOIN public.community_memberships m ON m.community_id = c.id
            WHERE c.id = community_chat_messages.community_id
            AND m.user_id = auth.uid()::varchar
            AND m.status = 'member'
            AND (
                c.chat_mode = 'open_to_members' OR
                (c.chat_mode = 'owner_only' AND EXISTS (
                    SELECT 1 FROM public.organizers o
                    WHERE o.id = c.organizer_id
                    AND o.user_id = auth.uid()::varchar
                ))
            )
        )
    );

-- Notifications: Users see their own
DROP POLICY IF EXISTS "Users view own notifications" ON public.community_notifications;
CREATE POLICY "Users view own notifications" ON public.community_notifications
    FOR ALL USING (user_id = auth.uid()::varchar);

-- Analytics: Owners only
DROP POLICY IF EXISTS "Owners view analytics" ON public.community_analytics;
CREATE POLICY "Owners view analytics" ON public.community_analytics
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.communities c
            JOIN public.organizers o ON o.id = c.organizer_id
            WHERE c.id = community_analytics.community_id
            AND o.user_id = auth.uid()::varchar
        )
    );

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

COMMENT ON SCHEMA public IS 'Safe migration for enhanced Communities Platform';