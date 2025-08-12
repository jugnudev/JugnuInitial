-- Create Places table for the South Asian directory
CREATE TABLE IF NOT EXISTS places (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  name text NOT NULL,
  type text NOT NULL,
  description text,
  neighborhood text,
  address text,
  city text NOT NULL DEFAULT 'Vancouver, BC',
  lat double precision,
  lng double precision,
  phone text,
  website_url text,
  booking_url text,
  delivery_urls jsonb,
  instagram text,
  price_level int,
  tags text[],
  image_url text,
  gallery jsonb,
  source_url text,
  featured boolean NOT NULL DEFAULT false,
  sponsored boolean NOT NULL DEFAULT false,
  sponsored_until timestamptz,
  status text NOT NULL DEFAULT 'active'
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_places_type ON places (type);
CREATE INDEX IF NOT EXISTS idx_places_featured ON places (featured);
CREATE INDEX IF NOT EXISTS idx_places_neighborhood ON places (neighborhood);
CREATE INDEX IF NOT EXISTS idx_places_status ON places (status);
CREATE INDEX IF NOT EXISTS idx_places_city ON places (city);

-- Create RLS policy (Row Level Security)
ALTER TABLE places ENABLE ROW LEVEL SECURITY;

-- Allow public to read active places
CREATE POLICY "Allow public read access to active places" ON places
  FOR SELECT
  TO public
  USING (status = 'active');

-- Sample data for testing
INSERT INTO places (
  name, type, neighborhood, address, website_url, description, 
  image_url, tags, price_level, featured, status
) VALUES 
(
  'Vij''s Restaurant',
  'restaurant',
  'Kitsilano',
  '3106 Cambie St, Vancouver, BC',
  'https://vijsrestaurant.ca',
  'Award-winning Indian cuisine featuring innovative dishes and bold flavors. Known for creative cocktails and exceptional service in an elegant atmosphere.',
  'https://images.squarespace-cdn.com/content/v1/5d9c4e4a0b2fe500015df5e5/1570502956849-7XH8QTU5AUHF8ZXV3VGH/Vijs-Restaurant-Vancouver-1.jpg',
  ARRAY['fine-dining', 'indian', 'cocktails', 'award-winning'],
  3,
  true,
  'active'
),
(
  'Rangoli',
  'restaurant',
  'Kitsilano',  
  '3302 Cambie St, Vancouver, BC',
  'https://rangoli.ca',
  'Casual Indian eatery with vibrant decor offering traditional dishes, street food, and vegetarian options in a lively setting.',
  'https://media-cdn.tripadvisor.com/media/photo-s/0b/9d/7a/4c/rangoli.jpg',
  ARRAY['casual-dining', 'indian', 'vegetarian', 'street-food'],
  2,
  false,
  'active'
),
(
  'Indian Oven',
  'restaurant',
  'Downtown',
  '518 W Hastings St, Vancouver, BC',
  'https://indianoven.ca',
  'Traditional Indian restaurant serving authentic curries, tandoori dishes, and fresh naan bread in the heart of downtown.',
  'https://indianoven.ca/wp-content/uploads/2019/03/indian-oven-restaurant-vancouver.jpg',
  ARRAY['traditional', 'indian', 'tandoori', 'curry'],
  2,
  false,
  'active'
),
(
  'Himalayan Spice Kitchen',
  'restaurant',
  'Surrey',
  '8128 128 St, Surrey, BC',
  'https://himalayanspicekitchen.com',
  'Authentic Nepalese and Indian cuisine with aromatic spices and traditional cooking methods. Family-owned restaurant serving the community for over a decade.',
  '',
  ARRAY['nepalese', 'indian', 'traditional', 'family-owned'],
  2,
  false,
  'active'
),
(
  'Bombay Chowpatty',
  'restaurant',
  'Richmond',
  '5489 Kingsway, Burnaby, BC',
  '',
  'Popular spot for authentic Mumbai street food including pav bhaji, bhel puri, and dosa. Casual atmosphere with quick service.',
  '',
  ARRAY['street-food', 'mumbai', 'vegetarian', 'casual'],
  1,
  false,
  'active'
)
ON CONFLICT DO NOTHING;