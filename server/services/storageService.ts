import { createClient } from '@supabase/supabase-js';
import slugify from 'slugify';

// Initialize Supabase client
function getStorageClient() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
  
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing required environment variables: SUPABASE_URL and SUPABASE_SERVICE_KEY');
  }
  
  return createClient(supabaseUrl, supabaseServiceKey);
}

// Upload a single file to Supabase Storage
export async function uploadSponsorCreative(
  file: Express.Multer.File,
  leadId: string,
  assetType: string
): Promise<string> {
  const supabase = getStorageClient();
  const bucketName = process.env.SB_BUCKET_SPONSOR_CREATIVES || 'sponsor-creatives';
  
  // Validate file type
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
  if (!allowedTypes.includes(file.mimetype)) {
    throw new Error(`Invalid file type: ${file.mimetype}. Only JPEG, PNG, and WebP images are allowed.`);
  }
  
  // Generate unique path
  const timestamp = Date.now();
  const safeFilename = slugify(file.originalname, { lower: true, strict: true });
  const path = `leads/${leadId}/${timestamp}-${assetType}-${safeFilename}`;
  
  // Upload to Supabase Storage
  const { data, error } = await supabase.storage
    .from(bucketName)
    .upload(path, file.buffer, {
      contentType: file.mimetype,
      upsert: false
    });
  
  if (error) {
    console.error('Storage upload error:', error);
    throw new Error(`Failed to upload file: ${error.message}`);
  }
  
  // Get public URL
  const { data: urlData } = supabase.storage
    .from(bucketName)
    .getPublicUrl(data.path);
  
  return urlData.publicUrl;
}

// Upload multiple sponsor creative files
export async function uploadSponsorCreatives(
  files: { [fieldname: string]: Express.Multer.File[] } | undefined,
  leadId: string,
  packageCode: string
): Promise<{
  events_desktop_asset_url?: string;
  events_mobile_asset_url?: string;
  home_desktop_asset_url?: string;
  home_mobile_asset_url?: string;
}> {
  if (!files) {
    return {};
  }
  
  const uploadedUrls: any = {};
  
  // Process files based on package type
  try {
    if (packageCode === 'events_spotlight' || packageCode === 'full_feature') {
      if (files.events_desktop?.[0]) {
        uploadedUrls.events_desktop_asset_url = await uploadSponsorCreative(
          files.events_desktop[0],
          leadId,
          'events-desktop'
        );
      }
      
      if (files.events_mobile?.[0]) {
        uploadedUrls.events_mobile_asset_url = await uploadSponsorCreative(
          files.events_mobile[0],
          leadId,
          'events-mobile'
        );
      }
    }
    
    if (packageCode === 'homepage_feature' || packageCode === 'full_feature') {
      if (files.home_desktop?.[0]) {
        uploadedUrls.home_desktop_asset_url = await uploadSponsorCreative(
          files.home_desktop[0],
          leadId,
          'home-desktop'
        );
      }
      
      if (files.home_mobile?.[0]) {
        uploadedUrls.home_mobile_asset_url = await uploadSponsorCreative(
          files.home_mobile[0],
          leadId,
          'home-mobile'
        );
      }
    }
    
    return uploadedUrls;
  } catch (error) {
    console.error('Error uploading sponsor creatives:', error);
    throw error;
  }
}

// Upload featured event image
export async function uploadFeaturedEventImage(
  file: Express.Multer.File
): Promise<string> {
  const supabase = getStorageClient();
  const bucketName = 'featured-events';
  
  // Validate file type
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  if (!allowedTypes.includes(file.mimetype)) {
    throw new Error(`Invalid file type: ${file.mimetype}. Only JPEG, PNG, WebP, and GIF images are allowed.`);
  }
  
  // Generate unique path with timestamp
  const timestamp = Date.now();
  const safeFilename = slugify(file.originalname, { lower: true, strict: true });
  const path = `${timestamp}-${safeFilename}`;
  
  // Create bucket if it doesn't exist
  const { data: bucketData, error: bucketError } = await supabase.storage.getBucket(bucketName);
  if (bucketError && bucketError.message.includes('not found')) {
    const { error: createError } = await supabase.storage.createBucket(bucketName, {
      public: true, // Make the bucket public for easy access
      fileSizeLimit: 5242880, // 5MB limit
      allowedMimeTypes: allowedTypes
    });
    if (createError) {
      console.error('Failed to create bucket:', createError);
      throw new Error(`Failed to create storage bucket: ${createError.message}`);
    }
  }
  
  // Upload to Supabase Storage
  const { data, error } = await supabase.storage
    .from(bucketName)
    .upload(path, file.buffer, {
      contentType: file.mimetype,
      upsert: false
    });
  
  if (error) {
    console.error('Storage upload error:', error);
    throw new Error(`Failed to upload file: ${error.message}`);
  }
  
  // Get public URL
  const { data: urlData } = supabase.storage
    .from(bucketName)
    .getPublicUrl(data.path);
  
  return urlData.publicUrl;
}

// Upload community post image
export async function uploadCommunityPostImage(
  file: Express.Multer.File,
  communityId: string
): Promise<string> {
  const supabase = getStorageClient();
  const bucketName = 'community-posts';
  
  // Validate file type - support both images and videos
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'video/mp4', 'video/webm'];
  if (!allowedTypes.includes(file.mimetype)) {
    throw new Error(`Invalid file type: ${file.mimetype}. Only JPEG, PNG, WebP, GIF images and MP4, WebM videos are allowed.`);
  }
  
  // Validate file size (max 50MB for videos, 5MB for images)
  const isVideo = file.mimetype.startsWith('video/');
  const maxSize = isVideo ? 50 * 1024 * 1024 : 5 * 1024 * 1024; // 50MB for videos, 5MB for images
  if (file.size > maxSize) {
    throw new Error(`File size must be less than ${isVideo ? '50MB' : '5MB'}`);
  }
  
  // Generate unique path
  const timestamp = Date.now();
  const safeFilename = slugify(file.originalname, { lower: true, strict: true });
  const path = `communities/${communityId}/posts/${timestamp}-${safeFilename}`;
  
  // Create bucket if it doesn't exist
  const { error: bucketError } = await supabase.storage.getBucket(bucketName);
  if (bucketError && bucketError.message.includes('not found')) {
    const { error: createError } = await supabase.storage.createBucket(bucketName, {
      public: true,
      fileSizeLimit: maxSize,
      allowedMimeTypes: allowedTypes
    });
    if (createError) {
      console.error('Failed to create community posts bucket:', createError);
      throw new Error(`Failed to create storage bucket: ${createError.message}`);
    }
  }
  
  // Upload to Supabase Storage
  const { data, error } = await supabase.storage
    .from(bucketName)
    .upload(path, file.buffer, {
      contentType: file.mimetype,
      upsert: false
    });
  
  if (error) {
    console.error('Community post image upload error:', error);
    throw new Error(`Failed to upload image: ${error.message}`);
  }
  
  // Get public URL
  const { data: urlData } = supabase.storage
    .from(bucketName)
    .getPublicUrl(data.path);
  
  return urlData.publicUrl;
}

// Upload community cover image
export async function uploadCommunityCoverImage(
  file: Express.Multer.File,
  communityId: string
): Promise<string> {
  const supabase = getStorageClient();
  const bucketName = 'community-covers';
  
  // Validate file type
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
  if (!allowedTypes.includes(file.mimetype)) {
    throw new Error(`Invalid file type: ${file.mimetype}. Only JPEG, PNG, and WebP images are allowed.`);
  }
  
  // Validate file size (max 5MB)
  const maxSize = 5 * 1024 * 1024; // 5MB
  if (file.size > maxSize) {
    throw new Error('File size must be less than 5MB');
  }
  
  // Generate unique path
  const timestamp = Date.now();
  const safeFilename = slugify(file.originalname, { lower: true, strict: true });
  const path = `communities/${communityId}/cover/${timestamp}-${safeFilename}`;
  
  // Create bucket if it doesn't exist
  const { error: bucketError } = await supabase.storage.getBucket(bucketName);
  if (bucketError && bucketError.message.includes('not found')) {
    const { error: createError } = await supabase.storage.createBucket(bucketName, {
      public: true,
      fileSizeLimit: maxSize,
      allowedMimeTypes: allowedTypes
    });
    if (createError) {
      console.error('Failed to create community covers bucket:', createError);
      throw new Error(`Failed to create storage bucket: ${createError.message}`);
    }
  }
  
  // Upload to Supabase Storage
  const { data, error } = await supabase.storage
    .from(bucketName)
    .upload(path, file.buffer, {
      contentType: file.mimetype,
      upsert: false
    });
  
  if (error) {
    console.error('Community cover image upload error:', error);
    throw new Error(`Failed to upload cover image: ${error.message}`);
  }
  
  // Get public URL
  const { data: urlData } = supabase.storage
    .from(bucketName)
    .getPublicUrl(data.path);
  
  return urlData.publicUrl;
}

// Upload community profile image
export async function uploadCommunityProfileImage(
  file: Express.Multer.File,
  communityId: string
): Promise<string> {
  const supabase = getStorageClient();
  const bucketName = 'community-profiles';
  
  // Validate file type
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
  if (!allowedTypes.includes(file.mimetype)) {
    throw new Error(`Invalid file type: ${file.mimetype}. Only JPEG, PNG, and WebP images are allowed.`);
  }
  
  // Validate file size (max 5MB)
  const maxSize = 5 * 1024 * 1024; // 5MB
  if (file.size > maxSize) {
    throw new Error('File size must be less than 5MB');
  }
  
  // Generate unique path
  const timestamp = Date.now();
  const safeFilename = slugify(file.originalname, { lower: true, strict: true });
  const path = `communities/${communityId}/profile/${timestamp}-${safeFilename}`;
  
  // Create bucket if it doesn't exist
  const { error: bucketError } = await supabase.storage.getBucket(bucketName);
  if (bucketError && bucketError.message.includes('not found')) {
    const { error: createError } = await supabase.storage.createBucket(bucketName, {
      public: true,
      fileSizeLimit: maxSize,
      allowedMimeTypes: allowedTypes
    });
    if (createError) {
      console.error('Failed to create community profiles bucket:', createError);
      throw new Error(`Failed to create storage bucket: ${createError.message}`);
    }
  }
  
  // Upload to Supabase Storage
  const { data, error } = await supabase.storage
    .from(bucketName)
    .upload(path, file.buffer, {
      contentType: file.mimetype,
      upsert: false
    });
  
  if (error) {
    console.error('Community profile image upload error:', error);
    throw new Error(`Failed to upload profile image: ${error.message}`);
  }
  
  // Get public URL
  const { data: urlData } = supabase.storage
    .from(bucketName)
    .getPublicUrl(data.path);
  
  return urlData.publicUrl;
}

// Upload user profile image
export async function uploadUserProfileImage(
  file: Express.Multer.File,
  userId: string
): Promise<string> {
  const supabase = getStorageClient();
  const bucketName = 'user-profiles';
  
  // Validate file type
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
  if (!allowedTypes.includes(file.mimetype)) {
    throw new Error(`Invalid file type: ${file.mimetype}. Only JPEG, PNG, and WebP images are allowed.`);
  }
  
  // Validate file size (max 5MB)
  const maxSize = 5 * 1024 * 1024; // 5MB
  if (file.size > maxSize) {
    throw new Error('File size must be less than 5MB');
  }
  
  // Generate unique path
  const timestamp = Date.now();
  const safeFilename = slugify(file.originalname, { lower: true, strict: true });
  const path = `users/${userId}/profile/${timestamp}-${safeFilename}`;
  
  // Create bucket if it doesn't exist
  const { error: bucketError } = await supabase.storage.getBucket(bucketName);
  if (bucketError && bucketError.message.includes('not found')) {
    const { error: createError } = await supabase.storage.createBucket(bucketName, {
      public: true,
      fileSizeLimit: maxSize,
      allowedMimeTypes: allowedTypes
    });
    if (createError) {
      console.error('Failed to create user profiles bucket:', createError);
      throw new Error(`Failed to create storage bucket: ${createError.message}`);
    }
  }
  
  // Upload to Supabase Storage
  const { data, error } = await supabase.storage
    .from(bucketName)
    .upload(path, file.buffer, {
      contentType: file.mimetype,
      upsert: false
    });
  
  if (error) {
    console.error('User profile image upload error:', error);
    throw new Error(`Failed to upload profile image: ${error.message}`);
  }
  
  // Get public URL
  const { data: urlData } = supabase.storage
    .from(bucketName)
    .getPublicUrl(data.path);
  
  return urlData.publicUrl;
}

// Generate signed URL for private assets (optional, for future use)
export async function getSignedUrl(path: string, expiresIn: number = 300): Promise<string> {
  const supabase = getStorageClient();
  const bucketName = process.env.SB_BUCKET_SPONSOR_CREATIVES || 'sponsor-creatives';
  
  const { data, error } = await supabase.storage
    .from(bucketName)
    .createSignedUrl(path, expiresIn);
  
  if (error) {
    throw new Error(`Failed to generate signed URL: ${error.message}`);
  }
  
  return data.signedUrl;
}

// Upload resume for job application
export async function uploadResume(
  file: Express.Multer.File
): Promise<string> {
  const supabase = getStorageClient();
  const bucketName = 'resumes';
  
  // Validate file type - support PDF, DOC, DOCX
  const allowedTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ];
  if (!allowedTypes.includes(file.mimetype)) {
    throw new Error(`Invalid file type: ${file.mimetype}. Only PDF, DOC, and DOCX files are allowed.`);
  }
  
  // Validate file size (max 5MB)
  const maxSize = 5 * 1024 * 1024; // 5MB
  if (file.size > maxSize) {
    throw new Error('Resume file size must be less than 5MB');
  }
  
  // Generate unique path
  const timestamp = Date.now();
  const safeFilename = slugify(file.originalname, { lower: true, strict: true });
  const path = `${timestamp}-${safeFilename}`;
  
  // Create bucket if it doesn't exist
  const { error: bucketError } = await supabase.storage.getBucket(bucketName);
  if (bucketError && bucketError.message.includes('not found')) {
    const { error: createError } = await supabase.storage.createBucket(bucketName, {
      public: true, // Public so applicants can share the link
      fileSizeLimit: maxSize,
      allowedMimeTypes: allowedTypes
    });
    if (createError) {
      console.error('Failed to create resumes bucket:', createError);
      throw new Error(`Failed to create storage bucket: ${createError.message}`);
    }
  }
  
  // Upload to Supabase Storage
  const { data, error } = await supabase.storage
    .from(bucketName)
    .upload(path, file.buffer, {
      contentType: file.mimetype,
      upsert: false
    });
  
  if (error) {
    console.error('Resume upload error:', error);
    throw new Error(`Failed to upload resume: ${error.message}`);
  }
  
  // Get public URL
  const { data: urlData } = supabase.storage
    .from(bucketName)
    .getPublicUrl(data.path);
  
  return urlData.publicUrl;
}