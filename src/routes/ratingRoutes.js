import express from 'express';
import {
  getAllRatings,
  getRatingById,
  createRating,
  updateRating,
  deleteRating,
  toggleRatingApproval,
  getRatingStats,
  getProductRatings,
  getUserRatings,
  bulkUpdateRatingApproval,
  markHelpful // Add this
} from '../controllers/ratingController.js';
import { auth, authorize } from '../middleware/auth.js';
import { validateRating } from '../middleware/validation.js';

const router = express.Router();

// Public routes
router.get('/product/:productId', getProductRatings);

// User routes (authenticated users)
router.post('/', auth, validateRating, createRating);
router.get('/user/my-ratings', auth, getUserRatings);
router.put('/:ratingId', auth, updateRating);
router.delete('/:ratingId', auth, deleteRating);
router.post('/:ratingId/helpful', auth, markHelpful); // Add this line

// Admin only routes
router.get('/admin', auth, authorize('ADMIN'), getAllRatings);
router.get('/admin/stats', auth, authorize('ADMIN'), getRatingStats);
router.get('/admin/:ratingId', auth, authorize('ADMIN'), getRatingById);
router.patch('/admin/:ratingId/approval', auth, authorize('ADMIN'), toggleRatingApproval);
router.patch('/admin/bulk/approval', auth, authorize('ADMIN'), bulkUpdateRatingApproval);

export default router;