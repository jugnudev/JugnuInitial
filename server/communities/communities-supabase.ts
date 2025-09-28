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
  InsertUserSession,
  Community,
  InsertCommunity,
  CommunityMembership,
  InsertCommunityMembership,
  CommunityMembershipWithUser,
  CommunityPost,
  InsertCommunityPost
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
      .select(`
        *,
        phone_number,
        date_of_birth,
        gender,
        preferred_language,
        timezone,
        marketing_opt_in_source,
        referral_source,
        newsletter
      `)
      .eq('id', id)
      .single();

    if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows
    
    // Map database column names to JavaScript property names
    if (data) {
      return {
        ...data,
        // Map snake_case database fields to camelCase JavaScript properties
        firstName: data.first_name,
        lastName: data.last_name,
        phoneNumber: data.phone_number,
        dateOfBirth: data.date_of_birth,
        preferredLanguage: data.preferred_language,
        marketingOptInSource: data.marketing_opt_in_source,

        referralSource: data.referral_source,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
        emailVerified: data.email_verified,
        emailNotifications: data.email_notifications,
        marketingEmails: data.marketing_emails,
        newsletter: data.newsletter,
        // Remove the snake_case fields to avoid confusion
        first_name: undefined,
        last_name: undefined,
        phone_number: undefined,
        date_of_birth: undefined,
        preferred_language: undefined,
        marketing_opt_in_source: undefined,

        referral_source: undefined
      };
    }
    
    return data;
  }

  async getUserByEmail(email: string): Promise<User | null> {
    const { data, error } = await this.client
      .from('users')
      .select(`
        *,
        phone_number,
        date_of_birth,
        gender,
        preferred_language,
        timezone,
        marketing_opt_in_source,
        referral_source,
        newsletter
      `)
      .eq('email', email.toLowerCase().trim())
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    
    // Map database column names to JavaScript property names
    if (data) {
      return {
        ...data,
        // Map snake_case database fields to camelCase JavaScript properties
        firstName: data.first_name,
        lastName: data.last_name,
        phoneNumber: data.phone_number,
        dateOfBirth: data.date_of_birth,
        preferredLanguage: data.preferred_language,
        marketingOptInSource: data.marketing_opt_in_source,

        referralSource: data.referral_source,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
        emailVerified: data.email_verified,
        emailNotifications: data.email_notifications,
        marketingEmails: data.marketing_emails,
        newsletter: data.newsletter,
        // Remove the snake_case fields to avoid confusion
        first_name: undefined,
        last_name: undefined,
        phone_number: undefined,
        date_of_birth: undefined,
        preferred_language: undefined,
        marketing_opt_in_source: undefined,

        referral_source: undefined
      };
    }
    
    return data;
  }

  async updateUser(id: string, data: Partial<InsertUser>): Promise<User> {
    // First, update only the existing/safe fields that are known to exist in the database
    const safeUpdateData: any = { updated_at: new Date().toISOString() };
    
    if (data.firstName !== undefined) safeUpdateData.first_name = data.firstName;
    if (data.lastName !== undefined) safeUpdateData.last_name = data.lastName;
    if (data.profileImageUrl !== undefined) safeUpdateData.profile_image_url = data.profileImageUrl;
    if (data.bio !== undefined) safeUpdateData.bio = data.bio;
    if (data.location !== undefined) safeUpdateData.location = data.location;
    if (data.website !== undefined) safeUpdateData.website = data.website;
    if (data.socialInstagram !== undefined) safeUpdateData.social_instagram = data.socialInstagram;
    if (data.socialTwitter !== undefined) safeUpdateData.social_twitter = data.socialTwitter;
    if (data.socialLinkedin !== undefined) safeUpdateData.social_linkedin = data.socialLinkedin;
    if (data.emailVerified !== undefined) safeUpdateData.email_verified = data.emailVerified;
    if (data.status !== undefined) safeUpdateData.status = data.status;
    if (data.role !== undefined) safeUpdateData.role = data.role;
    if (data.emailNotifications !== undefined) safeUpdateData.email_notifications = data.emailNotifications;
    if (data.marketingEmails !== undefined) safeUpdateData.marketing_emails = data.marketingEmails;
    if (data.newsletter !== undefined) safeUpdateData.newsletter = data.newsletter;

    // Try to update with safe fields first
    const { error: safeError } = await this.client
      .from('users')
      .update(safeUpdateData)
      .eq('id', id);

    if (safeError) throw safeError;

    // New profile fields for better customer profiling (database schema updated)
    const newFieldsData: any = {};
    if (data.phoneNumber !== undefined) newFieldsData.phone_number = data.phoneNumber;
    if (data.dateOfBirth !== undefined) newFieldsData.date_of_birth = data.dateOfBirth;
    if (data.gender !== undefined) newFieldsData.gender = data.gender;
    if (data.preferredLanguage !== undefined) newFieldsData.preferred_language = data.preferredLanguage;
    if (data.timezone !== undefined) newFieldsData.timezone = data.timezone;
    if (data.referralSource !== undefined) newFieldsData.referral_source = data.referralSource;

    // Update new fields if any are provided
    if (Object.keys(newFieldsData).length > 0) {
      try {
        await this.client
          .from('users')
          .update(newFieldsData)
          .eq('id', id);
        console.log(`Updated ${Object.keys(newFieldsData).length} new profile fields for user ${id}`);
      } catch (error) {
        console.error('Error updating new profile fields:', error);
        // Log but don't throw - the main profile update succeeded
      }
    }

    // Fetch and return the complete updated user record
    const updatedUser = await this.getUserById(id);
    if (!updatedUser) {
      throw new Error('Failed to retrieve updated user record');
    }

    return updatedUser;
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

  async getAuthCodeByEmail(email: string): Promise<AuthCode | null> {
    const { data, error } = await this.client
      .from('auth_codes')
      .select('id, created_at, user_id, email, code, purpose, expires_at, used_at, attempts, max_attempts')
      .eq('email', email.toLowerCase().trim())
      .is('used_at', null)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    
    // Map database column names to JavaScript property names
    if (data) {
      return {
        id: data.id,
        createdAt: data.created_at,
        userId: data.user_id, // Map user_id to userId
        email: data.email,
        code: data.code,
        purpose: data.purpose,
        expiresAt: data.expires_at,
        usedAt: data.used_at,
        attempts: data.attempts,
        maxAttempts: data.max_attempts
      };
    }
    
    return null;
  }

  async getAuthCodeByEmailAndCode(email: string, code: string): Promise<AuthCode | null> {
    const { data, error } = await this.client
      .from('auth_codes')
      .select('id, created_at, user_id, email, code, purpose, expires_at, used_at, attempts, max_attempts')
      .eq('email', email.toLowerCase().trim())
      .eq('code', code)
      .is('used_at', null)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    
    // Map database column names to JavaScript property names
    if (data) {
      return {
        id: data.id,
        createdAt: data.created_at,
        userId: data.user_id, // Map user_id to userId
        email: data.email,
        code: data.code,
        purpose: data.purpose,
        expiresAt: data.expires_at,
        usedAt: data.used_at,
        attempts: data.attempts,
        maxAttempts: data.max_attempts
      };
    }
    
    return null;
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
      .select('id, created_at, user_id, token, expires_at, last_used_at, ip_address, user_agent, is_active')
      .eq('token', token)
      .eq('is_active', true)
      .gt('expires_at', new Date().toISOString())
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    
    // Map database column names to JavaScript property names
    if (data) {
      return {
        id: data.id,
        createdAt: data.created_at,
        userId: data.user_id, // Map user_id to userId
        token: data.token,
        expiresAt: data.expires_at,
        lastUsedAt: data.last_used_at,
        ipAddress: data.ip_address,
        userAgent: data.user_agent,
        isActive: data.is_active
      };
    }
    
    return null;
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
    
    // Map database column names to JavaScript property names
    return (data || []).map(item => ({
      id: item.id,
      userId: item.user_id,
      businessName: item.business_name,
      businessWebsite: item.business_website,
      businessDescription: item.business_description,
      businessType: item.business_type,
      yearsExperience: item.years_experience,
      sampleEvents: item.sample_events,
      socialMediaHandles: item.social_media_handles,
      businessEmail: item.business_email,
      businessPhone: item.business_phone,
      businessAddress: item.business_address,
      status: item.status,
      createdAt: item.created_at,
      updatedAt: item.updated_at,
      reviewedBy: item.reviewed_by,
      reviewedAt: item.reviewed_at,
      rejectionReason: item.rejection_reason,
      adminNotes: item.admin_notes,
      user: item.users ? {
        id: item.users.id,
        email: item.users.email,
        fullName: item.users.first_name && item.users.last_name 
          ? `${item.users.first_name} ${item.users.last_name}`.trim()
          : null
      } : null
    }));
  }

  async getOrganizerApplicationById(id: string): Promise<OrganizerApplication | null> {
    const { data, error } = await this.client
      .from('organizer_applications')
      .select('*')
      .eq('id', id)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    
    if (!data) return null;
    
    // Map database column names to JavaScript property names
    return {
      id: data.id,
      userId: data.user_id,
      businessName: data.business_name,
      businessWebsite: data.business_website,
      businessDescription: data.business_description,
      businessType: data.business_type,
      yearsExperience: data.years_experience,
      sampleEvents: data.sample_events,
      socialMediaHandles: data.social_media_handles,
      businessEmail: data.business_email,
      businessPhone: data.business_phone,
      businessAddress: data.business_address,
      status: data.status,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      reviewedBy: data.reviewed_by,
      reviewedAt: data.reviewed_at,
      rejectionReason: data.rejection_reason,
      adminNotes: data.admin_notes
    };
  }

  async getOrganizerApplicationByUserId(userId: string): Promise<OrganizerApplication | null> {
    const { data, error } = await this.client
      .from('organizer_applications')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    
    if (!data) return null;
    
    // Map database column names to JavaScript property names
    return {
      id: data.id,
      userId: data.user_id,
      businessName: data.business_name,
      businessWebsite: data.business_website,
      businessDescription: data.business_description,
      businessType: data.business_type,
      yearsExperience: data.years_experience,
      sampleEvents: data.sample_events,
      socialMediaHandles: data.social_media_handles,
      businessEmail: data.business_email,
      businessPhone: data.business_phone,
      businessAddress: data.business_address,
      status: data.status,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      reviewedBy: data.reviewed_by,
      reviewedAt: data.reviewed_at,
      rejectionReason: data.rejection_reason,
      adminNotes: data.admin_notes
    };
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

  // ============ COMMUNITIES ============
  async createCommunity(data: InsertCommunity): Promise<Community> {
    const { data: community, error } = await this.client
      .from('communities')
      .insert({
        organizer_id: data.organizerId,
        name: data.name,
        description: data.description,
        image_url: data.imageUrl,
        is_private: data.isPrivate || false,
        membership_policy: data.membershipPolicy || 'approval_required',
        status: data.status || 'active'
      })
      .select()
      .single();

    if (error) throw error;
    return this.mapCommunityFromDb(community);
  }

  async getCommunityById(id: string): Promise<Community | null> {
    const { data, error } = await this.client
      .from('communities')
      .select('*')
      .eq('id', id)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data ? this.mapCommunityFromDb(data) : null;
  }

  async getCommunityByOrganizerId(organizerId: string): Promise<Community | null> {
    const { data, error } = await this.client
      .from('communities')
      .select('*')
      .eq('organizer_id', organizerId)
      .eq('status', 'active')
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data ? this.mapCommunityFromDb(data) : null;
  }

  async getCommunityBySlug(slugOrId: string): Promise<Community | null> {
    // Check if it's a UUID (ID) or a slug
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(slugOrId);
    
    if (isUUID) {
      // If it's a UUID, query by ID
      const { data, error } = await this.client
        .from('communities')
        .select('*')
        .eq('id', slugOrId)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data ? this.mapCommunityFromDb(data) : null;
    } else {
      // Otherwise, try to query by slug - but fallback to ID if slug column doesn't exist
      try {
        const { data, error } = await this.client
          .from('communities')
          .select('*')
          .eq('slug', slugOrId)
          .single();

        if (error && error.code !== 'PGRST116') throw error;
        return data ? this.mapCommunityFromDb(data) : null;
      } catch (error: any) {
        // If slug column doesn't exist, try by ID as fallback
        if (error.code === '42703') {
          const { data, error: idError } = await this.client
            .from('communities')
            .select('*')
            .eq('id', slugOrId)
            .single();

          if (idError && idError.code !== 'PGRST116') throw idError;
          return data ? this.mapCommunityFromDb(data) : null;
        }
        throw error;
      }
    }
  }

  async getAllCommunities(limit: number = 20, offset: number = 0): Promise<{ communities: Community[], total: number }> {
    // Get total count
    const { count, error: countError } = await this.client
      .from('communities')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active')
      .eq('is_private', false);

    if (countError) throw countError;

    // Get paginated results
    const { data, error } = await this.client
      .from('communities')
      .select('*')
      .eq('status', 'active')
      .eq('is_private', false)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;
    
    return {
      communities: data ? data.map(this.mapCommunityFromDb) : [],
      total: count || 0
    };
  }

  async getCommunitiesByOrganizerId(organizerId: string): Promise<Community[]> {
    const { data, error } = await this.client
      .from('communities')
      .select('*')
      .eq('organizer_id', organizerId)
      .eq('status', 'active')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data ? data.map(this.mapCommunityFromDb) : [];
  }

  async updateCommunity(id: string, data: Partial<InsertCommunity>): Promise<Community> {
    const updateData: any = { updated_at: new Date().toISOString() };
    
    if (data.name !== undefined) updateData.name = data.name;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.imageUrl !== undefined) updateData.image_url = data.imageUrl;
    if (data.isPrivate !== undefined) updateData.is_private = data.isPrivate;
    if (data.membershipPolicy !== undefined) updateData.membership_policy = data.membershipPolicy;
    if (data.status !== undefined) updateData.status = data.status;

    const { data: community, error } = await this.client
      .from('communities')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return this.mapCommunityFromDb(community);
  }

  async deleteCommunity(id: string): Promise<void> {
    const { error } = await this.client
      .from('communities')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }

  // ============ COMMUNITY MEMBERSHIPS ============
  async createMembership(data: InsertCommunityMembership): Promise<CommunityMembership> {
    const { data: membership, error } = await this.client
      .from('community_memberships')
      .insert({
        community_id: data.communityId,
        user_id: data.userId,
        status: data.status || 'pending',
        requested_at: data.requestedAt || new Date().toISOString(),
        approved_at: data.approvedAt,
        approved_by: data.approvedBy,
        role: data.role || 'member'
      })
      .select()
      .single();

    if (error) throw error;
    return this.mapMembershipFromDb(membership);
  }

  async getMembershipsByCommunityId(communityId: string): Promise<CommunityMembershipWithUser[]> {
    const { data, error } = await this.client
      .from('community_memberships')
      .select(`
        *,
        users!community_memberships_user_id_fkey (
          id,
          email,
          first_name,
          last_name,
          profile_image_url,
          created_at,
          role
        )
      `)
      .eq('community_id', communityId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data ? data.map(this.mapMembershipFromDb) : [];
  }

  async getPendingMembershipsByCommunityId(communityId: string): Promise<CommunityMembershipWithUser[]> {
    const { data, error } = await this.client
      .from('community_memberships')
      .select(`
        *,
        users!community_memberships_user_id_fkey (
          id,
          email,
          first_name,
          last_name,
          profile_image_url,
          created_at,
          role
        )
      `)
      .eq('community_id', communityId)
      .eq('status', 'pending')
      .order('created_at', { ascending: true });

    if (error) throw error;
    return data ? data.map(this.mapMembershipFromDb) : [];
  }

  async getMembershipByUserAndCommunity(userId: string, communityId: string): Promise<CommunityMembership | null> {
    const { data, error } = await this.client
      .from('community_memberships')
      .select('*')
      .eq('user_id', userId)
      .eq('community_id', communityId)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data ? this.mapMembershipFromDb(data) : null;
  }

  async updateMembership(id: string, data: Partial<InsertCommunityMembership>): Promise<CommunityMembership> {
    const updateData: any = { updated_at: new Date().toISOString() };
    
    if (data.status !== undefined) updateData.status = data.status;
    if (data.approvedAt !== undefined) updateData.approved_at = data.approvedAt;
    if (data.approvedBy !== undefined) updateData.approved_by = data.approvedBy;
    if (data.role !== undefined) updateData.role = data.role;

    const { data: membership, error } = await this.client
      .from('community_memberships')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return this.mapMembershipFromDb(membership);
  }

  async deleteMembership(id: string): Promise<void> {
    const { error } = await this.client
      .from('community_memberships')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }

  // ============ COMMUNITY POSTS ============
  async createPost(data: InsertCommunityPost): Promise<CommunityPost> {
    const { data: post, error } = await this.client
      .from('community_posts')
      .insert({
        community_id: data.communityId,
        author_id: data.authorId,
        title: data.title,
        content: data.content,
        post_type: data.postType || 'announcement',
        is_pinned: data.isPinned || false,
        status: data.status || 'published'
      })
      .select()
      .single();

    if (error) throw error;
    return this.mapPostFromDb(post);
  }

  async getPostsByCommunityId(communityId: string, limit: number = 20, offset: number = 0): Promise<{ posts: CommunityPost[], total: number }> {
    // Get total count
    const { count, error: countError } = await this.client
      .from('community_posts')
      .select('*', { count: 'exact', head: true })
      .eq('community_id', communityId)
      .eq('status', 'published');

    if (countError) throw countError;

    // Get paginated results
    const { data, error } = await this.client
      .from('community_posts')
      .select('*')
      .eq('community_id', communityId)
      .eq('status', 'published')
      .order('is_pinned', { ascending: false })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;
    
    return {
      posts: data ? data.map(this.mapPostFromDb) : [],
      total: count || 0
    };
  }

  async getPostById(id: string): Promise<CommunityPost | null> {
    const { data, error } = await this.client
      .from('community_posts')
      .select('*')
      .eq('id', id)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data ? this.mapPostFromDb(data) : null;
  }

  async updatePost(id: string, data: Partial<InsertCommunityPost>): Promise<CommunityPost> {
    const updateData: any = { updated_at: new Date().toISOString() };
    
    if (data.title !== undefined) updateData.title = data.title;
    if (data.content !== undefined) updateData.content = data.content;
    if (data.postType !== undefined) updateData.post_type = data.postType;
    if (data.isPinned !== undefined) updateData.is_pinned = data.isPinned;
    if (data.status !== undefined) updateData.status = data.status;

    const { data: post, error } = await this.client
      .from('community_posts')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return this.mapPostFromDb(post);
  }

  async deletePost(id: string): Promise<void> {
    const { error } = await this.client
      .from('community_posts')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }

  // ============ COMMUNITY POST IMAGES ============
  async addPostImage(postId: string, imageUrl: string, position: number): Promise<any> {
    const { data, error } = await this.client
      .from('community_post_images')
      .insert({
        post_id: postId,
        image_url: imageUrl,
        position
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async getPostImages(postId: string): Promise<any[]> {
    const { data, error } = await this.client
      .from('community_post_images')
      .select('*')
      .eq('post_id', postId)
      .order('position', { ascending: true });

    if (error) throw error;
    return data || [];
  }

  async deletePostImage(imageId: string): Promise<void> {
    const { error } = await this.client
      .from('community_post_images')
      .delete()
      .eq('id', imageId);

    if (error) throw error;
  }

  async reorderPostImages(postId: string, imageIds: string[]): Promise<void> {
    // Update positions for each image
    const updates = imageIds.map((id, index) => 
      this.client
        .from('community_post_images')
        .update({ position: index })
        .eq('id', id)
        .eq('post_id', postId)
    );

    await Promise.all(updates);
  }

  // ============ COMMUNITY COMMENTS ============
  async createComment(data: any): Promise<any> {
    const { data: comment, error } = await this.client
      .from('community_comments')
      .insert({
        post_id: data.postId,
        author_id: data.authorId,
        content: data.content,
        parent_id: data.parentId || null,
        is_hidden: false,
        status: 'published'
      })
      .select()
      .single();

    if (error) throw error;
    return comment;
  }

  async getCommentsByPostId(postId: string): Promise<any[]> {
    const { data, error } = await this.client
      .from('community_comments')
      .select(`
        *,
        users!community_comments_author_id_fkey (
          id,
          email,
          first_name,
          last_name,
          profile_image_url
        )
      `)
      .eq('post_id', postId)
      .eq('status', 'published')
      .order('created_at', { ascending: true });

    if (error) throw error;
    return data || [];
  }

  async getCommentById(id: string): Promise<any | null> {
    const { data, error } = await this.client
      .from('community_comments')
      .select('*')
      .eq('id', id)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data;
  }

  async updateComment(id: string, content: string): Promise<any> {
    const { data, error } = await this.client
      .from('community_comments')
      .update({
        content,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async deleteComment(id: string): Promise<void> {
    const { error } = await this.client
      .from('community_comments')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }

  async hideComment(id: string): Promise<void> {
    const { error } = await this.client
      .from('community_comments')
      .update({ is_hidden: true })
      .eq('id', id);

    if (error) throw error;
  }

  // ============ COMMUNITY REACTIONS ============
  async addReaction(data: { postId: string; userId: string; type: string }): Promise<any> {
    const { data: reaction, error } = await this.client
      .from('community_post_reactions')
      .insert({
        post_id: data.postId,
        user_id: data.userId,
        reaction_type: data.type
      })
      .select()
      .single();

    if (error) {
      // If unique constraint violation, reaction already exists
      if (error.code === '23505') {
        return null;
      }
      throw error;
    }
    return reaction;
  }

  async removeReaction(postId: string, userId: string, type: string): Promise<void> {
    const { error } = await this.client
      .from('community_post_reactions')
      .delete()
      .eq('post_id', postId)
      .eq('user_id', userId)
      .eq('reaction_type', type);

    if (error) throw error;
  }

  async getReactionsByPostId(postId: string): Promise<any[]> {
    const { data, error } = await this.client
      .from('community_post_reactions')
      .select(`
        *,
        users!community_post_reactions_user_id_fkey (
          id,
          first_name,
          last_name,
          profile_image_url
        )
      `)
      .eq('post_id', postId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  async getUserReactionForPost(postId: string, userId: string): Promise<any | null> {
    const { data, error } = await this.client
      .from('community_post_reactions')
      .select('*')
      .eq('post_id', postId)
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data;
  }

  // ============ POST ANALYTICS ============
  async trackPostView(postId: string, viewerId: string | null): Promise<void> {
    try {
      const { error } = await this.client
        .from('community_post_analytics')
        .upsert({
          post_id: postId,
          views: 1,
          unique_views: viewerId ? 1 : 0,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'post_id'
        });

      if (error) console.error('Failed to track post view:', error);
    } catch (error) {
      console.error('Failed to track post view:', error);
    }
  }

  async incrementPostAnalytics(postId: string, field: 'views' | 'reactions' | 'comments' | 'shares'): Promise<void> {
    const { error } = await this.client
      .rpc('increment_post_analytics', {
        post_id_param: postId,
        field_name: field
      });

    if (error) {
      // Fallback if RPC doesn't exist
      const { data: analytics } = await this.client
        .from('community_post_analytics')
        .select(field)
        .eq('post_id', postId)
        .single();
      
      if (analytics) {
        await this.client
          .from('community_post_analytics')
          .update({ [field]: (analytics[field] || 0) + 1 })
          .eq('post_id', postId);
      } else {
        await this.client
          .from('community_post_analytics')
          .insert({ post_id: postId, [field]: 1 });
      }
    }
  }

  // ============ COMMUNITY ANALYTICS ============
  async trackCommunityActivity(communityId: string, field: 'views' | 'posts' | 'members' | 'reactions'): Promise<void> {
    try {
      const today = new Date().toISOString().split('T')[0];
      
      const { error } = await this.client
        .from('community_analytics')
        .upsert({
          community_id: communityId,
          date: today,
          [field]: 1,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'community_id,date'
        });

      if (error) console.error('Failed to track community activity:', error);
    } catch (error) {
      console.error('Failed to track community activity:', error);
    }
  }

  async getCommunityAnalytics(communityId: string, days: number = 30): Promise<any[]> {
    const since = new Date();
    since.setDate(since.getDate() - days);

    const { data, error } = await this.client
      .from('community_analytics')
      .select('*')
      .eq('community_id', communityId)
      .gte('date', since.toISOString().split('T')[0])
      .order('date', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  // ============ MAPPING HELPERS ============
  private mapCommunityFromDb(data: any): Community {
    return {
      id: data.id,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      organizerId: data.organizer_id,
      name: data.name,
      description: data.description,
      imageUrl: data.image_url,
      coverUrl: data.cover_url,
      isPrivate: data.is_private,
      membershipPolicy: data.membership_policy,
      status: data.status,
      slug: data.slug || null
    };
  }

  private mapMembershipFromDb(data: any): CommunityMembershipWithUser {
    const membership: CommunityMembership = {
      id: data.id,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      communityId: data.community_id,
      userId: data.user_id,
      status: data.status,
      requestedAt: data.requested_at,
      approvedAt: data.approved_at,
      approvedBy: data.approved_by,
      role: data.role
    };
    
    // Add user information if available from join
    const user = data.users;
    if (user) {
      return {
        ...membership,
        user: {
          id: user.id,
          email: user.email,
          firstName: user.first_name,
          lastName: user.last_name,
          profileImageUrl: user.profile_image_url,
          createdAt: user.created_at,
          role: user.role
        }
      };
    }
    
    return membership;
  }

  private mapPostFromDb(data: any): CommunityPost {
    return {
      id: data.id,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      communityId: data.community_id,
      authorId: data.author_id,
      title: data.title,
      content: data.content,
      imageUrl: data.image_url || undefined,
      linkUrl: data.link_url,
      linkText: data.link_text,
      linkDescription: data.link_description,
      tags: data.tags,
      metadata: data.metadata,
      postType: data.post_type,
      isPinned: data.is_pinned,
      status: data.status
    };
  }

  // ============ ANALYTICS METHODS ============
  async getVisitorAnalytics(since: Date): Promise<any[]> {
    const { data, error } = await this.client
      .from('visitor_analytics')
      .select('*')
      .gte('day', since.toISOString().split('T')[0])
      .order('day', { ascending: true });

    if (error) {
      console.error('Error fetching visitor analytics:', error);
      return [];
    }

    return data || [];
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