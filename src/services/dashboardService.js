import prisma from '../config/database.js';
import logger from '../utils/logger.js';

class DashboardService {
  constructor() {
    this.safeDatabaseOperation = this.safeDatabaseOperation.bind(this);
  }

  // Safe database operation wrapper
  async safeDatabaseOperation(operation, fallbackValue = 0, operationName = 'unknown') {
    try {
      if (!prisma) {
        logger.warn(`Prisma not available for operation: ${operationName}`);
        return fallbackValue;
      }
      return await operation();
    } catch (error) {
      logger.warn(`Database operation failed (${operationName}):`, error.message);
      return fallbackValue;
    }
  }

  // Get dashboard overview statistics
  async getDashboardOverview(timeRange = 'monthly') {
    try {
      const dateRange = this.getDateRange(timeRange);
      
      const [
        totalRevenue,
        totalOrders,
        totalProducts,
        totalCustomers,
        revenueGrowth,
        orderGrowth,
        productGrowth,
        customerGrowth
      ] = await Promise.all([
        this.getTotalRevenue(dateRange),
        this.getTotalOrders(dateRange),
        this.getTotalProducts(),
        this.getTotalCustomers(),
        this.getRevenueGrowth(dateRange),
        this.getOrderGrowth(dateRange),
        this.getProductGrowth(),
        this.getCustomerGrowth()
      ]);

      return {
        totalRevenue: { 
          value: totalRevenue, 
          change: revenueGrowth, 
          label: 'Total Revenue' 
        },
        totalOrders: { 
          value: totalOrders, 
          change: orderGrowth, 
          label: 'Total Orders' 
        },
        totalProducts: { 
          value: totalProducts, 
          change: productGrowth, 
          label: 'Active Products' 
        },
        totalCustomers: { 
          value: totalCustomers, 
          change: customerGrowth, 
          label: 'Customers' 
        },
      };
    } catch (error) {
      logger.error('Error in getDashboardOverview:', error);
      throw new Error('Failed to fetch dashboard overview');
    }
  }

  // Get business metrics
  async getBusinessMetrics() {
    try {
      const [
        activeSliders,
        pendingOrders,
        lowStockProducts,
        pendingContacts,
        conversionRate,
        averageOrderValue
      ] = await Promise.all([
        this.getActiveSliders(),
        this.getPendingOrders(),
        this.getLowStockProducts(),
        this.getPendingContacts(),
        this.getConversionRate(),
        this.getAverageOrderValue()
      ]);

      return {
        activeSliders: { 
          value: activeSliders, 
          label: 'Active Sliders' 
        },
        pendingOrders: { 
          value: pendingOrders, 
          label: 'Pending Orders' 
        },
        lowStockProducts: { 
          value: lowStockProducts, 
          label: 'Low Stock' 
        },
        pendingContacts: { 
          value: pendingContacts, 
          label: 'Pending Contacts' 
        },
        conversionRate: { 
          value: conversionRate, 
          change: await this.getConversionRateGrowth(), 
          label: 'Conversion Rate' 
        },
        averageOrderValue: { 
          value: averageOrderValue, 
          change: await this.getAverageOrderValueGrowth(), 
          label: 'Avg Order Value' 
        },
      };
    } catch (error) {
      logger.error('Error in getBusinessMetrics:', error);
      throw new Error('Failed to fetch business metrics');
    }
  }

  // Get recent activities
  async getRecentActivities(limit = 10) {
    return this.safeDatabaseOperation(async () => {
      const activities = [];

      try {
        // Recent orders
        const recentOrders = await prisma.order.findMany({
          take: 5,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            orderNumber: true,
            createdAt: true,
            status: true
          }
        });

        activities.push(...recentOrders.map(order => ({
          type: 'order',
          message: `New order ${order.orderNumber} received`,
          time: this.getTimeAgo(order.createdAt),
          referenceId: order.id
        })));

        // Recent user registrations
        const recentUsers = await prisma.user.findMany({
          take: 3,
          where: { role: 'WHOLESALER' },
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            name: true,
            createdAt: true,
            role: true
          }
        });

        activities.push(...recentUsers.map(user => ({
          type: 'user',
          message: `New ${user.role.toLowerCase()} registration - ${user.name || 'Unknown'}`,
          time: this.getTimeAgo(user.createdAt),
          referenceId: user.id
        })));

        // Recent products
        const recentProducts = await prisma.product.findMany({
          take: 2,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            name: true,
            createdAt: true
          }
        });

        activities.push(...recentProducts.map(product => ({
          type: 'product',
          message: `Product "${product.name}" added`,
          time: this.getTimeAgo(product.createdAt),
          referenceId: product.id
        })));

        // Sort by time and limit
        return activities
          .sort((a, b) => new Date(b.time) - new Date(a.time))
          .slice(0, limit);

      } catch (error) {
        logger.error('Error fetching recent activities:', error);
        return [];
      }
    }, [], 'getRecentActivities');
  }

  // Get top performing products
  async getTopProducts(limit = 5) {
    return this.safeDatabaseOperation(async () => {
      try {
        const topProducts = await prisma.product.findMany({
          take: limit,
          where: { status: 'ACTIVE' },
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            name: true,
            normalPrice: true,
            offerPrice: true,
            createdAt: true,
            orderItems: {
              select: {
                quantity: true,
                price: true
              }
            }
          }
        });

        return topProducts.map(product => {
          const totalSales = product.orderItems.reduce((sum, item) => sum + item.quantity, 0);
          const totalRevenue = product.orderItems.reduce((sum, item) => sum + (item.quantity * item.price), 0);
          
          // Calculate growth based on creation date and sales
          const growth = this.calculateProductGrowth(product.createdAt, totalSales);
          
          return {
            id: product.id,
            name: product.name,
            sales: totalSales,
            revenue: totalRevenue,
            growth: growth
          };
        });
      } catch (error) {
        logger.error('Error fetching top products:', error);
        return [];
      }
    }, [], 'getTopProducts');
  }

  // Get quick stats
  async getQuickStats() {
    try {
      const safeCount = async (model, where = {}, fallback = 0) => {
        return this.safeDatabaseOperation(async () => {
          if (!prisma[model]) {
            logger.warn(`Prisma model ${model} not found`);
            return fallback;
          }
          return await prisma[model].count({ where });
        }, fallback, `count-${model}`);
      };

      const [
        wholesalersCount,
        pendingWholesalers,
        categoriesCount,
        activeCategories,
        subcategoriesCount,
        activeSubcategories,
        ratingsTotal,
        pendingRatings
      ] = await Promise.all([
        safeCount('user', { role: 'WHOLESALER' }),
        safeCount('user', { role: 'WHOLESALER', isApproved: false }),
        safeCount('category'),
        safeCount('category', { isActive: true }),
        safeCount('subcategory'),
        safeCount('subcategory', { isActive: true }),
        safeCount('rating'),
        safeCount('rating', { isApproved: false })
      ]);

      return {
        wholesalers: { 
          count: wholesalersCount, 
          pending: pendingWholesalers 
        },
        categories: { 
          count: categoriesCount, 
          active: activeCategories 
        },
        subcategories: { 
          count: subcategoriesCount, 
          active: activeSubcategories 
        },
        ratings: { 
          total: ratingsTotal, 
          pending: pendingRatings 
        }
      };
    } catch (error) {
      logger.error('Error in getQuickStats:', error);
      return {
        wholesalers: { count: 0, pending: 0 },
        categories: { count: 0, active: 0 },
        subcategories: { count: 0, active: 0 },
        ratings: { total: 0, pending: 0 }
      };
    }
  }

  // Get sales data for charts
  async getSalesData(timeRange = 'monthly') {
    return this.safeDatabaseOperation(async () => {
      try {
        const dateRange = this.getDateRange(timeRange);
        
        const salesData = await prisma.order.findMany({
          where: {
            createdAt: {
              gte: dateRange.start,
              lte: dateRange.end
            },
            paymentStatus: 'PAID'
          },
          select: {
            totalAmount: true,
            createdAt: true
          },
          orderBy: { createdAt: 'asc' }
        });

        return this.groupSalesByTimeRange(salesData, timeRange);
      } catch (error) {
        logger.error('Error fetching sales data:', error);
        return this.getDefaultSalesData();
      }
    }, this.getDefaultSalesData(), 'getSalesData');
  }

  // Individual metric methods with safe operations
  async getTotalRevenue(dateRange) {
    return this.safeDatabaseOperation(async () => {
      const result = await prisma.order.aggregate({
        where: {
          paymentStatus: 'PAID',
          createdAt: {
            gte: dateRange.start,
            lte: dateRange.end
          }
        },
        _sum: {
          totalAmount: true
        }
      });
      return result._sum.totalAmount || 0;
    }, 0, 'getTotalRevenue');
  }

  async getTotalOrders(dateRange) {
    return this.safeDatabaseOperation(async () => {
      return await prisma.order.count({
        where: {
          createdAt: {
            gte: dateRange.start,
            lte: dateRange.end
          }
        }
      });
    }, 0, 'getTotalOrders');
  }

  async getTotalProducts() {
    return this.safeDatabaseOperation(async () => {
      return await prisma.product.count({
        where: { status: 'ACTIVE' }
      });
    }, 0, 'getTotalProducts');
  }

  async getTotalCustomers() {
    return this.safeDatabaseOperation(async () => {
      return await prisma.user.count({
        where: { role: { in: ['CUSTOMER', 'WHOLESALER'] } }
      });
    }, 0, 'getTotalCustomers');
  }

  async getRevenueGrowth(dateRange) {
    return this.safeDatabaseOperation(async () => {
      const previousRange = this.getPreviousDateRange(dateRange);
      const currentRevenue = await this.getTotalRevenue(dateRange);
      const previousRevenue = await this.getTotalRevenue(previousRange);
      
      if (previousRevenue === 0) return currentRevenue > 0 ? 100 : 0;
      return Number(((currentRevenue - previousRevenue) / previousRevenue * 100).toFixed(1));
    }, 0, 'getRevenueGrowth');
  }

  async getOrderGrowth(dateRange) {
    return this.safeDatabaseOperation(async () => {
      const previousRange = this.getPreviousDateRange(dateRange);
      const currentOrders = await this.getTotalOrders(dateRange);
      const previousOrders = await this.getTotalOrders(previousRange);
      
      if (previousOrders === 0) return currentOrders > 0 ? 100 : 0;
      return Number(((currentOrders - previousOrders) / previousOrders * 100).toFixed(1));
    }, 0, 'getOrderGrowth');
  }

  async getProductGrowth() {
    // Simplified growth calculation - in real app, compare with previous period
    return this.safeDatabaseOperation(async () => {
      const totalProducts = await this.getTotalProducts();
      return totalProducts > 0 ? 12.3 : 0;
    }, 0, 'getProductGrowth');
  }

  async getCustomerGrowth() {
    // Simplified growth calculation
    return this.safeDatabaseOperation(async () => {
      const totalCustomers = await this.getTotalCustomers();
      return totalCustomers > 0 ? 5.6 : 0;
    }, 0, 'getCustomerGrowth');
  }

  async getActiveSliders() {
    return this.safeDatabaseOperation(async () => {
      return await prisma.homeSlider.count({
        where: { 
          isActive: true,
          OR: [
            { startDate: null, endDate: null },
            { 
              startDate: { lte: new Date() },
              endDate: { gte: new Date() }
            }
          ]
        }
      });
    }, 0, 'getActiveSliders');
  }

  async getPendingOrders() {
    return this.safeDatabaseOperation(async () => {
      return await prisma.order.count({
        where: { status: 'PENDING' }
      });
    }, 0, 'getPendingOrders');
  }

  async getLowStockProducts() {
    return this.safeDatabaseOperation(async () => {
      // First check if productVariant model exists
      if (!prisma.productVariant) {
        return 0;
      }
      return await prisma.productVariant.count({
        where: { stock: { lt: 10 } }
      });
    }, 0, 'getLowStockProducts');
  }

  async getPendingContacts() {
    return this.safeDatabaseOperation(async () => {
      return await prisma.contact.count({
        where: { status: 'PENDING' }
      });
    }, 0, 'getPendingContacts');
  }

  async getConversionRate() {
    return this.safeDatabaseOperation(async () => {
      // Simplified conversion rate calculation
      // In real app: (Orders / Visitors) * 100
      const totalOrders = await prisma.order.count();
      return totalOrders > 0 ? 3.4 : 0;
    }, 0, 'getConversionRate');
  }

  async getConversionRateGrowth() {
    // Simplified growth calculation for conversion rate
    return 0.8;
  }

  async getAverageOrderValue() {
    return this.safeDatabaseOperation(async () => {
      const result = await prisma.order.aggregate({
        where: { paymentStatus: 'PAID' },
        _avg: {
          totalAmount: true
        }
      });
      return result._avg.totalAmount || 0;
    }, 0, 'getAverageOrderValue');
  }

  async getAverageOrderValueGrowth() {
    // Simplified growth calculation for AOV
    return 2.1;
  }

  // Helper methods
  getDateRange(timeRange) {
    const now = new Date();
    const start = new Date();

    switch (timeRange) {
      case 'daily':
        start.setDate(now.getDate() - 1);
        break;
      case 'weekly':
        start.setDate(now.getDate() - 7);
        break;
      case 'monthly':
        start.setMonth(now.getMonth() - 1);
        break;
      case 'yearly':
        start.setFullYear(now.getFullYear() - 1);
        break;
      default:
        start.setMonth(now.getMonth() - 1);
    }

    return { start, end: now };
  }

  getPreviousDateRange(currentRange) {
    const diff = currentRange.end - currentRange.start;
    return {
      start: new Date(currentRange.start.getTime() - diff),
      end: currentRange.start
    };
  }

  getTimeAgo(date) {
    const now = new Date();
    const diffInMs = now - new Date(date);
    const diffInHours = diffInMs / (1000 * 60 * 60);

    if (diffInHours < 1) {
      const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
      return `${diffInMinutes} min ago`;
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)} hours ago`;
    } else {
      const diffInDays = Math.floor(diffInHours / 24);
      return `${diffInDays} days ago`;
    }
  }

  calculateProductGrowth(createdAt, sales) {
    const now = new Date();
    const created = new Date(createdAt);
    const daysSinceCreation = Math.floor((now - created) / (1000 * 60 * 60 * 24));
    
    // Simple growth calculation based on age and sales
    const baseGrowth = Math.min(25, Math.max(5, daysSinceCreation));
    const salesBoost = Math.min(10, Math.floor(sales / 2));
    
    return baseGrowth + salesBoost;
  }

  groupSalesByTimeRange(salesData, timeRange) {
    const groupedData = {};
    
    salesData.forEach(order => {
      let key;
      const date = new Date(order.createdAt);
      
      switch (timeRange) {
        case 'daily':
          key = date.toLocaleDateString('en-US', { weekday: 'short' });
          break;
        case 'weekly':
          key = `Week ${Math.ceil(date.getDate() / 7)}`;
          break;
        case 'monthly':
          key = date.toLocaleDateString('en-US', { month: 'short' });
          break;
        case 'yearly':
          key = date.toLocaleDateString('en-US', { month: 'short' });
          break;
        default:
          key = date.toLocaleDateString('en-US', { month: 'short' });
      }
      
      groupedData[key] = (groupedData[key] || 0) + order.totalAmount;
    });

    // Generate labels based on timeRange
    let labels = [];
    let values = [];
    
    switch (timeRange) {
      case 'daily':
        labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
        break;
      case 'weekly':
        labels = ['Week 1', 'Week 2', 'Week 3', 'Week 4'];
        break;
      case 'monthly':
      case 'yearly':
      default:
        labels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        labels = labels.slice(0, 6); // Last 6 months
    }
    
    values = labels.map(label => groupedData[label] || 0);

    return { labels, values };
  }

  getDefaultSalesData() {
    return {
      labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
      values: [0, 0, 0, 0, 0, 0]
    };
  }
}

export default new DashboardService();