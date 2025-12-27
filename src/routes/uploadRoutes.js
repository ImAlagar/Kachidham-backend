// routes/uploadRoutes.js
import express from 'express';
import UploadController from '../controllers/uploadController.js';
import { auth } from '../middleware/auth.js';
import { uploadSingle, uploadMultiple } from '../config/multer.js';

const router = express.Router();

// Upload multiple custom order images (max 5)
router.post(
  '/custom-order/images',
  auth,
  uploadMultiple,
  UploadController.uploadCustomOrderImages
);

// Upload single custom order image
router.post(
  '/custom-order/image',
  auth,
  uploadSingle,
  UploadController.uploadCustomOrderImage
);

// Delete custom order images
router.delete(
  '/custom-order/images',
  auth,
  UploadController.deleteCustomOrderImages
);

// Get custom order images for an order
router.get(
  '/custom-order/images/:orderId',
  auth,
  UploadController.getCustomOrderImages
);

export default router;