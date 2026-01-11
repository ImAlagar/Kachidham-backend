// routes/discountRoutes.js
import express from 'express';
import {
  createDiscount,
  getAllDiscounts,
  getDiscountById,
  updateDiscount,
  deleteDiscount,
  toggleDiscountActivation,
  applyDiscount,
  getDiscountStats,
  validateDiscount
} from '../controllers/discountController.js';
import { auth, authorize } from '../middleware/auth.js';

const router = express.Router();

// Public routes
router.get('/validate/:code', validateDiscount);

// User routes (authenticated)
router.post('/apply/:orderId/:discountId', auth, applyDiscount);

// Admin routes
router.post('/', auth, authorize('ADMIN'), createDiscount);
router.get('/', auth, authorize('ADMIN'), getAllDiscounts);
router.get('/stats', auth, authorize('ADMIN'), getDiscountStats);
router.get('/:discountId', auth, authorize('ADMIN'), getDiscountById);
router.put('/:discountId', auth, authorize('ADMIN'), updateDiscount);
router.delete('/:discountId', auth, authorize('ADMIN'), deleteDiscount);
router.patch('/:discountId/toggle', auth, authorize('ADMIN'), toggleDiscountActivation);

export default router;