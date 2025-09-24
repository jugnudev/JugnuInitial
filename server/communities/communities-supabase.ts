import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';
import { nanoid } from 'nanoid';
import type { 
  User, 
  InsertUser,
  AuthCode,
  InsertAuthCode,
  OrganizerApplication,
  InsertOrganizerApplication,
  Organizer,
  InsertOrganizer,
  UserSession,
  InsertUserSession
} from '@shared/schema';

// Create Supabase client with service role for admin operations
const getSupabaseAdmin = () => {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Missing Supabase environment variables');
  }
  
  return createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
};

export class CommunitiesSupabaseDB {
  private client = getSupabaseAdmin();

  // ============ USERS ============
  async createUser(data: InsertUser): Promise<User> {
    const { data: user, error } = await this.client
      .from('users')
      .insert({
        email: data.email.toLowerCase().trim(),
        first_name: data.firstName,
        last_name: data.lastName,
        profile_image_url: data.profileImageUrl,
        bio: data.bio,
        location: data.location,
        website: data.website,
        social_instagram: data.socialInstagram,
        social_twitter: data.socialTwitter,
        social_linkedin: data.socialLinkedin,
        email_verified: data.emailVerified || false,
        status: data.status || 'active',
        role: data.role || 'user',
        email_notifications: data.emailNotifications !== false,
        marketing_emails: data.marketingEmails || false
      })
      .select()
      .single();

    if (error) throw error;
    return user;
  }

  async getUserById(id: string): Promise<User | null> {
    const { data, error } = await this.client
      .from('users')
      .select('*')
      .eq('id', id)
      .single();

    if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows
    return data;
  }

  async getUserByEmail(email: string): Promise<User | null> {
    const { data, error } = await this.client
      .from('users')
      .select('*')
      .eq('email', email.toLowerCase().trim())
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data;
  }

  async updateUser(id: string, data: Partial<InsertUser>): Promise<User> {
    const updateData: any = { updated_at: new Date().toISOString() };
    
    if (data.firstName !== undefined) updateData.first_name = data.firstName;
    if (data.lastName !== undefined) updateData.last_name = data.lastName;
    if (data.profileImageUrl !== undefined) updateData.profile_image_url = data.profileImageUrl;
    if (data.bio !== undefined) updateData.bio = data.bio;
    if (data.location !== undefined) updateData.location = data.location;
    if (data.website !== undefined) updateData.website = data.website;
    if (data.socialInstagram !== undefined) updateData.social_instagram = data.socialInstagram;
    if (data.socialTwitter !== undefined) updateData.social_twitter = data.socialTwitter;
    if (data.socialLinkedin !== undefined) updateData.social_linkedin = data.socialLinkedin;
    if (data.emailVerified !== undefined) updateData.email_verified = data.emailVerified;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.role !== undefined) updateData.role = data.role;
    if (data.emailNotifications !== undefined) updateData.email_notifications = data.emailNotifications;
    if (data.marketingEmails !== undefined) updateData.marketing_emails = data.marketingEmails;

    const { data: user, error } = await this.client
      .from('users')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return user;
  }

  // ============ AUTH CODES ============
  async createAuthCode(data: InsertAuthCode): Promise<AuthCode> {
    // Generate 6-digit code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    
    const { data: authCode, error } = await this.client
      .from('auth_codes')
      .insert({
        user_id: data.userId,
        email: data.email.toLowerCase().trim(),
        code,
        purpose: data.purpose || 'login',
        expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(), // 10 minutes
        attempts: 0,
        max_attempts: 5
      })
      .select()
      .single();

    if (error) throw error;
    return authCode;
  }

  async getAuthCodeByEmailAndCode(email: string, code: string): Promise<AuthCode | null> {
    const { data, error } = await this.client
      .from('auth_codes')
      .select('*')
      .eq('email', email.toLowerCase().trim())
      .eq('code', code)
      .is('used_at', null)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data;
  }

  async markAuthCodeUsed(id: string): Promise<void> {
    const { error } = await this.client
      .from('auth_codes')
      .update({ used_at: new Date().toISOString() })
      .eq('id', id);

    if (error) throw error;
  }

  async incrementAuthCodeAttempts(id: string): Promise<void> {
    const { error } = await this.client
      .rpc('increment_auth_code_attempts', { code_id: id });

    if (error) {
      // Fallback if RPC doesn't exist
      const { data: authCode } = await this.client
        .from('auth_codes')
        .select('attempts')
        .eq('id', id)
        .single();
      
      if (authCode) {
        await this.client
          .from('auth_codes')
          .update({ attempts: (authCode.attempts || 0) + 1 })
          .eq('id', id);
      }
    }
  }

  // ============ USER SESSIONS ============
  async createSession(data: InsertUserSession): Promise<UserSession> {
    const token = crypto.randomBytes(32).toString('hex');
    
    const { data: session, error } = await this.client
      .from('user_sessions')
      .insert({
        user_id: data.userId,
        token,
        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
        ip_address: data.ipAddress,
        user_agent: data.userAgent,
        is_active: true
      })
      .select()
      .single();

    if (error) throw error;
    return session;
  }

  async getSessionByToken(token: string): Promise<UserSession | null> {
    const { data, error } = await this.client
      .from('user_sessions')
      .select('*')
      .eq('token', token)
      .eq('is_active', true)
      .gt('expires_at', new Date().toISOString())
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data;
  }

  async updateSessionLastUsed(token: string): Promise<void> {
    const { error } = await this.client
      .from('user_sessions')
      .update({ last_used_at: new Date().toISOString() })
      .eq('token', token);

    if (error) throw error;
  }

  async deactivateSession(token: string): Promise<void> {
    const { error } = await this.client
      .from('user_sessions')
      .update({ is_active: false })
      .eq('token', token);

    if (error) throw error;
  }

  async deactivateAllUserSessions(userId: string): Promise<void> {
    const { error } = await this.client
      .from('user_sessions')
      .update({ is_active: false })
      .eq('user_id', userId);

    if (error) throw error;
  }

  // ============ ORGANIZER APPLICATIONS ============
  async createOrganizerApplication(data: InsertOrganizerApplication): Promise<OrganizerApplication> {
    const { data: application, error } = await this.client
      .from('organizer_applications')
      .insert({
        user_id: data.userId,
        business_name: data.businessName,
        business_website: data.businessWebsite,
        business_description: data.businessDescription,
        business_type: data.businessType,
        years_experience: data.yearsExperience,
        sample_events: data.sampleEvents,
        social_media_handles: data.socialMediaHandles || {},
        business_email: data.businessEmail.toLowerCase().trim(),
        business_phone: data.businessPhone,
        business_address: data.businessAddress,
        status: 'pending'
      })
      .select()
      .single();

    if (error) throw error;
    return application;
  }

  async getOrganizerApplicationsByStatus(status: string): Promise<OrganizerApplication[]> {
    const { data, error } = await this.client
      .from('organizer_applications')
      .select(`
        *,
        users!user_id (
          id,
          email,
          first_name,
          last_name,
          profile_image_url
        )
      `)
      .eq('status', status)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  async getOrganizerApplicationById(id: string): Promise<OrganizerApplication | null> {
    const { data, error } = await this.client
      .from('organizer_applications')
      .select('*')
      .eq('id', id)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data;
  }

  async updateOrganizerApplication(
    id: string, 
    data: { 
      status: string; 
      reviewedBy: string; 
      rejectionReason?: string; 
      adminNotes?: string; 
    }
  ): Promise<OrganizerApplication> {
    const { data: application, error } = await this.client
      .from('organizer_applications')
      .update({
        status: data.status,
        reviewed_by: data.reviewedBy,
        reviewed_at: new Date().toISOString(),
        rejection_reason: data.rejectionReason,
        admin_notes: data.adminNotes,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return application;
  }

  // ============ ORGANIZERS ============
  async createOrganizer(data: InsertOrganizer): Promise<Organizer> {
    const { data: organizer, error } = await this.client
      .from('organizers')
      .insert({
        user_id: data.userId,
        application_id: data.applicationId,
        business_name: data.businessName,
        business_website: data.businessWebsite,
        business_description: data.businessDescription,
        business_type: data.businessType,
        verified: false,
        status: 'active',
        approved_by: data.approvedBy,
        approved_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;
    
    // Also update user role to organizer
    await this.updateUser(data.userId, { role: 'organizer' });
    
    return organizer;
  }

  async getOrganizerByUserId(userId: string): Promise<Organizer | null> {
    const { data, error } = await this.client
      .from('organizers')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'active')
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data;
  }

  // ============ UTILITY METHODS ============
  async cleanupExpiredCodes(): Promise<void> {
    const { error } = await this.client
      .from('auth_codes')
      .delete()
      .lt('expires_at', new Date(Date.now() - 60 * 60 * 1000).toISOString()); // Remove codes expired > 1 hour ago

    if (error) console.error('Failed to cleanup expired codes:', error);
  }

  async cleanupExpiredSessions(): Promise<void> {
    const { error } = await this.client
      .from('user_sessions')
      .delete()
      .or(`expires_at.lt.${new Date().toISOString()},last_used_at.lt.${new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString()}`); // Remove sessions expired or unused > 90 days

    if (error) console.error('Failed to cleanup expired sessions:', error);
  }
}

// Export singleton instance
export const communitiesStorage = new CommunitiesSupabaseDB();