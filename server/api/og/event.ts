import type { Request, Response } from 'express';
import { supabase } from '../../db';

export async function GET(req: Request, res: Response) {
  try {
    const { id } = req.query;
    
    if (!id || typeof id !== 'string') {
      return res.status(400).json({ error: 'Missing event id parameter' });
    }
    
    // Fetch event data
    const { data: event, error } = await supabase
      .from('community_events')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error || !event) {
      return res.status(404).json({ error: 'Event not found' });
    }
    
    // For now, return a simple Open Graph image URL placeholder
    // In a production environment, you would generate the actual image using @vercel/og or satori+resvg
    const ogImageUrl = generateOGImageUrl('event', {
      title: event.title,
      subtitle: `${event.venue || 'TBA'} • Vancouver`,
      date: event.start_at,
      isAllDay: event.is_all_day
    });
    
    // Return a redirect to the generated OG image
    res.redirect(302, ogImageUrl);
  } catch (error) {
    console.error('Error generating event OG image:', error);
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