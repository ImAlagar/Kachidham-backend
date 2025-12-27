// services/subcategoryQuantityPriceService.js
import prisma from '../config/database.js';
import logger from '../utils/logger.js';

class SubcategoryQuantityPriceService {
  
  // Get all subcategories with quantity pricing
  async getSubcategoriesWithQuantityPricing() {
    try {
      if (!prisma) {
        throw new Error('Database connection not available');
      }

      const subcategories = await prisma.subcategory.findMany({
        where: {
          isActive: true
        },
        include: {
          category: {
            select: {
              id: true,
              name: true,
              image: true
            }
          },
          quantityPrices: {
            where: {
              isActive: true
            },
            orderBy: {
              quantity: 'asc'
            }
          },
          products: {
            where: { status: 'ACTIVE' },
            select: {
              id: true
            }
          }
        },
        orderBy: {
          name: 'asc'
        }
      });

      return subcategories;
    } catch (error) {
      logger.error('Error fetching subcategories with quantity pricing:', error);
      throw new Error('Failed to fetch subcategories');
    }
  }

  // Add quantity price to subcategory
  async addQuantityPrice(subcategoryId, quantityPriceData) {
    try {
      if (!prisma) {
        throw new Error('Database connection not available');
      }

      const { quantity, priceType, value } = quantityPriceData;

      // Check if subcategory exists
      const subcategory = await prisma.subcategory.findUnique({
        where: { id: subcategoryId }
      });

      if (!subcategory) {
        throw new Error('Subcategory not found');
      }

      // Check if quantity price already exists for this subcategory
      const existingPrice = await prisma.subcategoryQuantityPrice.findFirst({
        where: {
          subcategoryId,
          quantity,
          isActive: true
        }
      });

      if (existingPrice) {
        throw new Error(`Quantity price for quantity ${quantity} already exists for this subcategory`);
      }

      // Validate percentage discount
      if (priceType === 'PERCENTAGE' && value > 100) {
        throw new Error('Discount percentage cannot exceed 100%');
      }

      // Validate quantity
      if (quantity < 2) {
        throw new Error('Quantity must be at least 2');
      }

      const quantityPrice = await prisma.subcategoryQuantityPrice.create({
        data: {
          quantity,
          priceType,
          value,
          subcategoryId,
          isActive: true
        },
        include: {
          subcategory: {
            include: {
              category: {
                select: {
                  id: true,
                  name: true
                }
              }
            }
          }
        }
      });

      logger.info(`Quantity price added to subcategory: ${subcategoryId}`);
      return quantityPrice;
    } catch (error) {
      logger.error('Error adding quantity price:', error);
      throw error;
    }
  }

  // Get quantity prices for a specific subcategory
  async getSubcategoryQuantityPrices(subcategoryId) {
    try {
      if (!prisma) {
        throw new Error('Database connection not available');
      }

      const subcategory = await prisma.subcategory.findUnique({
        where: { id: subcategoryId },
        include: {
          category: {
            select: {
              id: true,
              name: true,
              image: true
            }
          },
          quantityPrices: {
            where: {
              isActive: true
            },
            orderBy: {
              quantity: 'asc'
            }
          }
        }
      });

      if (!subcategory) {
        throw new Error('Subcategory not found');
      }

      return subcategory;
    } catch (error) {
      logger.error('Error fetching subcategory quantity prices:', error);
      throw new Error('Failed to fetch subcategory quantity prices');
    }
  }

  // Update quantity price
  async updateQuantityPrice(quantityPriceId, updateData) {
    try {
      if (!prisma) {
        throw new Error('Database connection not available');
      }

      const { quantity, priceType, value, isActive } = updateData;

      // Check if quantity price exists
      const quantityPrice = await prisma.subcategoryQuantityPrice.findUnique({
        where: { id: quantityPriceId },
        include: {
          subcategory: true
        }
      });

      if (!quantityPrice) {
        throw new Error('Quantity price not found');
      }

      // Validate percentage discount
      if (priceType === 'PERCENTAGE' && value > 100) {
        throw new Error('Discount percentage cannot exceed 100%');
      }

      // Validate quantity
      if (quantity < 2) {
        throw new Error('Quantity must be at least 2');
      }

      // Check if quantity already exists for this subcategory (excluding current one)
      if (quantity !== quantityPrice.quantity) {
        const existingPrice = await prisma.subcategoryQuantityPrice.findFirst({
          where: {
            subcategoryId: quantityPrice.subcategoryId,
            quantity,
            id: { not: quantityPriceId },
            isActive: true
          }
        });

        if (existingPrice) {
          throw new Error(`Quantity price for quantity ${quantity} already exists for this subcategory`);
        }
      }

      const updatedQuantityPrice = await prisma.subcategoryQuantityPrice.update({
        where: { id: quantityPriceId },
        data: {
          quantity,
          priceType,
          value,
          isActive,
          updatedAt: new Date()
        },
        include: {
          subcategory: {
            include: {
              category: {
                select: {
                  id: true,
                  name: true
                }
              }
            }
          }
        }
      });

      logger.info(`Quantity price updated: ${quantityPriceId}`);
      return updatedQuantityPrice;
    } catch (error) {
      logger.error('Error updating quantity price:', error);
      throw error;
    }
  }

  // Delete quantity price
  async deleteQuantityPrice(quantityPriceId) {
    try {
      // Check if prisma is available
      if (!prisma) {
        logger.error('Prisma is undefined in deleteQuantityPrice');
        throw new Error('Database connection not available');
      }


      // First check if the quantity price exists
      const quantityPrice = await prisma.subcategoryQuantityPrice.findUnique({
        where: { id: quantityPriceId }
      });

      if (!quantityPrice) {
        throw new Error('Quantity price not found');
      }

      // Delete the quantity price
      await prisma.subcategoryQuantityPrice.delete({
        where: { id: quantityPriceId }
      });

      logger.info(`Quantity price deleted: ${quantityPriceId}`);
      return { success: true, message: 'Quantity price deleted successfully' };
    } catch (error) {
      logger.error('Error deleting quantity price:', error);
      console.error('Full error details:', error); // Debug log
      
      // More specific error messages
      if (error.code === 'P2025') {
        throw new Error('Quantity price not found');
      } else if (error.code === 'P2003') {
        throw new Error('Cannot delete quantity price due to existing references');
      }
      
      throw new Error('Failed to delete quantity price: ' + error.message);
    }
  }

  // Toggle quantity price status
  async toggleQuantityPriceStatus(quantityPriceId, isActive) {
    try {
      if (!prisma) {
        throw new Error('Database connection not available');
      }

      const quantityPrice = await prisma.subcategoryQuantityPrice.findUnique({
        where: { id: quantityPriceId }
      });

      if (!quantityPrice) {
        throw new Error('Quantity price not found');
      }

      const activeStatus = isActive === true || isActive === 'true';

      const updatedQuantityPrice = await prisma.subcategoryQuantityPrice.update({
        where: { id: quantityPriceId },
        data: {
          isActive: activeStatus,
          updatedAt: new Date()
        },
        include: {
          subcategory: {
            include: {
              category: {
                select: {
                  id: true,
                  name: true
                }
              }
            }
          }
        }
      });

      logger.info(`Quantity price status updated: ${quantityPriceId} -> ${activeStatus ? 'active' : 'inactive'}`);
      return updatedQuantityPrice;
    } catch (error) {
      logger.error('Error toggling quantity price status:', error);
      throw error;
    }
  }

  // Get quantity price by ID
  async getQuantityPriceById(quantityPriceId) {
    try {
      if (!prisma) {
        throw new Error('Database connection not available');
      }

      const quantityPrice = await prisma.subcategoryQuantityPrice.findUnique({
        where: { id: quantityPriceId },
        include: {
          subcategory: {
            include: {
              category: {
                select: {
                  id: true,
                  name: true
                }
              }
            }
          }
        }
      });

      if (!quantityPrice) {
        throw new Error('Quantity price not found');
      }

      return quantityPrice;
    } catch (error) {
      logger.error('Error fetching quantity price by ID:', error);
      throw new Error('Failed to fetch quantity price');
    }
  }
}

export default new SubcategoryQuantityPriceService();