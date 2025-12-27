// routes/couponRoutes.js
import express from 'express';
import {
  getCoupons,
  getCoupon,
  createCoupon,
  updateCoupon,
  deleteCoupon,
  validateCoupon,
  getAvailableCoupons,
  toggleCouponStatus, // Add this import
  getCouponStats,     // Add this import
} from '../controllers/couponController.js';
import { auth, authorize } from '../middleware/auth.js';

const router = express.Router();

// Public routes
router.post('/validate', validateCoupon);
router.get('/available', getAvailableCoupons);

// Admin routes
router.get('/', getCoupons);
router.get('/stats', auth, authorize('ADMIN'), getCouponStats); // Add stats route
router.get('/:id', auth, authorize('ADMIN'), getCoupon);
router.post('/', auth, authorize('ADMIN'), createCoupon);
router.put('/:id', auth, authorize('ADMIN'), updateCoupon);
router.delete('/:id', auth, authorize('ADMIN'), deleteCoupon);
router.patch('/:id/status', auth, authorize('ADMIN'), toggleCouponStatus); // Add status toggle route

export default router;