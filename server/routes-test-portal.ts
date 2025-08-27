import { Request, Response } from 'express';
import { getSupabaseAdmin } from './supabaseAdmin';

export function setupTestPortalRoutes(app: any) {
  // Test endpoint to check portal token creation and retrieval
  app.get('/api/test/portal/:campaignId', async (req: Request, res: Response) => {
    try {
      const { campaignId } = req.params;
      const supabase = getSupabaseAdmin();
      
      // Check if campaign exists
      const { data: campaign, error: campaignError } = await supabase
        .from('sponsor_campaigns')
        .select('id, name, sponsor_name')
        .eq('id', campaignId)
        .single();
      
      if (campaignError || !campaign) {
        return res.status(404).json({ 
          ok: false, 
          error: 'Campaign not found',
          campaignId 
        });
      }
      
      // Check for existing portal tokens
      const { data: existingTokens, error: fetchError } = await supabase
        .from('sponsor_portal_tokens')
        .select('id, campaign_id, expires_at, is_active, created_at')
        .eq('campaign_id', campaignId)
        .order('created_at', { ascending: false })
        .limit(5);
      
      if (fetchError) {
        return res.status(500).json({ 
          ok: false, 
          error: 'Failed to fetch tokens',
          details: fetchError 
        });
      }
      
      // Create a test portal token
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 90);
      
      const { data: newToken, error: createError } = await supabase
        .from('sponsor_portal_tokens')
        .insert({
          campaign_id: campaignId,
          expires_at: expiresAt.toISOString(),
          is_active: true,
        })
        .select('id, campaign_id, expires_at')
        .single();
      
      if (createError) {
        return res.json({
          ok: false,
          error: 'Failed to create test token',
          details: createError,
          existingTokens,
          campaign
        });
      }
      
      const portalLink = `https://thehouseofjugnu.com/sponsor/${newToken.id}`;
      
      res.json({
        ok: true,
        message: 'Test portal token created',
        campaign,
        newToken,
        portalLink,
        existingTokens,
        totalExisting: existingTokens?.length || 0
      });
      
    } catch (error) {
      console.error('Test portal error:', error);
      res.status(500).json({ 
        ok: false, 
        error: 'Internal server error',
        details: error 
      });
    }
  });
  
  // Test endpoint to verify portal token access
  app.get('/api/test/verify-portal/:tokenId', async (req: Request, res: Response) => {
    try {
      const { tokenId } = req.params;
      const supabase = getSupabaseAdmin();
      
      // Try to fetch the token
      const { data: token, error } = await supabase
        .from('sponsor_portal_tokens')
        .select(`
          *,
          sponsor_campaigns (
            id,
            name,
            sponsor_name
          )
        `)
        .eq('id', tokenId)
        .single();
      
      if (error || !token) {
        return res.json({
          ok: false,
          error: 'Token not found',
          tokenId,
          details: error
        });
      }
      
      res.json({
        ok: true,
        message: 'Token found successfully',
        token: {
          id: token.id,
          campaign_id: token.campaign_id,
          expires_at: token.expires_at,
          is_active: token.is_active,
          created_at: token.created_at
        },
        campaign: token.sponsor_campaigns
      });
      
    } catch (error) {
      console.error('Verify portal error:', error);
      res.status(500).json({ 
        ok: false, 
        error: 'Internal server error',
        details: error 
      });
    }
  });
}