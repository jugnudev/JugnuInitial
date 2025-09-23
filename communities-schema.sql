-- Communities Database Schema for Supabase
-- Run this SQL in Supabase SQL Editor to create the Communities tables
-- All tables are prefixed with 'community_' to avoid conflicts with existing features

-- Main user accounts for Communities (separate from existing users table)
CREATE TABLE IF NOT EXISTS public.community_users (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    email text NOT NULL UNIQUE,
    first_name text,
    last_name text,
    profile_image_url text,
    bio text,
    location text,
    website text,
    social_instagram text,
    social_twitter text,
    social_linkedin text,
    email_verified boolean NOT NULL DEFAULT false,
    status text NOT NULL DEFAULT 'active', -- active | suspended | pending_verification
    role text NOT NULL DEFAULT 'user', -- user | organizer | admin
    -- Preferences
    email_notifications boolean NOT NULL DEFAULT true,
    marketing_emails boolean NOT NULL DEFAULT false
);

-- Email-based authentication codes for passwordless login
CREATE TABLE IF NOT EXISTS public.community_auth_codes (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at timestamptz NOT NULL DEFAULT now(),
    user_id uuid REFERENCES public.community_users(id) ON DELETE CASCADE,
    email text NOT NULL,
    code text NOT NULL, -- 6-digit verification code
    purpose text NOT NULL DEFAULT 'login', -- login | signup | password_reset
    expires_at timestamptz NOT NULL DEFAULT (now() + interval '10 minutes'),
    used_at timestamptz,
    attempts integer NOT NULL DEFAULT 0,
    max_attempts integer NOT NULL DEFAULT 5
);

-- Organizer applications (before approval)
CREATE TABLE IF NOT EXISTS public.community_organizer_applications (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    user_id uuid NOT NULL REFERENCES public.community_users(id) ON DELETE CASCADE,
    -- Application Details
    business_name text NOT NULL,
    business_website text,
    business_description text NOT NULL,
    business_type text NOT NULL, -- event_organizer | venue | artist | promoter | other
    years_experience integer,
    sample_events text, -- Previous events or portfolio
    social_media_handles jsonb DEFAULT '{}', -- {instagram: "", facebook: "", etc}
    -- Contact Info
    business_email text NOT NULL,
    business_phone text,
    business_address text,
    -- Application Status
    status text NOT NULL DEFAULT 'pending', -- pending | approved | rejected | under_review
    reviewed_by uuid REFERENCES public.community_users(id),
    reviewed_at timestamptz,
    rejection_reason text,
    admin_notes text
);

-- Approved Community organizers (separate from tickets_organizers)
CREATE TABLE IF NOT EXISTS public.community_organizers (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    user_id uuid NOT NULL REFERENCES public.community_users(id) ON DELETE CASCADE,
    application_id uuid REFERENCES public.community_organizer_applications(id),
    -- Business Details
    business_name text NOT NULL,
    business_website text,
    business_description text,
    business_type text NOT NULL,
    verified boolean NOT NULL DEFAULT false,
    -- Status
    status text NOT NULL DEFAULT 'active', -- active | suspended | inactive
    approved_by uuid REFERENCES public.community_users(id),
    approved_at timestamptz NOT NULL DEFAULT now()
);

-- User sessions for Communities auth
CREATE TABLE IF NOT EXISTS public.community_user_sessions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at timestamptz NOT NULL DEFAULT now(),
    user_id uuid NOT NULL REFERENCES public.community_users(id) ON DELETE CASCADE,
    token text NOT NULL UNIQUE,
    expires_at timestamptz NOT NULL DEFAULT (now() + interval '30 days'),
    last_used_at timestamptz NOT NULL DEFAULT now(),
    ip_address text,
    user_agent text,
    is_active boolean NOT NULL DEFAULT true
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS community_users_email_idx ON public.community_users (email);
CREATE INDEX IF NOT EXISTS community_users_status_idx ON public.community_users (status);
CREATE INDEX IF NOT EXISTS community_auth_codes_email_idx ON public.community_auth_codes (email);
CREATE INDEX IF NOT EXISTS community_auth_codes_code_idx ON public.community_auth_codes (code);
CREATE INDEX IF NOT EXISTS community_auth_codes_expires_idx ON public.community_auth_codes (expires_at);
CREATE INDEX IF NOT EXISTS community_organizer_applications_status_idx ON public.community_organizer_applications (status);
CREATE INDEX IF NOT EXISTS community_organizer_applications_user_idx ON public.community_organizer_applications (user_id);
CREATE INDEX IF NOT EXISTS community_organizers_user_idx ON public.community_organizers (user_id);
CREATE INDEX IF NOT EXISTS community_organizers_status_idx ON public.community_organizers (status);
CREATE INDEX IF NOT EXISTS community_user_sessions_token_idx ON public.community_user_sessions (token);
CREATE INDEX IF NOT EXISTS community_user_sessions_user_idx ON public.community_user_sessions (user_id);

-- Enable Row Level Security (RLS)
ALTER TABLE public.community_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_auth_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_organizer_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_organizers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_user_sessions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for community_users
CREATE POLICY "Users can view their own profile" ON public.community_users
    FOR SELECT USING (auth.uid()::text = id::text OR role = 'admin');

CREATE POLICY "Users can update their own profile" ON public.community_users
    FOR UPDATE USING (auth.uid()::text = id::text);

CREATE POLICY "Anyone can create a user account" ON public.community_users
    FOR INSERT WITH CHECK (true);

-- RLS Policies for community_auth_codes  
CREATE POLICY "Users can view their own auth codes" ON public.community_auth_codes
    FOR SELECT USING (auth.uid()::text = user_id::text);

CREATE POLICY "Anyone can create auth codes" ON public.community_auth_codes
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update their own auth codes" ON public.community_auth_codes
    FOR UPDATE USING (auth.uid()::text = user_id::text);

-- RLS Policies for community_organizer_applications
CREATE POLICY "Users can view their own applications" ON public.community_organizer_applications
    FOR SELECT USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can create their own applications" ON public.community_organizer_applications
    FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);

CREATE POLICY "Users can update their own pending applications" ON public.community_organizer_applications
    FOR UPDATE USING (auth.uid()::text = user_id::text AND status = 'pending');

CREATE POLICY "Admins can view all applications" ON public.community_organizer_applications
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.community_users 
            WHERE id::text = auth.uid()::text AND role = 'admin'
        )
    );

CREATE POLICY "Admins can update application status" ON public.community_organizer_applications
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.community_users 
            WHERE id::text = auth.uid()::text AND role = 'admin'
        )
    );

-- RLS Policies for community_organizers
CREATE POLICY "Users can view their own organizer profile" ON public.community_organizers
    FOR SELECT USING (auth.uid()::text = user_id::text);

CREATE POLICY "Admins can view all organizers" ON public.community_organizers
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.community_users 
            WHERE id::text = auth.uid()::text AND role = 'admin'
        )
    );

CREATE POLICY "Admins can create organizers" ON public.community_organizers
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.community_users 
            WHERE id::text = auth.uid()::text AND role = 'admin'
        )
    );

CREATE POLICY "Admins can update organizers" ON public.community_organizers
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.community_users 
            WHERE id::text = auth.uid()::text AND role = 'admin'
        )
    );

-- RLS Policies for community_user_sessions
CREATE POLICY "Users can view their own sessions" ON public.community_user_sessions
    FOR SELECT USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can create their own sessions" ON public.community_user_sessions
    FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);

CREATE POLICY "Users can update their own sessions" ON public.community_user_sessions
    FOR UPDATE USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can delete their own sessions" ON public.community_user_sessions
    FOR DELETE USING (auth.uid()::text = user_id::text);

-- Functions for automated cleanup
CREATE OR REPLACE FUNCTION cleanup_expired_auth_codes()
RETURNS void AS $$
BEGIN
    DELETE FROM public.community_auth_codes 
    WHERE expires_at < now() - interval '1 hour';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS void AS $$
BEGIN
    DELETE FROM public.community_user_sessions 
    WHERE expires_at < now() OR last_used_at < now() - interval '90 days';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create automated cleanup schedules (requires pg_cron extension)
-- Note: Enable pg_cron extension in Supabase dashboard first
-- SELECT cron.schedule('cleanup-auth-codes', '0 */6 * * *', 'SELECT cleanup_expired_auth_codes()');
-- SELECT cron.schedule('cleanup-sessions', '0 2 * * *', 'SELECT cleanup_expired_sessions()');

COMMENT ON TABLE public.community_users IS 'Main user accounts for Communities feature';
COMMENT ON TABLE public.community_auth_codes IS 'Email verification codes for passwordless authentication';
COMMENT ON TABLE public.community_organizer_applications IS 'Pending organizer applications awaiting admin approval';
COMMENT ON TABLE public.community_organizers IS 'Approved organizers for Communities (separate from ticketing)';
COMMENT ON TABLE public.community_user_sessions IS 'Active user sessions for Communities auth';