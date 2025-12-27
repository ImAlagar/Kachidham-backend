// routes/customizationRoutes.js
import express from 'express';
import {
  getCustomizationByProductId,
  createCustomization,
  updateCustomization,
  toggleCustomizationStatus,
  deleteCustomization
} from '../controllers/customizationController.js';
import { auth, authorize } from '../middleware/auth.js';

const router = express.Router();

// Public routes
router.get('/product/:productId', getCustomizationByProductId);

// Admin only routes
router.post('/admin', auth, authorize('ADMIN'), createCustomization);
router.put('/admin/:customizationId', auth, authorize('ADMIN'), updateCustomization);
router.patch('/admin/:customizationId/status', auth, authorize('ADMIN'), toggleCustomizationStatus);
router.delete('/admin/:customizationId', auth, authorize('ADMIN'), deleteCustomization);

export default router;