import express from 'express';
import {
  getAllInquiries,
  getInquiryById,
  createInquiry,
  updateInquiryStatus,
  updateInquiry,
  deleteInquiry,
  getInquiryStats,
  getUserInquiries,
  getMyInquiries
} from '../controllers/designInquiryController.js';
import { auth, authorize } from '../middleware/auth.js';

import multer from 'multer';
import { validateDesignInquiry, validateDesignInquiryStatus, validateDesignInquiryUpdate } from '../middleware/validation.js';

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit for reference images
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  }
});

// Public routes
router.post('/', upload.single('referencePicture'), validateDesignInquiry, createInquiry);

// User routes (authenticated)
router.get('/my-inquiries', auth, getMyInquiries);

// Admin routes
router.get('/admin', auth, authorize('ADMIN'), getAllInquiries);
router.get('/admin/stats', auth, authorize('ADMIN'), getInquiryStats);
router.get('/admin/:inquiryId', auth, authorize('ADMIN'), getInquiryById);
router.put('/admin/:inquiryId/status', auth, authorize('ADMIN'), validateDesignInquiryStatus, updateInquiryStatus);
router.put('/admin/:inquiryId', auth, authorize('ADMIN'), upload.single('referencePicture'), validateDesignInquiryUpdate, updateInquiry);
router.delete('/admin/:inquiryId', auth, authorize('ADMIN'), deleteInquiry);

// Get inquiries for specific user (Admin)
router.get('/admin/user/:userId', auth, authorize('ADMIN'), getUserInquiries);

export default router;