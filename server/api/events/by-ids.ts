import type { Request, Response } from 'express';
import { supabase } from '../../db';

export async function GET(req: Request, res: Response) {
  try {
    const { ids } = req.query;
    
    if (!ids || typeof ids !== 'string') {
      return res.status(400).json({ error: 'Missing ids parameter' });
    }
    
    const idArray = ids.split(',').filter(id => id.trim());
    
    if (idArray.length === 0) {
      return res.json([]);
    }
    
    // Fetch events by IDs regardless of date/status
    const { data, error } = await supabase
      .from('community_events')
      .select('*')
      .in('id', idArray)
      .order('start_at', { ascending: true, nullsFirst: false });
    
    if (error) {
      console.error('Error fetching events by IDs:', error);
      return res.status(500).json({ error: 'Failed to fetch events' });
    }
    
    res.json(data || []);
  } catch (error) {
    console.error('Error in events by-ids endpoint:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}