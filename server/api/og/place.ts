import type { Request, Response } from 'express';
import { db as supabase } from '../../database';

export async function GET(req: Request, res: Response) {
  try {
    const { id } = req.query;
    
    if (!id || typeof id !== 'string') {
      return res.status(400).json({ error: 'Missing place id parameter' });
    }
    
    // Fetch place data
    const { data: place, error } = await supabase
      .from('places')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error || !place) {
      return res.status(404).json({ error: 'Place not found' });
    }
    
    // For now, return a simple Open Graph image URL placeholder
    // In a production environment, you would generate the actual image using @vercel/og or satori+resvg
    const ogImageUrl = generateOGImageUrl('place', {
      title: place.name,
      subtitle: `${place.neighborhood || place.type} • Vancouver`,
      type: place.type,
      priceLevel: place.price_level
    });
    
    // Return a redirect to the generated OG image
    res.redirect(302, ogImageUrl);
  } catch (error) {
    console.error('Error generating place OG image:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// Placeholder OG image generator - in production, this would use actual image generation
function generateOGImageUrl(type: 'event' | 'place', data: any): string {
  // For demo purposes, return a placeholder image URL
  // In production, you would generate a proper OG image with:
  // - Dark background
  // - Jugnu firefly logo
  // - Large title (2 lines max)
  // - Subline (venue • city or neighborhood • city)
  // - Date badge (events) or type/price (places)
  // - Size 1200x630
  
  const baseUrl = process.env.NODE_ENV === 'production' 
    ? 'https://your-domain.com' 
    : 'http://localhost:5000';
    
  // Return a generated OG image URL - for now, a placeholder
  return `${baseUrl}/api/og/generate?type=${type}&title=${encodeURIComponent(data.title)}&subtitle=${encodeURIComponent(data.subtitle)}`;
}