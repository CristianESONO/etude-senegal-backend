// src/routes/upload.routes.ts
import express from 'express';
import { 
  uploadImage, 
  uploadMultipleImages, 
  getImage, 
  getImageInfo,
  deleteImage 
} from '../controllers/upload.controller';

const router = express.Router();

router.post('/', uploadImage);
router.post('/multiple', uploadMultipleImages);
router.get('/:id', getImage);
router.get('/:id/info', getImageInfo);
router.delete('/:id', deleteImage);

export default router;