/**
 * Background cleanup jobs for Communities data maintenance
 * Runs periodic tasks to keep the database clean and optimized
 */

import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const getSupabaseAdmin = () => {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Missing Supabase environment variables');
  }
  
  return createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
};

export class CleanupJobs {
  private client = getSupabaseAdmin();
  private intervals: NodeJS.Timeout[] = [];
  private isRunning = false;

  /**
   * Start all cleanup jobs
   */
  start(): void {
    if (this.isRunning) {
      console.log('[CleanupJobs] Already running');
      return;
    }

    console.log('[CleanupJobs] Starting cleanup jobs...');
    this.isRunning = true;

    // Run initial cleanup on startup
    this.runAllJobs().catch(console.error);

    // Schedule periodic cleanup jobs
    
    // Every hour: Clean up expired sessions and auth codes
    this.intervals.push(
      setInterval(() => {
        this.cleanupExpiredSessions().catch(console.error);
        this.cleanupExpiredAuthCodes().catch(console.error);
      }, 60 * 60 * 1000) // 1 hour
    );

    // Every day: Clean up old notifications and analytics
    this.intervals.push(
      setInterval(() => {
        this.cleanupOldNotifications().catch(console.error);
        this.cleanupOldAnalytics().catch(console.error);
        this.cleanupAbandonedDrafts().catch(console.error);
      }, 24 * 60 * 60 * 1000) // 24 hours
    );

    // Every week: Archive inactive communities and clean up old data
    this.intervals.push(
      setInterval(() => {
        this.archiveInactiveCommunities().catch(console.error);
        this.cleanupOldActivityLogs().catch(console.error);
        this.optimizeDatabase().catch(console.error);
      }, 7 * 24 * 60 * 60 * 1000) // 7 days
    );
  }

  /**
   * Stop all cleanup jobs
   */
  stop(): void {
    console.log('[CleanupJobs] Stopping cleanup jobs...');
    this.isRunning = false;
    
    for (const interval of this.intervals) {
      clearInterval(interval);
    }
    this.intervals = [];
  }

  /**
   * Run all cleanup jobs immediately
   */
  async runAllJobs(): Promise<void> {
    console.log('[CleanupJobs] Running all cleanup jobs...');
    
    const results = await Promise.allSettled([
      this.cleanupExpiredSessions(),
      this.cleanupExpiredAuthCodes(),
      this.cleanupOldNotifications(),
      this.cleanupOldAnalytics(),
      this.cleanupAbandonedDrafts(),
      this.archiveInactiveCommunities(),
      this.cleanupOldActivityLogs()
    ]);

    // Log results
    results.forEach((result, index) => {
      const jobNames = [
        'ExpiredSessions',
        'ExpiredAuthCodes',
        'OldNotifications',
        'OldAnalytics',
        'AbandonedDrafts',
        'InactiveCommunities',
        'OldActivityLogs'
      ];
      
      if (result.status === 'fulfilled') {
        console.log(`[CleanupJobs] ✓ ${jobNames[index]}: ${result.value}`);
      } else {
        console.error(`[CleanupJobs] ✗ ${jobNames[index]}: ${result.reason}`);
      }
    });
  }

  /**
   * Clean up expired sessions (older than 24 hours inactive)
   */
  async cleanupExpiredSessions(): Promise<string> {
    try {
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      
      const { data, error } = await this.client
        .from('user_sessions')
        .delete()
        .lt('last_used_at', twentyFourHoursAgo)
        .select('id');

      if (error) throw error;
      
      const count = data?.length || 0;
      return `Deleted ${count} expired sessions`;
    } catch (error) {
      console.error('[CleanupJobs] Error cleaning up sessions:', error);
      return `Failed to cleanup sessions: ${error}`;
    }
  }

  /**
   * Clean up expired auth codes (older than 1 hour)
   */
  async cleanupExpiredAuthCodes(): Promise<string> {
    try {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      
      const { data, error } = await this.client
        .from('auth_codes')
        .delete()
        .lt('expires_at', oneHourAgo)
        .select('id');

      if (error) throw error;
      
      const count = data?.length || 0;
      return `Deleted ${count} expired auth codes`;
    } catch (error) {
      console.error('[CleanupJobs] Error cleaning up auth codes:', error);
      return `Failed to cleanup auth codes: ${error}`;
    }
  }

  /**
   * Clean up old notifications (older than 30 days)
   */
  async cleanupOldNotifications(): Promise<string> {
    try {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      
      const { data, error } = await this.client
        .from('community_notifications')
        .delete()
        .lt('created_at', thirtyDaysAgo)
        .eq('read', true) // Only delete read notifications
        .select('id');

      if (error) throw error;
      
      const count = data?.length || 0;
      return `Deleted ${count} old notifications`;
    } catch (error) {
      console.error('[CleanupJobs] Error cleaning up notifications:', error);
      return `Failed to cleanup notifications: ${error}`;
    }
  }

  /**
   * Clean up old analytics data (older than 90 days)
   */
  async cleanupOldAnalytics(): Promise<string> {
    try {
      const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
      
      const { data: pageViews, error: pvError } = await this.client
        .from('community_analytics_page_views')
        .delete()
        .lt('timestamp', ninetyDaysAgo)
        .select('id');

      if (pvError) throw pvError;

      const { data: events, error: evError } = await this.client
        .from('community_analytics_events')
        .delete()
        .lt('timestamp', ninetyDaysAgo)
        .select('id');

      if (evError) throw evError;
      
      const pvCount = pageViews?.length || 0;
      const evCount = events?.length || 0;
      return `Deleted ${pvCount} page views and ${evCount} events`;
    } catch (error) {
      console.error('[CleanupJobs] Error cleaning up analytics:', error);
      return `Failed to cleanup analytics: ${error}`;
    }
  }

  /**
   * Clean up abandoned draft posts (older than 7 days)
   */
  async cleanupAbandonedDrafts(): Promise<string> {
    try {
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      
      const { data, error } = await this.client
        .from('community_posts')
        .delete()
        .eq('status', 'draft')
        .lt('updated_at', sevenDaysAgo)
        .select('id');

      if (error) throw error;
      
      const count = data?.length || 0;
      return `Deleted ${count} abandoned drafts`;
    } catch (error) {
      console.error('[CleanupJobs] Error cleaning up drafts:', error);
      return `Failed to cleanup drafts: ${error}`;
    }
  }

  /**
   * Archive inactive communities (no activity for 90 days)
   */
  async archiveInactiveCommunities(): Promise<string> {
    try {
      const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
      
      // Find communities with no recent posts
      const { data: inactiveCommunities, error: findError } = await this.client
        .from('communities')
        .select('id, name')
        .eq('status', 'active')
        .lt('updated_at', ninetyDaysAgo);

      if (findError) throw findError;
      
      if (!inactiveCommunities || inactiveCommunities.length === 0) {
        return 'No inactive communities to archive';
      }

      // Check each community for recent activity
      const toArchive = [];
      for (const community of inactiveCommunities) {
        // Check for recent posts
        const { data: recentPosts } = await this.client
          .from('community_posts')
          .select('id')
          .eq('community_id', community.id)
          .gte('created_at', ninetyDaysAgo)
          .limit(1);

        // Check for recent member activity
        const { data: recentMembers } = await this.client
          .from('community_memberships')
          .select('id')
          .eq('community_id', community.id)
          .gte('joined_at', ninetyDaysAgo)
          .limit(1);

        // If no recent activity, mark for archival
        if ((!recentPosts || recentPosts.length === 0) && 
            (!recentMembers || recentMembers.length === 0)) {
          toArchive.push(community);
        }
      }

      // Archive communities
      if (toArchive.length > 0) {
        const ids = toArchive.map(c => c.id);
        const { error: archiveError } = await this.client
          .from('communities')
          .update({ status: 'archived', archived_at: new Date().toISOString() })
          .in('id', ids);

        if (archiveError) throw archiveError;
        
        console.log(`[CleanupJobs] Archived communities: ${toArchive.map(c => c.name).join(', ')}`);
      }

      return `Archived ${toArchive.length} inactive communities`;
    } catch (error) {
      console.error('[CleanupJobs] Error archiving communities:', error);
      return `Failed to archive communities: ${error}`;
    }
  }

  /**
   * Clean up old activity logs (older than 30 days)
   */
  async cleanupOldActivityLogs(): Promise<string> {
    try {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      
      const { data, error } = await this.client
        .from('community_activity_logs')
        .delete()
        .lt('created_at', thirtyDaysAgo)
        .select('id');

      if (error) throw error;
      
      const count = data?.length || 0;
      return `Deleted ${count} old activity logs`;
    } catch (error) {
      console.error('[CleanupJobs] Error cleaning up activity logs:', error);
      return `Failed to cleanup activity logs: ${error}`;
    }
  }

  /**
   * Optimize database (vacuum, reindex, etc.)
   * Note: This requires appropriate database permissions
   */
  async optimizeDatabase(): Promise<string> {
    try {
      // Analyze tables for query optimization
      const tables = [
        'communities',
        'community_memberships',
        'community_posts',
        'users',
        'user_sessions'
      ];

      for (const table of tables) {
        // Note: ANALYZE is safe and doesn't lock tables
        await this.client.rpc('analyze_table', { table_name: table });
      }

      return `Optimized ${tables.length} tables`;
    } catch (error) {
      // This might fail if we don't have permissions, which is okay
      return `Database optimization skipped (may require additional permissions)`;
    }
  }

  /**
   * Get cleanup job statistics
   */
  async getStats(): Promise<{
    expiredSessions: number;
    expiredAuthCodes: number;
    oldNotifications: number;
    abandonedDrafts: number;
    inactiveCommunities: number;
  }> {
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();

    const [sessions, authCodes, notifications, drafts, communities] = await Promise.all([
      this.client
        .from('user_sessions')
        .select('id', { count: 'exact', head: true })
        .lt('last_used_at', twentyFourHoursAgo),
      
      this.client
        .from('auth_codes')
        .select('id', { count: 'exact', head: true })
        .lt('expires_at', oneHourAgo),
      
      this.client
        .from('community_notifications')
        .select('id', { count: 'exact', head: true })
        .lt('created_at', thirtyDaysAgo)
        .eq('read', true),
      
      this.client
        .from('community_posts')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'draft')
        .lt('updated_at', sevenDaysAgo),
      
      this.client
        .from('communities')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'active')
        .lt('updated_at', ninetyDaysAgo)
    ]);

    return {
      expiredSessions: sessions.count || 0,
      expiredAuthCodes: authCodes.count || 0,
      oldNotifications: notifications.count || 0,
      abandonedDrafts: drafts.count || 0,
      inactiveCommunities: communities.count || 0
    };
  }
}

// Export singleton instance
export const cleanupJobs = new CleanupJobs();

// Start cleanup jobs when module is loaded
if (process.env.NODE_ENV === 'production') {
  cleanupJobs.start();
  console.log('[CleanupJobs] Started in production mode');
}