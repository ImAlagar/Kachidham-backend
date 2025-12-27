import express from 'express';
import {
  getAllFaqs,
  getActiveFaqsByCategory,
  getFaqById,
  createFaq,
  updateFaq,
  deleteFaq,
  toggleFaqStatus,
  updateFaqOrder,
  getFaqStats,
  bulkUpdateFaqOrder,
  getFaqCategories
} from '../controllers/faqController.js';
import { auth, authorize } from '../middleware/auth.js';
import { 
  validateFaq, 
  validateFaqUpdate, 
  validateFaqStatus, 
  validateFaqOrder,
  validateBulkFaqOrder 
} from '../middleware/validation.js';

const router = express.Router();

// Public routes
router.get('/', getAllFaqs);
router.get('/categories', getFaqCategories);
router.get('/category/:category', getActiveFaqsByCategory);
router.get('/:faqId', getFaqById);

// Admin only routes
router.get('/admin/stats', auth, authorize('ADMIN'), getFaqStats);
router.post('/admin', auth, authorize('ADMIN'), validateFaq, createFaq);
router.put('/admin/:faqId', auth, authorize('ADMIN'), validateFaqUpdate, updateFaq);
router.patch('/admin/:faqId/status', auth, authorize('ADMIN'), validateFaqStatus, toggleFaqStatus);
router.patch('/admin/:faqId/order', auth, authorize('ADMIN'), validateFaqOrder, updateFaqOrder);
router.put('/admin/bulk/order', auth, authorize('ADMIN'), validateBulkFaqOrder, bulkUpdateFaqOrder);

export default router;