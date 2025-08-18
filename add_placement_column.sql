-- Add placement column to sponsor_leads table
ALTER TABLE sponsor_leads ADD COLUMN IF NOT EXISTS placement TEXT;

-- Update existing records with placement based on package_code
UPDATE sponsor_leads 
SET placement = CASE 
  WHEN package_code = 'events_spotlight' THEN 'events_banner'
  WHEN package_code = 'homepage_feature' THEN 'home_hero'
  WHEN package_code = 'full_feature' THEN 'full_feature'
  ELSE package_code
END
WHERE placement IS NULL;

-- Make placement non-null after updating existing records
ALTER TABLE sponsor_leads ALTER COLUMN placement SET NOT NULL;