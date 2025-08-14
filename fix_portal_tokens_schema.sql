-- Fix sponsor_portal_tokens table schema
-- Add missing columns if they don't exist

-- Check if we need to add the id column
ALTER TABLE sponsor_portal_tokens 
ADD COLUMN IF NOT EXISTS id UUID PRIMARY KEY DEFAULT gen_random_uuid();

-- Add missing columns
ALTER TABLE sponsor_portal_tokens 
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

ALTER TABLE sponsor_portal_tokens 
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS sponsor_portal_tokens_token_idx ON sponsor_portal_tokens (token);
CREATE INDEX IF NOT EXISTS sponsor_portal_tokens_campaign_id_idx ON sponsor_portal_tokens (campaign_id);
CREATE INDEX IF NOT EXISTS sponsor_portal_tokens_expires_at_idx ON sponsor_portal_tokens (expires_at);

-- Check table structure
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'sponsor_portal_tokens' 
ORDER BY ordinal_position;