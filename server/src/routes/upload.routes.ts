import { Router } from 'express';
import multer from 'multer';
import { uploadController } from '../controllers/upload.controller.js';
import { auth } from '../middlewares/auth.js';

const router = Router();

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
});

// Upload a file (requires auth)
router.post('/', auth, upload.single('file'), uploadController.uploadFile);

// Delete a file (requires auth)
router.delete('/:id', auth, uploadController.deleteFile);

export default router;
