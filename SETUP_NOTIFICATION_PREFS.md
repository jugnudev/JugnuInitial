# Setup Notification Preferences Table

The notification preferences feature requires a table in Supabase that needs to be created manually.

## Steps to Setup

1. **Open your Supabase Dashboard**: Go to your project's SQL Editor

2. **Run this SQL**:

```sql
-- Create notification preferences table
CREATE TABLE IF NOT EXISTS public.community_notification_preferences (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    user_id text NOT NULL,
    community_id uuid,
    
    -- Channel preferences
    in_app_enabled boolean NOT NULL DEFAULT true,
    email_enabled boolean NOT NULL DEFAULT true,
    push_enabled boolean NOT NULL DEFAULT false,
    
    -- Notification type preferences
    new_posts boolean NOT NULL DEFAULT true,
    post_comments boolean NOT NULL DEFAULT true,
    comment_replies boolean NOT NULL DEFAULT true,
    mentions boolean NOT NULL DEFAULT true,
    poll_results boolean NOT NULL DEFAULT true,
    membership_updates boolean NOT NULL DEFAULT true,
    community_announcements boolean NOT NULL DEFAULT true,
    new_deals boolean NOT NULL DEFAULT true,
    
    -- Email frequency settings
    email_frequency text NOT NULL DEFAULT 'immediate' CHECK (email_frequency IN ('immediate', 'daily', 'weekly')),
    email_digest_time text DEFAULT '09:00',
    email_digest_timezone text DEFAULT 'America/Vancouver',
    
    -- Quiet hours
    quiet_hours_enabled boolean NOT NULL DEFAULT false,
    quiet_hours_start text DEFAULT '22:00',
    quiet_hours_end text DEFAULT '08:00',
    
    -- Last digest sent timestamp
    last_digest_sent_at timestamptz,
    
    -- Unique constraint: one preference row per user per community (null community = global)
    UNIQUE(user_id, community_id)
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_notification_prefs_user ON public.community_notification_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_prefs_community ON public.community_notification_preferences(community_id);
```

3. **Verify** the table was created by running:

```sql
SELECT * FROM public.community_notification_preferences LIMIT 1;
```

## Important Notes

- **No RLS needed**: Authentication is handled by the API layer using `community_auth_token`
- **Auto-refresh**: PostgREST will detect the new table within a few minutes
- **Test**: After running the SQL, the notification preferences UI in Settings will work

## Feature Location

Once set up, users can access notification preferences at:
- Navigate to **Account** → **Settings** tab
- Click the **Schedule** tab in Notification Preferences
- Configure email frequency (immediate/daily/weekly), digest time, and timezone

The table is already defined in `communities-schema.sql` (lines 232-296) for future reference.
