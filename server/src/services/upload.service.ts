import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { env } from '../config/env.js';
import { AppError } from '../middlewares/errorHandler.js';

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
  private uploadDir: string;

  constructor() {
    this.uploadDir = path.resolve(env.UPLOAD_DIR);
    this.ensureUploadDir();
  }

  private ensureUploadDir() {
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }
  }

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
    const filepath = path.join(this.uploadDir, filename);

    // Write file to disk
    fs.writeFileSync(filepath, file.buffer);

    const url = `${env.PUBLIC_URL}/uploads/${filename}`;

    return {
      id,
      url,
      filename,
      mimeType: file.mimetype,
      size: file.size,
    };
  }

  async deleteFile(fileId: string): Promise<void> {
    const files = fs.readdirSync(this.uploadDir);
    const matchingFile = files.find((f) => f.startsWith(fileId));

    if (matchingFile) {
      const filepath = path.join(this.uploadDir, matchingFile);
      fs.unlinkSync(filepath);
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
