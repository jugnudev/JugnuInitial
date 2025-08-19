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