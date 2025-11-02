# Email Queue Table Setup

The email notification system requires the `community_email_queue` table in Supabase with the `scheduled_for` column for digest scheduling.

## SQL to Run in Supabase

Run this SQL in your Supabase SQL editor to add the missing column:

```sql
-- Add scheduled_for column to community_email_queue table
ALTER TABLE community_email_queue 
ADD COLUMN IF NOT EXISTS scheduled_for TIMESTAMPTZ;

-- Add index for efficient scheduled email queries
CREATE INDEX IF NOT EXISTS idx_email_queue_scheduled 
ON community_email_queue(status, scheduled_for);
```

## Verify the Setup

After running the SQL, verify the table has all required columns:

```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'community_email_queue' 
ORDER BY ordinal_position;
```

Expected columns:
- id (uuid)
- created_at (timestamp with time zone)
- recipient_email (text)
- recipient_name (text)
- community_id (uuid)
- template_id (text)
- subject (text)
- variables (jsonb)
- status (text) - 'pending' | 'sent' | 'failed'
- sent_at (timestamp with time zone)
- failed_at (timestamp with time zone)
- error_message (text)
- retry_count (integer)
- **scheduled_for (timestamp with time zone)** ← This was missing

## How the Email System Works

1. **Immediate emails**: Sent right away when a notification is created
2. **Daily digest**: Scheduled emails sent at the user's preferred time (e.g., 3:47 PM in their timezone)
3. **Weekly digest**: Sent weekly at the user's preferred time
4. **Email worker**: Runs every minute to process queued emails and check for scheduled digests

The `scheduled_for` column allows the system to queue emails for future delivery based on user digest preferences.
