import { Request, Response, NextFunction } from 'express';
import { uploadService } from '../services/upload.service.js';

export const uploadController = {
  async uploadFile(req: Request, res: Response, next: NextFunction) {
    try {
      const file = req.file;
      if (!file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      const result = await uploadService.uploadFile(file);
      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  },

  async deleteFile(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      await uploadService.deleteFile(id);
      res.json({ success: true });
    } catch (error) {
      next(error);
    }
  },
};
