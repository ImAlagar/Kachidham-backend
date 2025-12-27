import { dashboardService } from '../services/index.js';
import { asyncHandler } from '../utils/helpers.js';
import logger from '../utils/logger.js';
import prisma from '../config/database.js';

// Helper function to check database availability
const checkDatabase = () => {
  if (!prisma) {
    logger.error('Prisma client is not available');
    throw new Error('Database connection not available');
  }
  return true;
};

// Fallback data functions
const getFallbackData = (error) => {
  logger.error('Fallback data due to:', error.message);
  return null;
};

const getDefaultOverview = () => {
  return {
    totalRevenue: { value: 0, change: 0, label: 'Total Revenue' },
    totalOrders: { value: 0, change: 0, label: 'Total Orders' },
    totalProducts: { value: 0, change: 0, label: 'Active Products' },
    totalCustomers: { value: 0, change: 0, label: 'Customers' }
  };
};

const getDefaultBusinessMetrics = () => {
  return {
    activeSliders: { value: 0, label: 'Active Sliders' },
    pendingOrders: { value: 0, label: 'Pending Orders' },
    lowStockProducts: { value: 0, label: 'Low Stock' },
    pendingContacts: { value: 0, label: 'Pending Contacts' },
    conversionRate: { value: 0, change: 0, label: 'Conversion Rate' },
    averageOrderValue: { value: 0, change: 0, label: 'Avg Order Value' }
  };
};

const getDefaultQuickStats = () => {
  return {
    wholesalers: { count: 0, pending: 0 },
    categories: { count: 0, active: 0 },
    subcategories: { count: 0, active: 0 },
    ratings: { total: 0, pending: 0 }
  };
};

// Get complete dashboard data
export const getDashboardData = asyncHandler(async (req, res) => {
  const { timeRange = 'monthly' } = req.query;
  
  logger.info(`Fetching dashboard data for time range: ${timeRange}`);

  try {
    // Check database first
    checkDatabase();

    // Use Promise.allSettled to handle individual failures gracefully
    const results = await Promise.allSettled([
      dashboardService.getDashboardOverview(timeRange),
      dashboardService.getBusinessMetrics(),
      dashboardService.getRecentActivities(),
      dashboardService.getTopProducts(),
      dashboardService.getQuickStats(),
      dashboardService.getSalesData(timeRange)
    ]);

    // Log any failures for debugging
    const componentNames = ['overview', 'businessMetrics', 'recentActivities', 'topProducts', 'quickStats', 'salesData'];
    results.forEach((result, index) => {
      if (result.status === 'rejected') {
        logger.error(`Dashboard component ${componentNames[index]} failed:`, result.reason);
      }
    });

    // Extract values from settled promises
    const [overview, businessMetrics, recentActivities, topProducts, quickStats, salesData] = 
      results.map((result, index) => {
        if (result.status === 'fulfilled') {
          return result.value;
        } else {
          logger.warn(`Using fallback data for ${componentNames[index]}`);
          return getFallbackData(result.reason);
        }
      });

    // Build dashboard data with fallbacks
    const dashboardData = {
      overview: overview || getDefaultOverview(),
      business: businessMetrics || getDefaultBusinessMetrics(),
      recentActivities: recentActivities || [],
      topProducts: topProducts || [],
      quickStats: quickStats || getDefaultQuickStats(),
      salesData: salesData || { labels: [], values: [] },
      timestamp: new Date().toISOString()
    };

    res.status(200).json({
      success: true,
      message: 'Dashboard data fetched successfully',
      data: dashboardData
    });
  } catch (error) {
    logger.error('Critical error in getDashboardData:', error);
    
    // Return fallback data instead of error for better UX
    res.status(200).json({
      success: true,
      message: 'Dashboard data loaded with fallback values',
      data: {
        overview: getDefaultOverview(),
        business: getDefaultBusinessMetrics(),
        recentActivities: [],
        topProducts: [],
        quickStats: getDefaultQuickStats(),
        salesData: { labels: [], values: [] },
        timestamp: new Date().toISOString()
      }
    });
  }
});

// Get only overview statistics
export const getDashboardOverview = asyncHandler(async (req, res) => {
  const { timeRange = 'monthly' } = req.query;

  try {
    checkDatabase();
    const overview = await dashboardService.getDashboardOverview(timeRange);

    res.status(200).json({
      success: true,
      message: 'Dashboard overview fetched successfully',
      data: overview
    });
  } catch (error) {
    logger.error('Error in getDashboardOverview:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch dashboard overview'
    });
  }
});

// Get business metrics
export const getBusinessMetrics = asyncHandler(async (req, res) => {
  try {
    checkDatabase();
    const businessMetrics = await dashboardService.getBusinessMetrics();

    res.status(200).json({
      success: true,
      message: 'Business metrics fetched successfully',
      data: businessMetrics
    });
  } catch (error) {
    logger.error('Error in getBusinessMetrics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch business metrics'
    });
  }
});

// Get recent activities
export const getRecentActivities = asyncHandler(async (req, res) => {
  const { limit = 10 } = req.query;

  try {
    checkDatabase();
    const recentActivities = await dashboardService.getRecentActivities(parseInt(limit));

    res.status(200).json({
      success: true,
      message: 'Recent activities fetched successfully',
      data: recentActivities
    });
  } catch (error) {
    logger.error('Error in getRecentActivities:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch recent activities'
    });
  }
});

// Get top products
export const getTopProducts = asyncHandler(async (req, res) => {
  const { limit = 5 } = req.query;

  try {
    checkDatabase();
    const topProducts = await dashboardService.getTopProducts(parseInt(limit));

    res.status(200).json({
      success: true,
      message: 'Top products fetched successfully',
      data: topProducts
    });
  } catch (error) {
    logger.error('Error in getTopProducts:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch top products'
    });
  }
});

// Get quick stats
export const getQuickStats = asyncHandler(async (req, res) => {
  try {
    checkDatabase();
    const quickStats = await dashboardService.getQuickStats();

    res.status(200).json({
      success: true,
      message: 'Quick stats fetched successfully',
      data: quickStats
    });
  } catch (error) {
    logger.error('Error in getQuickStats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch quick stats'
    });
  }
});

// Get sales data for charts
export const getSalesData = asyncHandler(async (req, res) => {
  const { timeRange = 'monthly' } = req.query;

  try {
    checkDatabase();
    const salesData = await dashboardService.getSalesData(timeRange);

    res.status(200).json({
      success: true,
      message: 'Sales data fetched successfully',
      data: salesData
    });
  } catch (error) {
    logger.error('Error in getSalesData:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch sales data'
    });
  }
});

// Get real-time dashboard updates
export const getDashboardUpdates = asyncHandler(async (req, res) => {
  try {
    checkDatabase();
    
    const updates = {
      newOrders: await dashboardService.getPendingOrders(),
      newContacts: await dashboardService.getPendingContacts(),
      lowStockCount: await dashboardService.getLowStockProducts(),
      timestamp: new Date().toISOString()
    };

    res.status(200).json({
      success: true,
      message: 'Dashboard updates fetched successfully',
      data: updates
    });
  } catch (error) {
    logger.error('Error in getDashboardUpdates:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch dashboard updates'
    });
  }
});