// routes/dashboardRoutes.js
import express from 'express';
import {
  getDashboardData,
  getDashboardOverview,
  getBusinessMetrics,
  getRecentActivities,
  getTopProducts,
  getQuickStats,
  getSalesData,
  getDashboardUpdates
} from '../controllers/dashboardController.js';
import { auth, authorize } from '../middleware/auth.js';

const router = express.Router();

// All dashboard routes are protected and admin-only
router.get('/', auth, authorize('ADMIN'), getDashboardData);
router.get('/overview', auth, authorize('ADMIN'), getDashboardOverview);
router.get('/business-metrics', auth, authorize('ADMIN'), getBusinessMetrics);
router.get('/recent-activities', auth, authorize('ADMIN'), getRecentActivities);
router.get('/top-products', auth, authorize('ADMIN'), getTopProducts);
router.get('/quick-stats', auth, authorize('ADMIN'), getQuickStats);
router.get('/sales-data', auth, authorize('ADMIN'), getSalesData);
router.get('/updates', auth, authorize('ADMIN'), getDashboardUpdates);



export default router;