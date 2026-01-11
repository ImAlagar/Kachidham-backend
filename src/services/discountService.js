// services/discountService.js
import prisma from '../config/database.js';
import logger from '../utils/logger.js';

class DiscountService {
  // Create discount
  async createDiscount(discountData) {
    const {
      name,
      description,
      discountType,
      discountValue,
      productId,
      categoryId,
      subcategoryId,
      minQuantity,
      userType,
      minOrderAmount,
      maxDiscount,
      usageLimit,
      perUserLimit,
      validFrom,
      validUntil,
      isActive = true
    } = discountData;

    // Validate discount value
    if (discountValue <= 0) {
      throw new Error('Discount value must be greater than 0');
    }

    // Validate percentage discount
    if (discountType === 'PERCENTAGE' && discountValue > 100) {
      throw new Error('Percentage discount cannot exceed 100%');
    }

    // Validate dates
    if (new Date(validFrom) >= new Date(validUntil)) {
      throw new Error('Valid from date must be before valid until date');
    }

    // Check if product exists (if specified)
    if (productId) {
      const product = await prisma.product.findUnique({
        where: { id: productId }
      });
      if (!product) {
        throw new Error('Product not found');
      }
    }

    // Check if category exists (if specified)
    if (categoryId) {
      const category = await prisma.category.findUnique({
        where: { id: categoryId }
      });
      if (!category) {
        throw new Error('Category not found');
      }
    }

    // Check if subcategory exists (if specified)
    if (subcategoryId) {
      const subcategory = await prisma.subcategory.findUnique({
        where: { id: subcategoryId }
      });
      if (!subcategory) {
        throw new Error('Subcategory not found');
      }
    }

    const discount = await prisma.discount.create({
      data: {
        name,
        description,
        discountType,
        discountValue,
        productId,
        categoryId,
        subcategoryId,
        minQuantity,
        userType,
        minOrderAmount: minOrderAmount || 0,
        maxDiscount,
        usageLimit,
        perUserLimit: perUserLimit || 1,
        validFrom: new Date(validFrom),
        validUntil: new Date(validUntil),
        isActive,
        usedCount: 0,
        totalDiscounts: 0
      },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            productCode: true
          }
        },
        category: {
          select: {
            id: true,
            name: true
          }
        },
        subcategory: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    logger.info(`Discount created: ${discount.id} - ${discount.name}`);
    return discount;
  }

  // Get all discounts with filtering
  async getAllDiscounts({ page = 1, limit = 10, isActive, discountType, search }) {
    const skip = (page - 1) * limit;
    
    const where = {};
    
    if (isActive !== undefined) {
      where.isActive = isActive === 'true';
    }
    
    if (discountType) {
      where.discountType = discountType;
    }
    
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } }
      ];
    }
    
    const [discounts, total] = await Promise.all([
      prisma.discount.findMany({
        where,
        skip,
        take: limit,
        include: {
          product: {
            select: {
              id: true,
              name: true,
              productCode: true
            }
          },
          category: {
            select: {
              id: true,
              name: true
            }
          },
          subcategory: {
            select: {
              id: true,
              name: true
            }
          },
          _count: {
            select: {
              discountUsage: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      }),
      prisma.discount.count({ where })
    ]);
    
    return {
      discounts,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  }

  // Get discount by ID
  async getDiscountById(discountId) {
    const discount = await prisma.discount.findUnique({
      where: { id: discountId },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            productCode: true,
            images: {
              take: 1,
              select: {
                imageUrl: true
              }
            }
          }
        },
        category: {
          select: {
            id: true,
            name: true
          }
        },
        subcategory: {
          select: {
            id: true,
            name: true
          }
        },
        discountUsage: {
          take: 10,
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true
              }
            },
            order: {
              select: {
                id: true,
                orderNumber: true,
                totalAmount: true,
                createdAt: true
              }
            }
          },
          orderBy: {
            createdAt: 'desc'
          }
        }
      }
    });
    
    if (!discount) {
      throw new Error('Discount not found');
    }
    
    return discount;
  }

  // Update discount
  async updateDiscount(discountId, updateData) {
    const discount = await prisma.discount.findUnique({
      where: { id: discountId }
    });
    
    if (!discount) {
      throw new Error('Discount not found');
    }
    
    // Validate discount value if provided
    if (updateData.discountValue !== undefined) {
      if (updateData.discountValue <= 0) {
        throw new Error('Discount value must be greater than 0');
      }
      
      if (updateData.discountType === 'PERCENTAGE' && updateData.discountValue > 100) {
        throw new Error('Percentage discount cannot exceed 100%');
      }
    }
    
    // Validate dates if provided
    if (updateData.validFrom || updateData.validUntil) {
      const validFrom = updateData.validFrom ? new Date(updateData.validFrom) : discount.validFrom;
      const validUntil = updateData.validUntil ? new Date(updateData.validUntil) : discount.validUntil;
      
      if (validFrom >= validUntil) {
        throw new Error('Valid from date must be before valid until date');
      }
    }
    
    const updatedDiscount = await prisma.discount.update({
      where: { id: discountId },
      data: {
        ...updateData,
        ...(updateData.validFrom && { validFrom: new Date(updateData.validFrom) }),
        ...(updateData.validUntil && { validUntil: new Date(updateData.validUntil) })
      },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            productCode: true
          }
        },
        category: {
          select: {
            id: true,
            name: true
          }
        },
        subcategory: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });
    
    logger.info(`Discount updated: ${discountId}`);
    return updatedDiscount;
  }

  // Delete discount
  async deleteDiscount(discountId) {
    const discount = await prisma.discount.findUnique({
      where: { id: discountId }
    });
    
    if (!discount) {
      throw new Error('Discount not found');
    }
    
    // Check if discount has been used
    if (discount.usedCount > 0) {
      throw new Error('Cannot delete discount that has been used');
    }
    
    await prisma.discount.delete({
      where: { id: discountId }
    });
    
    logger.info(`Discount deleted: ${discountId}`);
  }

  // Toggle discount activation
  async toggleDiscountActivation(discountId, isActive) {
    const discount = await prisma.discount.findUnique({
      where: { id: discountId }
    });
    
    if (!discount) {
      throw new Error('Discount not found');
    }
    
    const activationStatus = isActive === true || isActive === 'true';
    
    const updatedDiscount = await prisma.discount.update({
      where: { id: discountId },
      data: {
        isActive: activationStatus,
        updatedAt: new Date()
      },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            productCode: true
          }
        },
        category: {
          select: {
            id: true,
            name: true
          }
        },
        subcategory: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });
    
    logger.info(`Discount activation updated: ${discountId} -> ${activationStatus ? 'active' : 'inactive'}`);
    return updatedDiscount;
  }

  // Apply discount to order
  async applyDiscount(orderId, discountId, userId) {
    // Check if discount exists and is valid
    const discount = await prisma.discount.findUnique({
      where: { id: discountId }
    });
    
    if (!discount) {
      throw new Error('Discount not found');
    }
    
    if (!discount.isActive) {
      throw new Error('Discount is not active');
    }
    
    const now = new Date();
    if (now < discount.validFrom || now > discount.validUntil) {
      throw new Error('Discount is not valid at this time');
    }
    
    // Check usage limit
    if (discount.usageLimit && discount.usedCount >= discount.usageLimit) {
      throw new Error('Discount usage limit reached');
    }
    
    // Check per user limit
    if (discount.perUserLimit > 0) {
      const userUsageCount = await prisma.discountUsage.count({
        where: {
          discountId,
          userId
        }
      });
      
      if (userUsageCount >= discount.perUserLimit) {
        throw new Error('You have reached the usage limit for this discount');
      }
    }
    
    // Check if discount has already been used for this order
    const existingUsage = await prisma.discountUsage.findFirst({
      where: {
        discountId,
        orderId
      }
    });
    
    if (existingUsage) {
      throw new Error('Discount has already been applied to this order');
    }
    
    // Get order details
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        user: true,
        orderItems: {
          include: {
            product: true
          }
        }
      }
    });
    
    if (!order) {
      throw new Error('Order not found');
    }
    
    // Check if user is eligible for this discount type
    if (discount.userType && order.user.role !== discount.userType) {
      throw new Error('You are not eligible for this discount');
    }
    
    // Check minimum order amount
    if (order.subtotal < discount.minOrderAmount) {
      throw new Error(`Minimum order amount of ₹${discount.minOrderAmount} required for this discount`);
    }
    
    // Calculate discount amount
    let discountAmount = 0;
    
    if (discount.discountType === 'PERCENTAGE') {
      discountAmount = (order.subtotal * discount.discountValue) / 100;
      if (discount.maxDiscount && discountAmount > discount.maxDiscount) {
        discountAmount = discount.maxDiscount;
      }
    } else {
      discountAmount = discount.discountValue;
    }
    
    // Apply discount to order
    const updatedOrder = await prisma.order.update({
      where: { id: orderId },
      data: {
        discount: {
          increment: discountAmount
        },
        totalAmount: {
          decrement: discountAmount
        }
      }
    });
    
    // Create discount usage record
    const discountUsage = await prisma.discountUsage.create({
      data: {
        discountId,
        userId,
        orderId,
        discountAmount
      },
      include: {
        discount: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        order: {
          select: {
            id: true,
            orderNumber: true,
            totalAmount: true
          }
        }
      }
    });
    
    // Update discount usage stats
    await prisma.discount.update({
      where: { id: discountId },
      data: {
        usedCount: {
          increment: 1
        },
        totalDiscounts: {
          increment: discountAmount
        }
      }
    });
    
    logger.info(`Discount applied: ${discountId} to order: ${orderId}, Amount: ₹${discountAmount}`);
    return discountUsage;
  }

  // Get discount statistics
  async getDiscountStats() {
    const [
      totalDiscounts,
      activeDiscounts,
      expiredDiscounts,
      totalUsage,
      totalDiscountAmount,
      mostUsedDiscounts,
      recentDiscounts
    ] = await Promise.all([
      prisma.discount.count(),
      prisma.discount.count({ where: { isActive: true } }),
      prisma.discount.count({ 
        where: { 
          validUntil: { lt: new Date() }
        }
      }),
      prisma.discountUsage.count(),
      prisma.discount.aggregate({
        _sum: {
          totalDiscounts: true
        }
      }),
      prisma.discount.findMany({
        take: 5,
        include: {
          _count: {
            select: {
              discountUsage: true
            }
          }
        },
        orderBy: {
          usedCount: 'desc'
        }
      }),
      prisma.discount.findMany({
        take: 10,
        orderBy: {
          createdAt: 'desc'
        }
      })
    ]);
    
    return {
      totalDiscounts,
      activeDiscounts,
      expiredDiscounts,
      totalUsage,
      totalDiscountAmount: totalDiscountAmount._sum.totalDiscounts || 0,
      mostUsedDiscounts,
      recentDiscounts
    };
  }

  // Validate discount code
  async validateDiscount(code, userId, orderAmount = 0) {
    const discount = await prisma.discount.findFirst({
      where: {
        name: code, // Using name as discount code
        isActive: true
      },
      include: {
        product: {
          select: {
            id: true,
            name: true
          }
        },
        category: {
          select: {
            id: true,
            name: true
          }
        },
        subcategory: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });
    
    if (!discount) {
      return {
        isValid: false,
        message: 'Invalid discount code'
      };
    }
    
    const now = new Date();
    if (now < discount.validFrom) {
      return {
        isValid: false,
        message: 'Discount not yet valid'
      };
    }
    
    if (now > discount.validUntil) {
      return {
        isValid: false,
        message: 'Discount has expired'
      };
    }
    
    // Check usage limit
    if (discount.usageLimit && discount.usedCount >= discount.usageLimit) {
      return {
        isValid: false,
        message: 'Discount usage limit reached'
      };
    }
    
    // Check per user limit
    if (discount.perUserLimit > 0 && userId) {
      const userUsageCount = await prisma.discountUsage.count({
        where: {
          discountId: discount.id,
          userId
        }
      });
      
      if (userUsageCount >= discount.perUserLimit) {
        return {
          isValid: false,
          message: 'You have reached the usage limit for this discount'
        };
      }
    }
    
    // Check minimum order amount
    if (orderAmount < discount.minOrderAmount) {
      return {
        isValid: false,
        message: `Minimum order amount of ₹${discount.minOrderAmount} required`
      };
    }
    
    // Calculate discount amount
    let discountAmount = 0;
    let maxDiscountReached = false;
    
    if (discount.discountType === 'PERCENTAGE') {
      discountAmount = (orderAmount * discount.discountValue) / 100;
      if (discount.maxDiscount && discountAmount > discount.maxDiscount) {
        discountAmount = discount.maxDiscount;
        maxDiscountReached = true;
      }
    } else {
      discountAmount = discount.discountValue;
    }
    
    return {
      isValid: true,
      discount: {
        id: discount.id,
        name: discount.name,
        description: discount.description,
        discountType: discount.discountType,
        discountValue: discount.discountValue,
        maxDiscount: discount.maxDiscount,
        discountAmount,
        maxDiscountReached,
        product: discount.product,
        category: discount.category,
        subcategory: discount.subcategory
      }
    };
  }
}

export default new DiscountService();