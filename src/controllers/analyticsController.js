// controllers/analyticsController.js
import { analyticsService } from '../services/index.js';
import { asyncHandler } from '../utils/helpers.js';
import logger from '../utils/logger.js';

// Get complete analytics data
export const getAnalyticsData = asyncHandler(async (req, res) => {
  const { timeRange = 'monthly' } = req.query;
  
  logger.info(`Fetching analytics data for time range: ${timeRange}`);

  try {
    const [
      overview,
      revenue,
      traffic,
      products,
      geographic
    ] = await Promise.all([
      analyticsService.getAnalyticsOverview(timeRange),
      analyticsService.getRevenueAnalytics(timeRange),
      analyticsService.getTrafficAnalytics(timeRange),
      analyticsService.getProductAnalytics(timeRange),
      analyticsService.getGeographicAnalytics(timeRange)
    ]);

    const analyticsData = {
      overview,
      revenue,
      traffic,
      products,
      geographic,
      timestamp: new Date().toISOString()
    };

    res.status(200).json({
      success: true,
      message: 'Analytics data fetched successfully',
      data: analyticsData
    });
  } catch (error) {
    logger.error('Error in getAnalyticsData:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch analytics data'
    });
  }
});

// Get analytics overview
export const getAnalyticsOverview = asyncHandler(async (req, res) => {
  const { timeRange = 'monthly' } = req.query;

  try {
    const overview = await analyticsService.getAnalyticsOverview(timeRange);

    res.status(200).json({
      success: true,
      message: 'Analytics overview fetched successfully',
      data: overview
    });
  } catch (error) {
    logger.error('Error in getAnalyticsOverview:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch analytics overview'
    });
  }
});

// Get revenue analytics
export const getRevenueAnalytics = asyncHandler(async (req, res) => {
  const { timeRange = 'monthly' } = req.query;

  try {
    const revenue = await analyticsService.getRevenueAnalytics(timeRange);

    res.status(200).json({
      success: true,
      message: 'Revenue analytics fetched successfully',
      data: revenue
    });
  } catch (error) {
    logger.error('Error in getRevenueAnalytics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch revenue analytics'
    });
  }
});

// Get traffic analytics
export const getTrafficAnalytics = asyncHandler(async (req, res) => {
  const { timeRange = 'monthly' } = req.query;

  try {
    const traffic = await analyticsService.getTrafficAnalytics(timeRange);

    res.status(200).json({
      success: true,
      message: 'Traffic analytics fetched successfully',
      data: traffic
    });
  } catch (error) {
    logger.error('Error in getTrafficAnalytics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch traffic analytics'
    });
  }
});

// Get product analytics
export const getProductAnalytics = asyncHandler(async (req, res) => {
  const { timeRange = 'monthly', limit = 5 } = req.query;

  try {
    const products = await analyticsService.getProductAnalytics(timeRange, parseInt(limit));

    res.status(200).json({
      success: true,
      message: 'Product analytics fetched successfully',
      data: products
    });
  } catch (error) {
    logger.error('Error in getProductAnalytics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch product analytics'
    });
  }
});

// Get geographic analytics
export const getGeographicAnalytics = asyncHandler(async (req, res) => {
  const { timeRange = 'monthly' } = req.query;

  try {
    const geographic = await analyticsService.getGeographicAnalytics(timeRange);

    res.status(200).json({
      success: true,
      message: 'Geographic analytics fetched successfully',
      data: geographic
    });
  } catch (error) {
    logger.error('Error in getGeographicAnalytics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch geographic analytics'
    });
  }
});

// Export analytics data
export const exportAnalyticsData = asyncHandler(async (req, res) => {
  const { timeRange = 'monthly', format = 'json' } = req.query;

  try {
    const analyticsData = await analyticsService.getAnalyticsData(timeRange);
    
    // Here you can implement different export formats (CSV, Excel, etc.)
    if (format === 'csv') {
      // Implement CSV export logic
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=analytics.csv');
      // Return CSV data
    } else {
      res.status(200).json({
        success: true,
        message: 'Analytics data exported successfully',
        data: analyticsData
      });
    }
  } catch (error) {
    logger.error('Error in exportAnalyticsData:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to export analytics data'
    });
  }
});