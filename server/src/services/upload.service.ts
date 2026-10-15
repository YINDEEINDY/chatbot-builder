import { env } from '../config/env.js';
import { v4 as uuidv4 } from 'uuid';
import { AppError } from '../middlewares/errorHandler.js';
import { supabase, uploadToSupabase, deleteFromSupabase } from '../config/supabase.js';
import fs from 'fs/promises';
import path from 'path';

const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
];

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

interface UploadResult {
  id: string;
  url: string;
  filename: string;
  mimeType: string;
  size: number;
}

class UploadService {
  async uploadFile(file: Express.Multer.File): Promise<UploadResult> {
    if (!file) {
      throw new AppError('No file provided', 400);
    }

    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      throw new AppError(
        `Invalid file type. Allowed types: ${ALLOWED_MIME_TYPES.join(', ')}`,
        400
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      throw new AppError(
        `File too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB`,
        400
      );
    }

    const ext = this.getExtension(file.mimetype);
    const id = uuidv4();
    const filename = `${id}${ext}`;

    // Supabase Storage when configured, otherwise local disk served at /uploads.
    const url = supabase
      ? await uploadToSupabase(file.buffer, filename, file.mimetype)
      : await fs.mkdir(path.resolve(env.UPLOAD_DIR), { recursive: true })
        .then(() => fs.writeFile(path.join(path.resolve(env.UPLOAD_DIR), filename), file.buffer))
        .then(() => `${env.PUBLIC_URL}/uploads/${filename}`);

    if (!url) {
      throw new AppError('Failed to upload file to storage', 500);
    }

    return {
      id,
      url,
      filename,
      mimeType: file.mimetype,
      size: file.size,
    };
  }

  async deleteFile(fileId: string): Promise<void> {
    // Try to delete with common extensions
    const extensions = ['.jpg', '.png', '.gif', '.webp'];

    for (const ext of extensions) {
      const filename = `${fileId}${ext}`;
      const success = await deleteFromSupabase(filename);
      if (success) {
        return;
      }
    }
  }

  private getExtension(mimeType: string): string {
    const extensions: Record<string, string> = {
      'image/jpeg': '.jpg',
      'image/png': '.png',
      'image/gif': '.gif',
      'image/webp': '.webp',
    };
    return extensions[mimeType] || '.bin';
  }
}

export const uploadService = new UploadService();
