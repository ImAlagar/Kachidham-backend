// ratingRoutes.js - Update the field name
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
  markHelpful,
  deleteRatingImage,
} from '../controllers/ratingController.js';
import { auth, authorize } from '../middleware/auth.js';
import { validateRating } from '../middleware/validation.js';
import multer from 'multer';

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB per file
    files: 5 // Maximum 5 files
  },
  fileFilter: (req, file, cb) => {
    // Allow common image types
    const allowedTypes = [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/webp',
      'image/gif'
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Invalid file type. Only ${allowedTypes.join(', ')} are allowed`), false);
    }
  }
});

// Public routes
router.get('/product/:productId', getProductRatings);

// User routes (authenticated users)
// Change from 'images' to 'reviewImages' to match frontend
router.post('/', auth, upload.array('reviewImages', 5), validateRating, createRating);
router.get('/user/my-ratings', auth, getUserRatings);
router.put('/:ratingId', auth, upload.array('reviewImages', 5), updateRating);
router.delete('/:ratingId', auth, deleteRating);
router.post('/:ratingId/helpful', auth, markHelpful);
router.delete('/images/:imageId', auth, deleteRatingImage);

// Admin only routes
router.get('/admin', auth, authorize('ADMIN'), getAllRatings);
router.get('/admin/stats', auth, authorize('ADMIN'), getRatingStats);
router.get('/admin/:ratingId', auth, authorize('ADMIN'), getRatingById);
router.patch('/admin/:ratingId/approval', auth, authorize('ADMIN'), toggleRatingApproval);
router.patch('/admin/bulk/approval', auth, authorize('ADMIN'), bulkUpdateRatingApproval);

export default router;