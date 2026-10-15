import { createClient } from '@supabase/supabase-js';
import { env } from './env.js';
import { logger } from '../utils/logger.js';

// Optional: without Supabase, uploads stay on local disk (UPLOAD_DIR).
export const supabase = env.SUPABASE_URL && env.SUPABASE_SERVICE_KEY
  ? createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_KEY, { auth: { autoRefreshToken: false, persistSession: false } })
  : null;
if (!supabase) logger.info('[Supabase] not configured — using local uploads');

export const STORAGE_BUCKET = 'uploads';

export async function uploadToSupabase(
  fileBuffer: Buffer,
  fileName: string,
  mimeType: string
): Promise<string | null> {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(fileName, fileBuffer, {
        contentType: mimeType,
        upsert: true,
      });

    if (error) {
      logger.error('[Supabase] Upload error:', error.message);
      return null;
    }

    // Get public URL
    const { data: urlData } = supabase!.storage
      .from(STORAGE_BUCKET)
      .getPublicUrl(data.path);

    return urlData.publicUrl;
  } catch (error) {
    logger.error('[Supabase] Upload exception:', error);
    return null;
  }
}

export async function deleteFromSupabase(filePath: string): Promise<boolean> {
  if (!supabase) return false;
  try {
    const { error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .remove([filePath]);

    if (error) {
      logger.error('[Supabase] Delete error:', error.message);
      return false;
    }

    return true;
  } catch (error) {
    logger.error('[Supabase] Delete exception:', error);
    return false;
  }
}
