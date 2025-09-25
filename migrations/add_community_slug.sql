-- Add slug field to communities table
-- This SQL can be pasted directly into Supabase SQL Editor

-- Add slug column to communities table
ALTER TABLE communities 
ADD COLUMN slug text UNIQUE;

-- Create function to generate slug from name
CREATE OR REPLACE FUNCTION generate_slug(name text) 
RETURNS text AS $$
BEGIN
  RETURN lower(
    regexp_replace(
      regexp_replace(
        trim(name), 
        '[^a-zA-Z0-9\s-]', '', 'g'
      ), 
      '\s+', '-', 'g'
    )
  );
END;
$$ LANGUAGE plpgsql;

-- Update existing communities with slugs based on their names
UPDATE communities 
SET slug = generate_slug(name) || '-' || substring(id::text, 1, 8)
WHERE slug IS NULL;

-- Make slug NOT NULL after populating existing data
ALTER TABLE communities 
ALTER COLUMN slug SET NOT NULL;

-- Add index for better performance
CREATE INDEX IF NOT EXISTS idx_communities_slug ON communities(slug);

-- Drop the helper function
DROP FUNCTION generate_slug(name text);