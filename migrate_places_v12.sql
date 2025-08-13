-- Places Sync v1.2 Database Migration
-- Add columns for country, photo handling, and indexing

-- Add new columns
ALTER TABLE public.places 
ADD COLUMN IF NOT EXISTS country text,
ADD COLUMN IF NOT EXISTS google_photo_ref text,
ADD COLUMN IF NOT EXISTS photo_source text; -- 'yelp' | 'google' | null

-- Create indices for performance
CREATE INDEX IF NOT EXISTS idx_places_city ON public.places(city);
CREATE INDEX IF NOT EXISTS idx_places_country ON public.places(country);
CREATE INDEX IF NOT EXISTS idx_places_coordinates ON public.places(lat, lng);
CREATE INDEX IF NOT EXISTS idx_places_business_status ON public.places(business_status);

-- Add comments for documentation
COMMENT ON COLUMN public.places.country IS 'Country code (CA for Canada)';
COMMENT ON COLUMN public.places.google_photo_ref IS 'Google Places photo reference for API';
COMMENT ON COLUMN public.places.photo_source IS 'Source of the primary photo: yelp, google, or null';