import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';
import { nanoid } from 'nanoid';
import { queryCache } from './cache';
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
  InsertCommunityPost,
  CommunitySubscription,
  InsertCommunitySubscription,
  CommunityPayment,
  InsertCommunityPayment,
  CommunityBillingEvent,
  InsertCommunityBillingEvent
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
    // First, get the organizer to find their user_id
    const { data: organizer, error: organizerError } = await this.client
      .from('organizers')
      .select('user_id')
      .eq('id', data.organizerId)
      .single();

    if (organizerError || !organizer) {
      throw new Error('Organizer not found');
    }

    // Create the community
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

    // Automatically create owner membership for the organizer
    await this.createMembership({
      communityId: community.id,
      userId: organizer.user_id,
      status: 'approved',
      role: 'owner',
      approvedAt: new Date().toISOString()
    });

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

  // Alias for compatibility
  async getCommunityMembership(communityId: string, userId: string): Promise<CommunityMembership | null> {
    return this.getMembershipByUserAndCommunity(userId, communityId);
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
        parent_comment_id: data.parentId || null,
        is_hidden: false
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
      .eq('is_hidden', false)
      .order('created_at', { ascending: true });

    if (error) throw error;
    
    // Map the data to frontend format and build threaded structure
    const comments = (data || []).map(this.mapCommentFromDb.bind(this));
    
    // Build threaded structure
    const topLevelComments = comments.filter(c => !c.parentId);
    const commentMap = new Map(comments.map(c => [c.id, c]));
    
    // Nest replies under their parent comments
    topLevelComments.forEach(comment => {
      comment.replies = comments.filter(c => c.parentId === comment.id);
    });
    
    return topLevelComments;
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
      
      // Map field names to actual database columns
      const fieldMapping = {
        'views': 'pageviews',
        'posts': 'total_posts', 
        'members': 'total_members',
        'reactions': 'total_reactions'
      };
      
      const dbField = fieldMapping[field];
      if (!dbField) {
        console.error(`Unknown analytics field: ${field}`);
        return;
      }
      
      const { error } = await this.client
        .from('community_analytics')
        .upsert({
          community_id: communityId,
          date: today,
          [dbField]: 1
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
      slug: data.slug || null,
      totalMembers: data.total_members || 0,
      totalPosts: data.total_posts || 0,
      memberCount: data.total_members || 0, // Alias for frontend compatibility
      postCount: data.total_posts || 0, // Alias for frontend compatibility
      shortDescription: data.short_description,
      welcomeText: data.welcome_text,
      chatMode: data.chat_mode || 'owner_only',
      chatSlowmodeSeconds: data.chat_slowmode_seconds || 0,
      allowMemberPosts: data.allow_member_posts || false,
      subscriptionStatus: data.subscription_status || 'trialing',
      subscriptionEndsAt: data.subscription_ends_at,
      lastActivityAt: data.last_activity_at
    };
  }

  private mapCommentFromDb(data: any): any {
    const author = data.users;
    return {
      id: data.id,
      content: data.content,
      authorId: data.author_id,
      authorName: author ? `${author.first_name || ''} ${author.last_name || ''}`.trim() || author.email : 'Unknown User',
      authorAvatar: author?.profile_image_url || null,
      authorRole: 'member', // Will be determined by membership data if needed
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      parentId: data.parent_comment_id,
      likes: 0, // Will be populated by likes count if implemented
      hasLiked: false, // Will be determined by user's like status
      isEdited: data.updated_at !== data.created_at,
      replies: []
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

  // ============ CHAT METHODS ============
  async saveChatMessage(
    communityId: string,
    userId: string,
    content: string,
    isAnnouncement: boolean = false
  ): Promise<any> {
    const { data, error } = await this.client
      .from('community_chat_messages')
      .insert({
        community_id: communityId,
        author_id: userId,
        content,
        is_announcement: isAnnouncement,
        is_pinned: false,
        is_deleted: false
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async getChatHistory(
    communityId: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<any[]> {
    const { data, error } = await this.client
      .from('community_chat_messages')
      .select(`
        *,
        author:author_id (id, first_name, last_name, profile_image_url)
      `)
      .eq('community_id', communityId)
      .eq('is_deleted', false)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;
    return (data || []).reverse(); // Reverse to get chronological order
  }

  async getLastUserMessage(
    communityId: string,
    userId: string
  ): Promise<any | null> {
    const { data, error } = await this.client
      .from('community_chat_messages')
      .select('*')
      .eq('community_id', communityId)
      .eq('author_id', userId)
      .eq('is_deleted', false)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data;
  }

  async deleteChatMessage(
    messageId: string,
    userId: string
  ): Promise<boolean> {
    const { data, error } = await this.client
      .from('community_chat_messages')
      .update({
        is_deleted: true,
        deleted_by: userId,
        deleted_at: new Date().toISOString()
      })
      .eq('id', messageId);

    if (error) throw error;
    return true;
  }

  async pinChatMessage(
    messageId: string,
    isPinned: boolean
  ): Promise<boolean> {
    const { data, error } = await this.client
      .from('community_chat_messages')
      .update({ is_pinned: isPinned })
      .eq('id', messageId);

    if (error) throw error;
    return true;
  }

  async getPinnedMessages(communityId: string): Promise<any[]> {
    const { data, error } = await this.client
      .from('community_chat_messages')
      .select(`
        *,
        author:author_id (id, first_name, last_name, profile_image_url)
      `)
      .eq('community_id', communityId)
      .eq('is_pinned', true)
      .eq('is_deleted', false)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  // ============ POLLS METHODS ============
  async createPoll(
    communityId: string,
    userId: string,
    pollData: {
      question: string;
      description?: string;
      pollType: 'single' | 'multiple';
      options: string[];
      allowMultipleVotes?: boolean;
      showResultsBeforeVote?: boolean;
      anonymousVoting?: boolean;
      closesAt?: Date;
    }
  ): Promise<any> {
    const { data: poll, error: pollError } = await this.client
      .from('community_polls')
      .insert({
        community_id: communityId,
        author_id: userId,
        question: pollData.question,
        description: pollData.description,
        poll_type: pollData.pollType,
        allow_multiple_votes: pollData.allowMultipleVotes || false,
        show_results_before_vote: pollData.showResultsBeforeVote || false,
        anonymous_voting: pollData.anonymousVoting || false,
        closes_at: pollData.closesAt?.toISOString(),
        is_closed: false,
        total_votes: 0,
        unique_voters: 0
      })
      .select()
      .single();

    if (pollError) throw pollError;

    // Create poll options
    const optionsData = pollData.options.map((text, index) => ({
      poll_id: poll.id,
      text,
      display_order: index,
      vote_count: 0,
      vote_percentage: 0
    }));

    const { data: options, error: optionsError } = await this.client
      .from('community_poll_options')
      .insert(optionsData)
      .select();

    if (optionsError) throw optionsError;

    return { ...poll, options };
  }

  async getPolls(
    communityId: string,
    status: 'active' | 'closed' | 'all' = 'active'
  ): Promise<any[]> {
    let query = this.client
      .from('community_polls')
      .select(`
        *,
        options:community_poll_options(*),
        author:author_id (id, first_name, last_name, profile_image_url)
      `)
      .eq('community_id', communityId)
      .order('created_at', { ascending: false });

    if (status === 'active') {
      query = query.eq('is_closed', false);
    } else if (status === 'closed') {
      query = query.eq('is_closed', true);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data || [];
  }

  async getPollDetails(pollId: string, userId?: string): Promise<any> {
    const { data: poll, error: pollError } = await this.client
      .from('community_polls')
      .select(`
        *,
        options:community_poll_options(*),
        author:author_id (id, first_name, last_name, profile_image_url)
      `)
      .eq('id', pollId)
      .single();

    if (pollError) throw pollError;

    // Check if user has voted
    let userVotes = [];
    if (userId) {
      const { data, error } = await this.client
        .from('community_poll_votes')
        .select('option_id')
        .eq('poll_id', pollId)
        .eq('user_id', userId);

      if (!error) {
        userVotes = (data || []).map(v => v.option_id);
      }
    }

    return { ...poll, userVotes };
  }

  async votePoll(
    pollId: string,
    optionIds: string[],
    userId: string
  ): Promise<boolean> {
    // First remove any existing votes
    await this.removeVote(pollId, userId);

    // Add new votes
    const votes = optionIds.map(optionId => ({
      poll_id: pollId,
      option_id: optionId,
      user_id: userId
    }));

    const { error: voteError } = await this.client
      .from('community_poll_votes')
      .insert(votes);

    if (voteError) throw voteError;

    // Update vote counts
    await this.updatePollResults(pollId);

    return true;
  }

  async removeVote(pollId: string, userId: string): Promise<boolean> {
    const { error } = await this.client
      .from('community_poll_votes')
      .delete()
      .eq('poll_id', pollId)
      .eq('user_id', userId);

    if (error) throw error;

    // Update vote counts
    await this.updatePollResults(pollId);

    return true;
  }

  async closePoll(pollId: string): Promise<boolean> {
    const { error } = await this.client
      .from('community_polls')
      .update({ is_closed: true })
      .eq('id', pollId);

    if (error) throw error;
    return true;
  }

  async updatePollResults(pollId: string): Promise<void> {
    // Get all votes for the poll
    const { data: votes, error: votesError } = await this.client
      .from('community_poll_votes')
      .select('option_id, user_id')
      .eq('poll_id', pollId);

    if (votesError) throw votesError;

    // Get unique voters count
    const uniqueVoters = new Set((votes || []).map(v => v.user_id)).size;

    // Count votes per option
    const voteCounts = new Map<string, number>();
    (votes || []).forEach(vote => {
      const count = voteCounts.get(vote.option_id) || 0;
      voteCounts.set(vote.option_id, count + 1);
    });

    const totalVotes = votes?.length || 0;

    // Update poll totals
    await this.client
      .from('community_polls')
      .update({
        total_votes: totalVotes,
        unique_voters: uniqueVoters
      })
      .eq('id', pollId);

    // Update each option's count and percentage
    const { data: options, error: optionsError } = await this.client
      .from('community_poll_options')
      .select('id')
      .eq('poll_id', pollId);

    if (optionsError) throw optionsError;

    for (const option of options || []) {
      const count = voteCounts.get(option.id) || 0;
      const percentage = totalVotes > 0 ? (count / totalVotes) * 100 : 0;

      await this.client
        .from('community_poll_options')
        .update({
          vote_count: count,
          vote_percentage: percentage.toFixed(2)
        })
        .eq('id', option.id);
    }
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

  // ============ BILLING AND SUBSCRIPTION METHODS ============
  
  async createSubscription(data: InsertCommunitySubscription): Promise<CommunitySubscription> {
    const { data: subscription, error } = await this.client
      .from('community_subscriptions')
      .insert({
        community_id: data.communityId,
        organizer_id: data.organizerId,
        stripe_customer_id: data.stripeCustomerId,
        stripe_subscription_id: data.stripeSubscriptionId,
        stripe_price_id: data.stripePriceId,
        plan: data.plan || 'free',
        status: data.status || 'trialing',
        current_period_start: data.currentPeriodStart,
        current_period_end: data.currentPeriodEnd,
        cancel_at: data.cancelAt,
        canceled_at: data.canceledAt,
        trial_start: data.trialStart,
        trial_end: data.trialEnd,
        member_limit: data.memberLimit || 100,
        features: data.features || {},
        metadata: data.metadata || {}
      })
      .select()
      .single();

    if (error) throw error;
    return this.mapSubscriptionFromDb(subscription);
  }

  async getSubscriptionByCommunityId(communityId: string): Promise<CommunitySubscription | null> {
    const { data, error } = await this.client
      .from('community_subscriptions')
      .select()
      .eq('community_id', communityId)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data ? this.mapSubscriptionFromDb(data) : null;
  }

  async getSubscriptionByOrganizer(organizerId: string): Promise<CommunitySubscription[]> {
    const { data, error } = await this.client
      .from('community_subscriptions')
      .select()
      .eq('organizer_id', organizerId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []).map(sub => this.mapSubscriptionFromDb(sub));
  }

  async getSubscriptionByStripeId(stripeSubscriptionId: string): Promise<CommunitySubscription | null> {
    const { data, error } = await this.client
      .from('community_subscriptions')
      .select()
      .eq('stripe_subscription_id', stripeSubscriptionId)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data ? this.mapSubscriptionFromDb(data) : null;
  }

  async updateSubscriptionStatus(
    subscriptionId: string, 
    status: string, 
    metadata?: Partial<CommunitySubscription>
  ): Promise<CommunitySubscription> {
    const updateData: any = {
      status,
      updated_at: new Date().toISOString()
    };

    // Map metadata fields to database column names
    if (metadata) {
      if (metadata.stripeCustomerId !== undefined) updateData.stripe_customer_id = metadata.stripeCustomerId;
      if (metadata.stripeSubscriptionId !== undefined) updateData.stripe_subscription_id = metadata.stripeSubscriptionId;
      if (metadata.stripePriceId !== undefined) updateData.stripe_price_id = metadata.stripePriceId;
      if (metadata.currentPeriodStart !== undefined) updateData.current_period_start = metadata.currentPeriodStart;
      if (metadata.currentPeriodEnd !== undefined) updateData.current_period_end = metadata.currentPeriodEnd;
      if (metadata.cancelAt !== undefined) updateData.cancel_at = metadata.cancelAt;
      if (metadata.canceledAt !== undefined) updateData.canceled_at = metadata.canceledAt;
      if (metadata.trialEnd !== undefined) updateData.trial_end = metadata.trialEnd;
      if (metadata.features !== undefined) updateData.features = metadata.features;
      if (metadata.metadata !== undefined) updateData.metadata = metadata.metadata;
    }

    const { data, error } = await this.client
      .from('community_subscriptions')
      .update(updateData)
      .eq('id', subscriptionId)
      .select()
      .single();

    if (error) throw error;
    return this.mapSubscriptionFromDb(data);
  }

  async recordPayment(payment: InsertCommunityPayment): Promise<CommunityPayment> {
    const { data, error } = await this.client
      .from('community_payments')
      .insert({
        subscription_id: payment.subscriptionId,
        community_id: payment.communityId,
        stripe_invoice_id: payment.stripeInvoiceId,
        stripe_payment_intent_id: payment.stripePaymentIntentId,
        amount_paid: payment.amountPaid,
        currency: payment.currency || 'CAD',
        status: payment.status,
        description: payment.description,
        billing_period_start: payment.billingPeriodStart,
        billing_period_end: payment.billingPeriodEnd,
        failure_reason: payment.failureReason,
        receipt_url: payment.receiptUrl,
        metadata: payment.metadata || {}
      })
      .select()
      .single();

    if (error) throw error;
    return this.mapPaymentFromDb(data);
  }

  async getPaymentsBySubscriptionId(subscriptionId: string): Promise<CommunityPayment[]> {
    const { data, error } = await this.client
      .from('community_payments')
      .select()
      .eq('subscription_id', subscriptionId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []).map(payment => this.mapPaymentFromDb(payment));
  }

  async recordBillingEvent(event: InsertCommunityBillingEvent): Promise<CommunityBillingEvent> {
    const { data, error } = await this.client
      .from('community_billing_events')
      .insert({
        stripe_event_id: event.stripeEventId,
        event_type: event.eventType,
        community_id: event.communityId,
        subscription_id: event.subscriptionId,
        processed: event.processed || false,
        data: event.data,
        error: event.error
      })
      .select()
      .single();

    if (error) throw error;
    return this.mapBillingEventFromDb(data);
  }

  async getBillingEventByStripeId(stripeEventId: string): Promise<CommunityBillingEvent | null> {
    const { data, error } = await this.client
      .from('community_billing_events')
      .select()
      .eq('stripe_event_id', stripeEventId)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data ? this.mapBillingEventFromDb(data) : null;
  }

  async markBillingEventProcessed(stripeEventId: string): Promise<void> {
    const { error } = await this.client
      .from('community_billing_events')
      .update({ processed: true })
      .eq('stripe_event_id', stripeEventId);

    if (error) throw error;
  }

  async handleTrialEnd(subscriptionId: string): Promise<void> {
    // Update subscription status to expired if trial ends without payment
    await this.updateSubscriptionStatus(subscriptionId, 'expired', {
      trialEnd: new Date()
    });
  }

  // Helper methods to map database records to TypeScript types
  private mapSubscriptionFromDb(data: any): CommunitySubscription {
    return {
      id: data.id,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      communityId: data.community_id,
      organizerId: data.organizer_id,
      stripeCustomerId: data.stripe_customer_id,
      stripeSubscriptionId: data.stripe_subscription_id,
      stripePriceId: data.stripe_price_id,
      plan: data.plan,
      status: data.status,
      currentPeriodStart: data.current_period_start,
      currentPeriodEnd: data.current_period_end,
      cancelAt: data.cancel_at,
      canceledAt: data.canceled_at,
      trialStart: data.trial_start,
      trialEnd: data.trial_end,
      memberLimit: data.member_limit,
      features: data.features,
      metadata: data.metadata
    };
  }

  private mapPaymentFromDb(data: any): CommunityPayment {
    return {
      id: data.id,
      createdAt: data.created_at,
      subscriptionId: data.subscription_id,
      communityId: data.community_id,
      stripeInvoiceId: data.stripe_invoice_id,
      stripePaymentIntentId: data.stripe_payment_intent_id,
      amountPaid: data.amount_paid,
      currency: data.currency,
      status: data.status,
      description: data.description,
      billingPeriodStart: data.billing_period_start,
      billingPeriodEnd: data.billing_period_end,
      failureReason: data.failure_reason,
      receiptUrl: data.receipt_url,
      metadata: data.metadata
    };
  }

  private mapBillingEventFromDb(data: any): CommunityBillingEvent {
    return {
      id: data.id,
      createdAt: data.created_at,
      stripeEventId: data.stripe_event_id,
      eventType: data.event_type,
      communityId: data.community_id,
      subscriptionId: data.subscription_id,
      processed: data.processed,
      data: data.data,
      error: data.error
    };
  }

  // ============ NOTIFICATIONS ============
  
  // Create a single notification
  async createNotification(data: {
    recipientId: string;
    communityId?: string;
    type: string;
    title: string;
    body?: string;
    actionUrl?: string;
    metadata?: any;
  }): Promise<CommunityNotification> {
    const { data: notification, error } = await this.client
      .from('community_notifications')
      .insert({
        recipient_id: data.recipientId,
        community_id: data.communityId,
        type: data.type,
        title: data.title,
        body: data.body,
        action_url: data.actionUrl,
        metadata: data.metadata || {},
        is_read: false,
        is_email_sent: false
      })
      .select()
      .single();

    if (error) throw error;
    return this.mapNotificationFromDb(notification);
  }

  // Create multiple notifications at once (for bulk operations)
  async batchCreateNotifications(notifications: Array<{
    recipientId: string;
    communityId?: string;
    type: string;
    title: string;
    body?: string;
    actionUrl?: string;
    metadata?: any;
  }>): Promise<CommunityNotification[]> {
    if (!notifications.length) return [];

    const notificationData = notifications.map(n => ({
      recipient_id: n.recipientId,
      community_id: n.communityId,
      type: n.type,
      title: n.title,
      body: n.body,
      action_url: n.actionUrl,
      metadata: n.metadata || {},
      is_read: false,
      is_email_sent: false
    }));

    const { data: created, error } = await this.client
      .from('community_notifications')
      .insert(notificationData)
      .select();

    if (error) throw error;
    return created.map(n => this.mapNotificationFromDb(n));
  }

  // Get notifications for a user
  async getNotifications(
    userId: string, 
    options?: {
      communityId?: string;
      limit?: number;
      offset?: number;
      unreadOnly?: boolean;
    }
  ): Promise<{ notifications: CommunityNotification[]; total: number }> {
    let query = this.client
      .from('community_notifications')
      .select('*', { count: 'exact' })
      .eq('recipient_id', userId)
      .order('created_at', { ascending: false });

    if (options?.communityId) {
      query = query.eq('community_id', options.communityId);
    }

    if (options?.unreadOnly) {
      query = query.eq('is_read', false);
    }

    if (options?.limit) {
      query = query.limit(options.limit);
    }

    if (options?.offset) {
      query = query.range(options.offset, options.offset + (options.limit || 10) - 1);
    }

    const { data, error, count } = await query;
    if (error) throw error;

    return {
      notifications: data.map(n => this.mapNotificationFromDb(n)),
      total: count || 0
    };
  }

  // Get unread notification count for a user
  async getUnreadCount(userId: string, communityId?: string): Promise<number> {
    let query = this.client
      .from('community_notifications')
      .select('*', { count: 'exact', head: true })
      .eq('recipient_id', userId)
      .eq('is_read', false);

    if (communityId) {
      query = query.eq('community_id', communityId);
    }

    const { count, error } = await query;
    if (error) throw error;
    return count || 0;
  }

  // Mark a notification as read
  async markAsRead(notificationId: string, userId: string): Promise<CommunityNotification> {
    const { data, error } = await this.client
      .from('community_notifications')
      .update({
        is_read: true,
        read_at: new Date().toISOString()
      })
      .eq('id', notificationId)
      .eq('recipient_id', userId)
      .select()
      .single();

    if (error) throw error;
    return this.mapNotificationFromDb(data);
  }

  // Mark all notifications as read
  async markAllAsRead(userId: string, communityId?: string): Promise<number> {
    let query = this.client
      .from('community_notifications')
      .update({
        is_read: true,
        read_at: new Date().toISOString()
      })
      .eq('recipient_id', userId)
      .eq('is_read', false);

    if (communityId) {
      query = query.eq('community_id', communityId);
    }

    const { data, error } = await query.select();
    if (error) throw error;
    return data ? data.length : 0;
  }

  // Delete a notification
  async deleteNotification(notificationId: string, userId: string): Promise<boolean> {
    const { error } = await this.client
      .from('community_notifications')
      .delete()
      .eq('id', notificationId)
      .eq('recipient_id', userId);

    if (error) throw error;
    return true;
  }

  // Clean up old notifications (>30 days)
  async cleanupOldNotifications(): Promise<number> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data, error } = await this.client
      .from('community_notifications')
      .delete()
      .lt('created_at', thirtyDaysAgo.toISOString())
      .select();

    if (error) throw error;
    return data ? data.length : 0;
  }

  // ============ NOTIFICATION PREFERENCES ============
  
  // Get notification preferences for a user
  async getNotificationPreferences(userId: string, communityId?: string): Promise<CommunityNotificationPreferences | null> {
    const { data, error } = await this.client
      .from('community_notification_preferences')
      .select('*')
      .eq('user_id', userId)
      .eq('community_id', communityId || null)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    if (!data) return null;
    
    return this.mapNotificationPreferencesFromDb(data);
  }

  // Create or update notification preferences
  async upsertNotificationPreferences(
    userId: string,
    preferences: Partial<InsertCommunityNotificationPreferences>,
    communityId?: string
  ): Promise<CommunityNotificationPreferences> {
    // Check if preferences exist
    const existing = await this.getNotificationPreferences(userId, communityId);
    
    const preferencesData = {
      user_id: userId,
      community_id: communityId || null,
      in_app_enabled: preferences.inAppEnabled,
      email_enabled: preferences.emailEnabled,
      push_enabled: preferences.pushEnabled,
      new_posts: preferences.newPosts,
      post_comments: preferences.postComments,
      comment_replies: preferences.commentReplies,
      mentions: preferences.mentions,
      poll_results: preferences.pollResults,
      membership_updates: preferences.membershipUpdates,
      community_announcements: preferences.communityAnnouncements,
      new_deals: preferences.newDeals,
      email_frequency: preferences.emailFrequency,
      email_digest_time: preferences.emailDigestTime,
      email_digest_timezone: preferences.emailDigestTimezone,
      quiet_hours_enabled: preferences.quietHoursEnabled,
      quiet_hours_start: preferences.quietHoursStart,
      quiet_hours_end: preferences.quietHoursEnd,
      updated_at: new Date().toISOString()
    };

    const { data, error } = existing
      ? await this.client
          .from('community_notification_preferences')
          .update(preferencesData)
          .eq('id', existing.id)
          .select()
          .single()
      : await this.client
          .from('community_notification_preferences')
          .insert(preferencesData)
          .select()
          .single();

    if (error) throw error;
    return this.mapNotificationPreferencesFromDb(data);
  }

  // ============ EMAIL QUEUE ============
  
  // Add email to queue
  async queueEmail(data: {
    recipientEmail: string;
    recipientName?: string;
    communityId?: string;
    templateId: string;
    subject: string;
    variables?: any;
    scheduledFor?: Date;
  }): Promise<CommunityEmailQueue> {
    const { data: email, error } = await this.client
      .from('community_email_queue')
      .insert({
        recipient_email: data.recipientEmail,
        recipient_name: data.recipientName,
        community_id: data.communityId,
        template_id: data.templateId,
        subject: data.subject,
        variables: data.variables || {},
        status: 'pending',
        scheduled_for: data.scheduledFor?.toISOString()
      })
      .select()
      .single();

    if (error) throw error;
    return this.mapEmailQueueFromDb(email);
  }

  // Get pending emails from queue
  async getPendingEmails(limit: number = 10): Promise<CommunityEmailQueue[]> {
    const { data, error } = await this.client
      .from('community_email_queue')
      .select('*')
      .eq('status', 'pending')
      .or(`scheduled_for.is.null,scheduled_for.lte.${new Date().toISOString()}`)
      .order('created_at', { ascending: true })
      .limit(limit);

    if (error) throw error;
    return data.map(e => this.mapEmailQueueFromDb(e));
  }

  // Mark email as sent
  async markEmailSent(emailId: string): Promise<void> {
    const { error } = await this.client
      .from('community_email_queue')
      .update({
        status: 'sent',
        sent_at: new Date().toISOString()
      })
      .eq('id', emailId);

    if (error) throw error;
  }

  // Mark email as failed
  async markEmailFailed(emailId: string, errorMessage: string, retryCount: number): Promise<void> {
    const { error } = await this.client
      .from('community_email_queue')
      .update({
        status: retryCount >= 3 ? 'failed' : 'pending',
        error_message: errorMessage,
        retry_count: retryCount,
        failed_at: retryCount >= 3 ? new Date().toISOString() : null
      })
      .eq('id', emailId);

    if (error) throw error;
  }

  // Helper methods to map database records to TypeScript types
  private mapNotificationFromDb(data: any): CommunityNotification {
    return {
      id: data.id,
      createdAt: data.created_at,
      recipientId: data.recipient_id,
      communityId: data.community_id,
      type: data.type,
      title: data.title,
      body: data.body,
      actionUrl: data.action_url,
      metadata: data.metadata,
      isRead: data.is_read,
      readAt: data.read_at,
      isEmailSent: data.is_email_sent,
      emailSentAt: data.email_sent_at
    };
  }

  private mapNotificationPreferencesFromDb(data: any): CommunityNotificationPreferences {
    return {
      id: data.id,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      userId: data.user_id,
      communityId: data.community_id,
      inAppEnabled: data.in_app_enabled,
      emailEnabled: data.email_enabled,
      pushEnabled: data.push_enabled,
      newPosts: data.new_posts,
      postComments: data.post_comments,
      commentReplies: data.comment_replies,
      mentions: data.mentions,
      pollResults: data.poll_results,
      membershipUpdates: data.membership_updates,
      communityAnnouncements: data.community_announcements,
      newDeals: data.new_deals,
      emailFrequency: data.email_frequency,
      emailDigestTime: data.email_digest_time,
      emailDigestTimezone: data.email_digest_timezone,
      quietHoursEnabled: data.quiet_hours_enabled,
      quietHoursStart: data.quiet_hours_start,
      quietHoursEnd: data.quiet_hours_end,
      lastDigestSentAt: data.last_digest_sent_at
    };
  }

  private mapEmailQueueFromDb(data: any): CommunityEmailQueue {
    return {
      id: data.id,
      createdAt: data.created_at,
      recipientEmail: data.recipient_email,
      recipientName: data.recipient_name,
      communityId: data.community_id,
      templateId: data.template_id,
      subject: data.subject,
      variables: data.variables,
      status: data.status,
      sentAt: data.sent_at,
      failedAt: data.failed_at,
      errorMessage: data.error_message,
      retryCount: data.retry_count,
      scheduledFor: data.scheduled_for
    };
  }

  // ============ ADMIN METHODS ============
  
  // Get all communities with stats for admin dashboard
  async getAllCommunitiesAdmin(filters?: {
    status?: string;
    plan?: string;
    searchTerm?: string;
  }, pagination?: {
    limit?: number;
    offset?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }): Promise<{ communities: any[], total: number }> {
    let query = this.client
      .from('communities')
      .select(`
        *,
        organizers!inner (
          id,
          user_id,
          business_name,
          users!inner (
            id,
            email,
            first_name,
            last_name,
            created_at
          )
        ),
        community_subscriptions (
          id,
          plan,
          status,
          current_period_start,
          current_period_end,
          stripe_subscription_id
        ),
        community_memberships!inner (
          id,
          status
        )
      `, { count: 'exact' });
    
    // Apply filters
    if (filters?.status) {
      query = query.eq('status', filters.status);
    }
    if (filters?.plan) {
      query = query.eq('community_subscriptions.plan', filters.plan);
    }
    if (filters?.searchTerm) {
      query = query.or(`name.ilike.%${filters.searchTerm}%,description.ilike.%${filters.searchTerm}%`);
    }
    
    // Apply sorting
    const sortBy = pagination?.sortBy || 'created_at';
    const sortOrder = pagination?.sortOrder || 'desc';
    query = query.order(sortBy, { ascending: sortOrder === 'asc' });
    
    // Apply pagination
    const limit = pagination?.limit || 50;
    const offset = pagination?.offset || 0;
    query = query.range(offset, offset + limit - 1);
    
    const { data, error, count } = await query;
    if (error) throw error;
    
    // Process the data to calculate member counts
    const communities = data?.map(community => ({
      ...this.mapCommunityFromDb(community),
      owner: community.organizers ? {
        id: community.organizers.id,
        userId: community.organizers.user_id,
        businessName: community.organizers.business_name,
        email: community.organizers.users?.email,
        fullName: community.organizers.users 
          ? `${community.organizers.users.first_name || ''} ${community.organizers.users.last_name || ''}`.trim()
          : null
      } : null,
      subscription: community.community_subscriptions?.[0] || null,
      memberCount: community.community_memberships?.filter((m: any) => m.status === 'active').length || 0,
      lastActivity: community.updated_at
    })) || [];
    
    return {
      communities,
      total: count || 0
    };
  }
  
  // Get detailed stats for a specific community
  async getCommunityStats(communityId: string): Promise<any> {
    const { data: community, error: communityError } = await this.client
      .from('communities')
      .select(`
        *,
        organizers!inner (
          id,
          user_id,
          business_name,
          users!inner (
            id,
            email,
            first_name,
            last_name,
            created_at
          )
        ),
        community_subscriptions (
          id,
          plan,
          status,
          current_period_start,
          current_period_end,
          stripe_subscription_id,
          created_at
        ),
        community_memberships!inner (
          id,
          status,
          created_at,
          approved_at,
          users!inner (
            id,
            email,
            first_name,
            last_name,
            created_at
          )
        ),
        community_posts (
          id,
          created_at,
          post_type,
          status
        ),
        community_comments (
          id,
          created_at
        )
      `)
      .eq('id', communityId)
      .single();
    
    if (communityError) throw communityError;
    
    // Calculate various stats
    const stats = {
      community: this.mapCommunityFromDb(community),
      owner: community.organizers ? {
        id: community.organizers.id,
        userId: community.organizers.user_id,
        businessName: community.organizers.business_name,
        email: community.organizers.users?.email,
        fullName: community.organizers.users 
          ? `${community.organizers.users.first_name || ''} ${community.organizers.users.last_name || ''}`.trim()
          : null
      } : null,
      subscription: community.community_subscriptions?.[0] || null,
      memberStats: {
        total: community.community_memberships?.length || 0,
        active: community.community_memberships?.filter((m: any) => m.status === 'active').length || 0,
        pending: community.community_memberships?.filter((m: any) => m.status === 'pending').length || 0,
        banned: community.community_memberships?.filter((m: any) => m.status === 'banned').length || 0
      },
      activityStats: {
        totalPosts: community.community_posts?.length || 0,
        totalComments: community.community_comments?.length || 0,
        lastPostDate: community.community_posts?.[0]?.created_at || null,
        postsThisMonth: community.community_posts?.filter((p: any) => {
          const postDate = new Date(p.created_at);
          const now = new Date();
          return postDate.getMonth() === now.getMonth() && postDate.getFullYear() === now.getFullYear();
        }).length || 0
      },
      members: community.community_memberships?.map((m: any) => ({
        id: m.id,
        status: m.status,
        joinedAt: m.created_at,
        approvedAt: m.approved_at,
        user: {
          id: m.users.id,
          email: m.users.email,
          fullName: `${m.users.first_name || ''} ${m.users.last_name || ''}`.trim()
        }
      })) || []
    };
    
    return stats;
  }
  
  // Suspend a community
  async suspendCommunity(communityId: string, reason: string, adminId: string): Promise<Community> {
    const { data, error } = await this.client
      .from('communities')
      .update({
        status: 'suspended',
        suspended_at: new Date().toISOString(),
        suspension_reason: reason,
        suspended_by: adminId,
        updated_at: new Date().toISOString()
      })
      .eq('id', communityId)
      .select()
      .single();
    
    if (error) throw error;
    
    // Log admin action
    await this.logAdminAction({
      adminId,
      action: 'suspend_community',
      targetType: 'community',
      targetId: communityId,
      metadata: { reason }
    });
    
    return this.mapCommunityFromDb(data);
  }
  
  // Restore a suspended community
  async restoreCommunity(communityId: string, adminId: string): Promise<Community> {
    const { data, error } = await this.client
      .from('communities')
      .update({
        status: 'active',
        suspended_at: null,
        suspension_reason: null,
        suspended_by: null,
        updated_at: new Date().toISOString()
      })
      .eq('id', communityId)
      .select()
      .single();
    
    if (error) throw error;
    
    // Log admin action
    await this.logAdminAction({
      adminId,
      action: 'restore_community',
      targetType: 'community',
      targetId: communityId,
      metadata: {}
    });
    
    return this.mapCommunityFromDb(data);
  }
  
  // Get platform-wide metrics
  async getPlatformMetrics(): Promise<any> {
    // Get community counts by status
    const { data: communityCounts, error: communityError } = await this.client
      .from('communities')
      .select('status', { count: 'exact' });
    
    if (communityError) throw communityError;
    
    // Get subscription counts by plan
    const { data: subscriptionCounts, error: subError } = await this.client
      .from('community_subscriptions')
      .select('plan, status', { count: 'exact' });
    
    if (subError) throw subError;
    
    // Get user counts
    const { data: userCounts, error: userError } = await this.client
      .from('users')
      .select('role, status', { count: 'exact' });
    
    if (userError) throw userError;
    
    // Get membership counts
    const { data: membershipCounts, error: memberError } = await this.client
      .from('community_memberships')
      .select('status', { count: 'exact' });
    
    if (memberError) throw memberError;
    
    // Calculate metrics
    const metrics = {
      communities: {
        total: communityCounts?.length || 0,
        active: communityCounts?.filter((c: any) => c.status === 'active').length || 0,
        suspended: communityCounts?.filter((c: any) => c.status === 'suspended').length || 0
      },
      subscriptions: {
        total: subscriptionCounts?.length || 0,
        free: subscriptionCounts?.filter((s: any) => s.plan === 'free').length || 0,
        monthly: subscriptionCounts?.filter((s: any) => s.plan === 'monthly').length || 0,
        yearly: subscriptionCounts?.filter((s: any) => s.plan === 'yearly').length || 0,
        active: subscriptionCounts?.filter((s: any) => s.status === 'active').length || 0,
        trialing: subscriptionCounts?.filter((s: any) => s.status === 'trialing').length || 0
      },
      users: {
        total: userCounts?.length || 0,
        active: userCounts?.filter((u: any) => u.status === 'active').length || 0,
        organizers: userCounts?.filter((u: any) => u.role === 'organizer').length || 0,
        admins: userCounts?.filter((u: any) => u.role === 'admin').length || 0
      },
      memberships: {
        total: membershipCounts?.length || 0,
        active: membershipCounts?.filter((m: any) => m.status === 'active').length || 0,
        pending: membershipCounts?.filter((m: any) => m.status === 'pending').length || 0
      }
    };
    
    return metrics;
  }
  
  // Get revenue analytics
  async getRevenueAnalytics(startDate: Date, endDate: Date): Promise<any> {
    const { data: payments, error } = await this.client
      .from('community_payments')
      .select(`
        *,
        community_subscriptions!inner (
          plan,
          community_id,
          communities!inner (
            name
          )
        )
      `)
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString())
      .eq('status', 'succeeded')
      .order('created_at', { ascending: true });
    
    if (error) throw error;
    
    // Calculate revenue metrics
    const totalRevenue = payments?.reduce((sum, p) => sum + (p.amount_paid || 0), 0) || 0;
    const revenueByPlan: { [key: string]: number } = {};
    const revenueByMonth: { [key: string]: number } = {};
    const topCommunities: { [key: string]: { name: string; revenue: number } } = {};
    
    payments?.forEach(payment => {
      // Revenue by plan
      const plan = payment.community_subscriptions?.plan || 'unknown';
      revenueByPlan[plan] = (revenueByPlan[plan] || 0) + payment.amount_paid;
      
      // Revenue by month
      const date = new Date(payment.created_at);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      revenueByMonth[monthKey] = (revenueByMonth[monthKey] || 0) + payment.amount_paid;
      
      // Top communities by revenue
      const communityId = payment.community_subscriptions?.community_id;
      const communityName = payment.community_subscriptions?.communities?.name;
      if (communityId && communityName) {
        if (!topCommunities[communityId]) {
          topCommunities[communityId] = { name: communityName, revenue: 0 };
        }
        topCommunities[communityId].revenue += payment.amount_paid;
      }
    });
    
    // Sort top communities by revenue
    const topCommunitiesList = Object.entries(topCommunities)
      .map(([id, data]) => ({ id, ...data }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);
    
    return {
      totalRevenue,
      revenueByPlan,
      revenueByMonth,
      topCommunities: topCommunitiesList,
      transactionCount: payments?.length || 0,
      averageTransactionValue: payments?.length ? totalRevenue / payments.length : 0
    };
  }
  
  // Log admin actions for audit trail
  async logAdminAction(data: {
    adminId: string;
    action: string;
    targetType: string;
    targetId?: string;
    metadata?: any;
  }): Promise<void> {
    try {
      await this.client
        .from('admin_audit_log')
        .insert({
          admin_id: data.adminId,
          action: data.action,
          target_type: data.targetType,
          target_id: data.targetId,
          metadata: data.metadata || {},
          ip_address: null, // Would need to pass from request
          user_agent: null  // Would need to pass from request
        });
    } catch (error) {
      console.error('Failed to log admin action:', error);
      // Don't throw - audit logging failure shouldn't break the main action
    }
  }
  
  // Get audit log entries
  async getAuditLog(filters?: {
    adminId?: string;
    targetType?: string;
    targetId?: string;
    action?: string;
    startDate?: Date;
    endDate?: Date;
  }, pagination?: {
    limit?: number;
    offset?: number;
  }): Promise<{ entries: any[], total: number }> {
    let query = this.client
      .from('admin_audit_log')
      .select(`
        *,
        admins:admin_id (
          id,
          email,
          first_name,
          last_name
        )
      `, { count: 'exact' })
      .order('created_at', { ascending: false });
    
    // Apply filters
    if (filters?.adminId) {
      query = query.eq('admin_id', filters.adminId);
    }
    if (filters?.targetType) {
      query = query.eq('target_type', filters.targetType);
    }
    if (filters?.targetId) {
      query = query.eq('target_id', filters.targetId);
    }
    if (filters?.action) {
      query = query.eq('action', filters.action);
    }
    if (filters?.startDate) {
      query = query.gte('created_at', filters.startDate.toISOString());
    }
    if (filters?.endDate) {
      query = query.lte('created_at', filters.endDate.toISOString());
    }
    
    // Apply pagination
    const limit = pagination?.limit || 100;
    const offset = pagination?.offset || 0;
    query = query.range(offset, offset + limit - 1);
    
    const { data, error, count } = await query;
    if (error) throw error;
    
    return {
      entries: data || [],
      total: count || 0
    };
  }

  // ============ ADMIN METHODS ============
  async testDatabaseConnection(): Promise<{ ok: boolean; responseTime: number; message: string }> {
    const startTime = Date.now();
    try {
      // Simple query to test database connectivity
      const { data, error } = await this.client
        .from('users')
        .select('id')
        .limit(1)
        .single();
      
      const responseTime = Date.now() - startTime;
      
      if (error && error.code !== 'PGRST116') {
        throw error;
      }
      
      return {
        ok: true,
        responseTime,
        message: 'Database connection successful'
      };
    } catch (error: any) {
      return {
        ok: false,
        responseTime: Date.now() - startTime,
        message: error.message || 'Database connection failed'
      };
    }
  }

  async getAllCommunitiesForAdmin(options?: { 
    limit?: number; 
    offset?: number; 
    searchTerm?: string;
    status?: string;
  }): Promise<{ communities: any[]; total: number }> {
    try {
      let query = this.client
        .from('communities')
        .select(`
          *,
          owner:users!communities_owner_id_fkey(
            id,
            email,
            first_name,
            last_name
          ),
          community_memberships(count),
          community_posts(count),
          community_subscriptions(
            id,
            status,
            stripe_subscription_id,
            current_period_end,
            stripe_price_id
          )
        `, { count: 'exact' });

      // Apply search filter
      if (options?.searchTerm) {
        query = query.or(`name.ilike.%${options.searchTerm}%,id.eq.${options.searchTerm}`);
      }

      // Apply status filter
      if (options?.status && options.status !== 'all') {
        if (options.status === 'suspended') {
          query = query.eq('is_suspended', true);
        } else {
          query = query.eq('is_suspended', false);
        }
      }

      // Apply pagination
      if (options?.limit) {
        query = query.limit(options.limit);
      }
      if (options?.offset) {
        query = query.range(options.offset, options.offset + (options.limit || 10) - 1);
      }

      const { data, error, count } = await query
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Process the data to match the expected format
      const communities = (data || []).map((community: any) => {
        const subscription = community.community_subscriptions?.[0];
        const memberCount = community.community_memberships?.[0]?.count || 0;
        const postCount = community.community_posts?.[0]?.count || 0;
        
        // Calculate monthly revenue based on stripe_price_id
        let monthlyRevenue = 0;
        if (subscription?.status === 'active' && subscription?.stripe_price_id) {
          // These would typically match your actual Stripe price IDs
          // For now using placeholder logic
          monthlyRevenue = subscription.stripe_price_id.includes('yearly') ? 199 / 12 : 19.99;
        }

        return {
          id: community.id,
          name: community.name,
          slug: community.slug,
          ownerId: community.owner_id,
          ownerEmail: community.owner?.email || '',
          ownerName: community.owner ? `${community.owner.first_name} ${community.owner.last_name}`.trim() : '',
          memberCount,
          postCount,
          subscriptionStatus: subscription?.status || 'none',
          subscriptionEndDate: subscription?.current_period_end,
          monthlyRevenue,
          createdAt: community.created_at,
          updatedAt: community.updated_at,
          lastActivity: community.last_activity_at,
          isSuspended: community.is_suspended || false,
          suspendedReason: community.suspended_reason,
          suspendedAt: community.suspended_at
        };
      });

      return {
        communities,
        total: count || 0
      };
    } catch (error) {
      console.error('Error fetching communities for admin:', error);
      throw error;
    }
  }

  async getPlatformMetrics(): Promise<{
    totalCommunities: number;
    activeSubscriptions: number;
    totalMembers: number;
    monthlyRevenue: number;
    trialCommunities: number;
    suspendedCommunities: number;
  }> {
    try {
      // Get total communities count
      const { count: totalCommunities } = await this.client
        .from('communities')
        .select('*', { count: 'exact', head: true });

      // Get suspended communities count
      const { count: suspendedCommunities } = await this.client
        .from('communities')
        .select('*', { count: 'exact', head: true })
        .eq('is_suspended', true);

      // Get active subscriptions count
      const { count: activeSubscriptions } = await this.client
        .from('community_subscriptions')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active');

      // Get trial subscriptions count
      const { count: trialCommunities } = await this.client
        .from('community_subscriptions')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'trialing');

      // Get total members count
      const { count: totalMembers } = await this.client
        .from('community_memberships')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active');

      // Calculate monthly revenue from active subscriptions
      const { data: activeSubsData } = await this.client
        .from('community_subscriptions')
        .select('stripe_price_id')
        .eq('status', 'active');

      let monthlyRevenue = 0;
      if (activeSubsData) {
        activeSubsData.forEach((sub: any) => {
          // Calculate based on price ID (would match your Stripe price IDs)
          if (sub.stripe_price_id) {
            monthlyRevenue += sub.stripe_price_id.includes('yearly') ? 199 / 12 : 19.99;
          }
        });
      }

      return {
        totalCommunities: totalCommunities || 0,
        activeSubscriptions: activeSubscriptions || 0,
        totalMembers: totalMembers || 0,
        monthlyRevenue: Math.round(monthlyRevenue * 100) / 100,
        trialCommunities: trialCommunities || 0,
        suspendedCommunities: suspendedCommunities || 0
      };
    } catch (error) {
      console.error('Error fetching platform metrics:', error);
      throw error;
    }
  }

  async suspendCommunity(communityId: string, reason: string): Promise<Community> {
    const { data, error } = await this.client
      .from('communities')
      .update({
        is_suspended: true,
        suspended_reason: reason,
        suspended_at: new Date().toISOString()
      })
      .eq('id', communityId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async restoreCommunity(communityId: string): Promise<Community> {
    const { data, error } = await this.client
      .from('communities')
      .update({
        is_suspended: false,
        suspended_reason: null,
        suspended_at: null
      })
      .eq('id', communityId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async getCommunityDetails(communityId: string): Promise<any> {
    const { data, error } = await this.client
      .from('communities')
      .select(`
        *,
        owner:users!communities_owner_id_fkey(
          id,
          email,
          first_name,
          last_name
        ),
        community_memberships(
          id,
          user_id,
          role,
          status,
          joined_at,
          user:users(
            email,
            first_name,
            last_name
          )
        ),
        community_posts(
          id,
          title,
          created_at
        ),
        community_subscriptions(
          id,
          status,
          stripe_subscription_id,
          stripe_customer_id,
          stripe_price_id,
          current_period_start,
          current_period_end,
          cancel_at,
          canceled_at,
          trial_end,
          created_at
        )
      `)
      .eq('id', communityId)
      .single();

    if (error) throw error;

    // Process and return detailed information
    return {
      ...data,
      memberCount: data.community_memberships?.length || 0,
      postCount: data.community_posts?.length || 0,
      subscription: data.community_subscriptions?.[0] || null,
      recentPosts: data.community_posts?.slice(0, 5) || [],
      members: data.community_memberships?.slice(0, 10) || []
    };
  }
}

export const communitiesStorage = new CommunitiesSupabaseDB();