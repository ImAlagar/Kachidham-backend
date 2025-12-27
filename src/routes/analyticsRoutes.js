// routes/analyticsRoutes.js
import express from 'express';
import {
  getAnalyticsData,
  getAnalyticsOverview,
  getRevenueAnalytics,
  getTrafficAnalytics,
  getProductAnalytics,
  getGeographicAnalytics,
  exportAnalyticsData
} from '../controllers/analyticsController.js';
import { auth, authorize } from '../middleware/auth.js';

const router = express.Router();

// All analytics routes are protected and admin-only
router.get('/', auth, authorize('ADMIN'), getAnalyticsData);
router.get('/overview', auth, authorize('ADMIN'), getAnalyticsOverview);
router.get('/revenue', auth, authorize('ADMIN'), getRevenueAnalytics);
router.get('/traffic', auth, authorize('ADMIN'), getTrafficAnalytics);
router.get('/products', auth, authorize('ADMIN'), getProductAnalytics);
router.get('/geographic', auth, authorize('ADMIN'), getGeographicAnalytics);
router.get('/export', auth, authorize('ADMIN'), exportAnalyticsData);

export default router;