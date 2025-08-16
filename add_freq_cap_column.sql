-- Add freq_cap_per_user_per_day column to sponsor_campaigns
ALTER TABLE sponsor_campaigns 
ADD COLUMN IF NOT EXISTS freq_cap_per_user_per_day INTEGER NOT NULL DEFAULT 0;

-- Verify the column was added
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'sponsor_campaigns' 
AND column_name = 'freq_cap_per_user_per_day';
