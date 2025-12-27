// routes/sliderRoutes.js
import express from 'express';
import {
  getActiveSliders,
  getAllSliders,
  getSliderById,
  createSlider,
  updateSlider,
  deleteSlider,
  toggleSliderStatus,
  reorderSliders,
  getSliderStats,
  getSliderPerformance,

} from '../controllers/sliderController.js'; // ← Fix this import
import { auth, authorize } from '../middleware/auth.js';
import { uploadSliderImages } from '../middleware/upload.js';
import { parseFormData, validateCreateSlider, validateUpdateSlider } from '../middleware/validation.js';

const router = express.Router();

// Public routes
router.get('/active', getActiveSliders);

// Admin only routes
router.get('/', auth, authorize('ADMIN'), getAllSliders);
router.get('/stats', auth, authorize('ADMIN'), getSliderStats);
router.get('/performance', auth, authorize('ADMIN'), getSliderPerformance);
router.get('/:sliderId', auth, authorize('ADMIN'), getSliderById);

// Create slider route
router.post('/', 
  auth, 
  authorize('ADMIN'), 
  uploadSliderImages,
  parseFormData,
  validateCreateSlider,
  createSlider
);

// Update slider route
router.put('/:sliderId', 
  auth, 
  authorize('ADMIN'), 
  uploadSliderImages,
  parseFormData,
  validateUpdateSlider,
  updateSlider
);

router.delete('/:sliderId', auth, authorize('ADMIN'), deleteSlider);
router.patch('/:sliderId/status', auth, authorize('ADMIN'), toggleSliderStatus);
router.patch('/reorder', auth, authorize('ADMIN'), reorderSliders);

export default router;