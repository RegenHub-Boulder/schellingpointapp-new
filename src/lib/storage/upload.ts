'use client';

import { createClient } from '@/lib/supabase/client';

// ============================================================================
// Constants
// ============================================================================

const BUCKET_NAME = 'event-assets';
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

// ============================================================================
// Auth Helpers
// ============================================================================

/**
 * Get the storage key for Supabase auth tokens
 */
function getStorageKey(): string {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  return `sb-${new URL(url).hostname.split('.')[0]}-auth-token`;
}

/**
 * Get the current access token from localStorage
 */
function getAccessToken(): string | null {
  if (typeof window === 'undefined') return null;

  try {
    const stored = localStorage.getItem(getStorageKey());
    if (!stored) return null;

    const session = JSON.parse(stored);
    return session?.access_token || null;
  } catch {
    return null;
  }
}

// ============================================================================
// Types
// ============================================================================

export interface UploadResult {
  success: boolean;
  url?: string;
  error?: string;
}

export interface UploadOptions {
  folder?: string; // e.g., 'logos', 'banners'
  maxSize?: number; // Override default max size
}

// ============================================================================
// Upload Functions
// ============================================================================

/**
 * Generate a unique filename to avoid collisions
 */
function generateUniqueFilename(originalName: string): string {
  const ext = originalName.split('.').pop() || 'png';
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return `${timestamp}-${random}.${ext}`;
}

/**
 * Validate file before upload
 */
function validateFile(file: File, maxSize: number): string | null {
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    return `Invalid file type. Allowed: ${ALLOWED_IMAGE_TYPES.map(t => t.split('/')[1]).join(', ')}`;
  }

  if (file.size > maxSize) {
    const maxMB = Math.round(maxSize / (1024 * 1024));
    return `File too large. Maximum size: ${maxMB}MB`;
  }

  return null; // No error
}

/**
 * Upload an image file to Supabase Storage
 */
export async function uploadImage(
  file: File,
  options: UploadOptions = {}
): Promise<UploadResult> {
  const { folder = 'uploads', maxSize = MAX_FILE_SIZE } = options;

  // Validate file
  const validationError = validateFile(file, maxSize);
  if (validationError) {
    return { success: false, error: validationError };
  }

  // Check for auth token first
  const accessToken = getAccessToken();
  if (!accessToken) {
    return { success: false, error: 'You must be signed in to upload images.' };
  }

  try {
    const supabase = createClient();

    // Set the session from localStorage to ensure the client is authenticated
    // This is necessary because our custom auth hook stores tokens in localStorage
    // but the Supabase client doesn't know about them by default
    const stored = localStorage.getItem(getStorageKey());
    if (stored) {
      const session = JSON.parse(stored);
      if (session?.access_token && session?.refresh_token) {
        await supabase.auth.setSession({
          access_token: session.access_token,
          refresh_token: session.refresh_token,
        });
      }
    }

    // Generate unique path
    const filename = generateUniqueFilename(file.name);
    const path = `${folder}/${filename}`;

    // Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(path, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      // Check for specific error types
      if (uploadError.message.includes('Bucket not found')) {
        return { success: false, error: 'Storage bucket not configured. Please run database migrations.' };
      }
      if (uploadError.message.includes('row-level security') || uploadError.message.includes('new row violates')) {
        return { success: false, error: 'You must be signed in to upload images.' };
      }
      if (uploadError.message.includes('Invalid JWT') || uploadError.message.includes('not authenticated')) {
        return { success: false, error: 'Your session has expired. Please sign in again.' };
      }
      return { success: false, error: `Upload failed: ${uploadError.message}` };
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(path);

    return {
      success: true,
      url: urlData.publicUrl,
    };
  } catch (error) {
    console.error('Unexpected upload error:', error);
    return {
      success: false,
      error: 'Failed to upload image. Please try again.',
    };
  }
}

/**
 * Delete an image from Supabase Storage
 */
export async function deleteImage(url: string): Promise<boolean> {
  try {
    const supabase = createClient();

    // Extract path from URL
    // URL format: https://xxx.supabase.co/storage/v1/object/public/event-assets/folder/filename
    const urlObj = new URL(url);
    const pathMatch = urlObj.pathname.match(/\/object\/public\/event-assets\/(.+)$/);

    if (!pathMatch) {
      console.warn('Could not extract path from URL:', url);
      return false;
    }

    const path = pathMatch[1];

    const { error } = await supabase.storage
      .from(BUCKET_NAME)
      .remove([path]);

    if (error) {
      console.error('Delete error:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Unexpected delete error:', error);
    return false;
  }
}

/**
 * Hook-friendly upload function for event logos
 */
export async function uploadEventLogo(file: File): Promise<UploadResult> {
  return uploadImage(file, { folder: 'logos' });
}

/**
 * Hook-friendly upload function for event banners
 */
export async function uploadEventBanner(file: File): Promise<UploadResult> {
  return uploadImage(file, { folder: 'banners' });
}
