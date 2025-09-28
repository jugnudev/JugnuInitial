/**
 * Invite Links System for Communities
 * Manages invite codes, tracking, and referrals
 */

import { nanoid } from 'nanoid';
import { createClient } from '@supabase/supabase-js';

const getSupabaseAdmin = () => {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Missing Supabase environment variables');
  }
  
  return createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
};

export interface InviteLink {
  id: string;
  communityId: string;
  code: string;
  createdBy: string;
  expiresAt?: string;
  maxUses?: number;
  currentUses: number;
  status: 'active' | 'expired' | 'exhausted';
  createdAt: string;
}

export interface Referral {
  id: string;
  communityId: string;
  referrerId: string;
  referredUserId: string;
  inviteCode?: string;
  joinedAt: string;
  status: 'pending' | 'active' | 'churned';
}

export class InviteSystem {
  private client = getSupabaseAdmin();

  /**
   * Generate a new invite link for a community
   */
  async createInviteLink(
    communityId: string,
    createdBy: string,
    options?: {
      expiresInDays?: number;
      maxUses?: number;
      customCode?: string;
    }
  ): Promise<InviteLink> {
    try {
      // Generate invite code (8 characters)
      const code = options?.customCode || nanoid(8).toUpperCase();
      
      // Calculate expiration date if specified
      let expiresAt = null;
      if (options?.expiresInDays) {
        expiresAt = new Date(Date.now() + options.expiresInDays * 24 * 60 * 60 * 1000).toISOString();
      }

      // Insert invite link
      const { data, error } = await this.client
        .from('community_invite_links')
        .insert({
          community_id: communityId,
          code,
          created_by: createdBy,
          expires_at: expiresAt,
          max_uses: options?.maxUses || null,
          current_uses: 0,
          status: 'active'
        })
        .select()
        .single();

      if (error) throw error;

      return {
        id: data.id,
        communityId: data.community_id,
        code: data.code,
        createdBy: data.created_by,
        expiresAt: data.expires_at,
        maxUses: data.max_uses,
        currentUses: data.current_uses,
        status: data.status,
        createdAt: data.created_at
      };
    } catch (error) {
      console.error('[InviteSystem] Error creating invite link:', error);
      throw error;
    }
  }

  /**
   * Get invite link by code
   */
  async getInviteByCode(code: string): Promise<InviteLink | null> {
    try {
      const { data, error } = await this.client
        .from('community_invite_links')
        .select(`
          *,
          community:communities(id, name, description, image_url, is_private)
        `)
        .eq('code', code.toUpperCase())
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      if (!data) return null;

      // Check if expired
      if (data.expires_at && new Date(data.expires_at) < new Date()) {
        // Mark as expired
        await this.client
          .from('community_invite_links')
          .update({ status: 'expired' })
          .eq('id', data.id);
        
        data.status = 'expired';
      }

      // Check if exhausted
      if (data.max_uses && data.current_uses >= data.max_uses) {
        // Mark as exhausted
        await this.client
          .from('community_invite_links')
          .update({ status: 'exhausted' })
          .eq('id', data.id);
        
        data.status = 'exhausted';
      }

      return {
        id: data.id,
        communityId: data.community_id,
        code: data.code,
        createdBy: data.created_by,
        expiresAt: data.expires_at,
        maxUses: data.max_uses,
        currentUses: data.current_uses,
        status: data.status,
        createdAt: data.created_at,
        community: data.community
      } as any;
    } catch (error) {
      console.error('[InviteSystem] Error getting invite:', error);
      return null;
    }
  }

  /**
   * Use an invite link
   */
  async useInvite(code: string, userId: string): Promise<{ success: boolean; error?: string; communityId?: string }> {
    try {
      // Get the invite
      const invite = await this.getInviteByCode(code);
      
      if (!invite) {
        return { success: false, error: 'Invalid invite code' };
      }

      if (invite.status === 'expired') {
        return { success: false, error: 'This invite link has expired' };
      }

      if (invite.status === 'exhausted') {
        return { success: false, error: 'This invite link has reached its usage limit' };
      }

      // Check if user is already a member
      const { data: existingMembership } = await this.client
        .from('community_memberships')
        .select('id')
        .eq('community_id', invite.communityId)
        .eq('user_id', userId)
        .single();

      if (existingMembership) {
        return { success: false, error: 'You are already a member of this community' };
      }

      // Use transaction-like behavior
      // 1. Increment usage count
      const { error: updateError } = await this.client
        .from('community_invite_links')
        .update({ 
          current_uses: invite.currentUses + 1,
          status: invite.maxUses && (invite.currentUses + 1) >= invite.maxUses ? 'exhausted' : 'active'
        })
        .eq('id', invite.id);

      if (updateError) throw updateError;

      // 2. Track the invite usage
      const { error: usageError } = await this.client
        .from('community_invite_usage')
        .insert({
          invite_id: invite.id,
          community_id: invite.communityId,
          used_by: userId,
          referrer_id: invite.createdBy,
          invite_code: code
        });

      if (usageError) {
        console.error('[InviteSystem] Error tracking usage:', usageError);
      }

      // 3. Create referral record
      await this.createReferral(invite.communityId, invite.createdBy, userId, code);

      return { success: true, communityId: invite.communityId };
    } catch (error) {
      console.error('[InviteSystem] Error using invite:', error);
      return { success: false, error: 'Failed to use invite link' };
    }
  }

  /**
   * Create a referral record
   */
  async createReferral(
    communityId: string,
    referrerId: string,
    referredUserId: string,
    inviteCode?: string
  ): Promise<void> {
    try {
      await this.client
        .from('community_referrals')
        .insert({
          community_id: communityId,
          referrer_id: referrerId,
          referred_user_id: referredUserId,
          invite_code: inviteCode,
          status: 'active'
        });
    } catch (error) {
      console.error('[InviteSystem] Error creating referral:', error);
    }
  }

  /**
   * Get referral statistics for a user
   */
  async getReferralStats(userId: string, communityId?: string): Promise<{
    totalReferrals: number;
    activeReferrals: number;
    topCommunities: Array<{ communityId: string; communityName: string; count: number }>;
    recentReferrals: Array<{ userId: string; userName: string; joinedAt: string }>;
  }> {
    try {
      // Build query
      let query = this.client
        .from('community_referrals')
        .select(`
          *,
          community:communities(id, name),
          referred_user:users(id, first_name, last_name),
          status,
          joined_at
        `)
        .eq('referrer_id', userId);

      if (communityId) {
        query = query.eq('community_id', communityId);
      }

      const { data, error } = await query;

      if (error) throw error;

      const referrals = data || [];
      const totalReferrals = referrals.length;
      const activeReferrals = referrals.filter(r => r.status === 'active').length;

      // Calculate top communities
      const communityMap = new Map<string, { name: string; count: number }>();
      for (const referral of referrals) {
        const key = referral.community.id;
        const existing = communityMap.get(key) || { name: referral.community.name, count: 0 };
        existing.count++;
        communityMap.set(key, existing);
      }

      const topCommunities = Array.from(communityMap.entries())
        .map(([id, data]) => ({ communityId: id, communityName: data.name, count: data.count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      // Get recent referrals
      const recentReferrals = referrals
        .sort((a, b) => new Date(b.joined_at).getTime() - new Date(a.joined_at).getTime())
        .slice(0, 10)
        .map(r => ({
          userId: r.referred_user.id,
          userName: `${r.referred_user.first_name} ${r.referred_user.last_name}`.trim(),
          joinedAt: r.joined_at
        }));

      return {
        totalReferrals,
        activeReferrals,
        topCommunities,
        recentReferrals
      };
    } catch (error) {
      console.error('[InviteSystem] Error getting referral stats:', error);
      return {
        totalReferrals: 0,
        activeReferrals: 0,
        topCommunities: [],
        recentReferrals: []
      };
    }
  }

  /**
   * Get all invite links for a community
   */
  async getCommunityInvites(communityId: string): Promise<InviteLink[]> {
    try {
      const { data, error } = await this.client
        .from('community_invite_links')
        .select(`
          *,
          creator:users(id, first_name, last_name)
        `)
        .eq('community_id', communityId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return (data || []).map(d => ({
        id: d.id,
        communityId: d.community_id,
        code: d.code,
        createdBy: d.created_by,
        expiresAt: d.expires_at,
        maxUses: d.max_uses,
        currentUses: d.current_uses,
        status: d.status,
        createdAt: d.created_at,
        creator: d.creator
      }));
    } catch (error) {
      console.error('[InviteSystem] Error getting community invites:', error);
      return [];
    }
  }

  /**
   * Revoke an invite link
   */
  async revokeInvite(inviteId: string, userId: string): Promise<boolean> {
    try {
      const { error } = await this.client
        .from('community_invite_links')
        .update({ status: 'expired' })
        .eq('id', inviteId)
        .eq('created_by', userId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('[InviteSystem] Error revoking invite:', error);
      return false;
    }
  }

  /**
   * Get referral leaderboard for a community
   */
  async getReferralLeaderboard(communityId: string, limit: number = 10): Promise<Array<{
    userId: string;
    userName: string;
    referralCount: number;
    rank: number;
  }>> {
    try {
      const { data, error } = await this.client
        .rpc('get_referral_leaderboard', {
          p_community_id: communityId,
          p_limit: limit
        });

      if (error) throw error;

      return (data || []).map((item: any, index: number) => ({
        userId: item.referrer_id,
        userName: item.referrer_name,
        referralCount: item.referral_count,
        rank: index + 1
      }));
    } catch (error) {
      console.error('[InviteSystem] Error getting leaderboard:', error);
      return [];
    }
  }
}

export const inviteSystem = new InviteSystem();