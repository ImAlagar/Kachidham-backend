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



// Get applicable discounts for a product
async getProductDiscounts(productId, userId = null) {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    include: {
      category: true,
      subcategory: true
    }
  });

  if (!product) {
    throw new Error('Product not found');
  }

  const now = new Date();
  
  // Get all applicable discounts
  const discounts = await prisma.discount.findMany({
    where: {
      OR: [
        { productId: productId }, // Product-specific discount
        { categoryId: product.categoryId }, // Category discount
        { subcategoryId: product.subcategoryId }, // Subcategory discount
        { 
          AND: [
            { productId: null },
            { categoryId: null },
            { subcategoryId: null }
          ]
        } // Sitewide discount
      ],
      isActive: true,
      validFrom: { lte: now },
      validUntil: { gte: now }
    },
    include: {
      product: {
        select: {
          id: true,
          name: true,
          productCode: true,
          images: {
            take: 1,
            select: { imageUrl: true }
          }
        }
      },
      category: {
        select: {
          id: true,
          name: true,
          image: true
        }
      },
      subcategory: {
        select: {
          id: true,
          name: true,
          image: true,
          category: {
            select: {
              id: true,
              name: true
            }
          }
        }
      }
    },
    orderBy: [
      { discountValue: 'desc' }, // Highest discount first
      { createdAt: 'desc' }
    ]
  });

  // Filter by user eligibility
  const eligibleDiscounts = await Promise.all(
    discounts.map(async discount => {
      // Check user eligibility
      if (discount.userType && discount.userType !== 'ALL' && userId) {
        const user = await prisma.user.findUnique({
          where: { id: userId },
          select: { role: true }
        });
        
        if (user?.role !== discount.userType) {
          return null;
        }
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
          return null;
        }
      }
      
      // Check usage limit
      if (discount.usageLimit && discount.usedCount >= discount.usageLimit) {
        return null;
      }
      
      return discount;
    })
  );

  // Remove null values and return
  return eligibleDiscounts.filter(discount => discount !== null);
}

// Get active discounts based on filters
async getActiveDiscounts({ userId, productId, categoryId, subcategoryId }) {
  const now = new Date();
  
  const where = {
    isActive: true,
    validFrom: { lte: now },
    validUntil: { gte: now }
  };

  // Add scope filters if provided
  if (productId) {
    where.OR = [
      { productId: productId },
      { 
        AND: [
          { productId: null },
          { categoryId: null },
          { subcategoryId: null }
        ]
      }
    ];
    
    // Get product details to check category/subcategory
    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: { categoryId: true, subcategoryId: true }
    });
    
    if (product) {
      where.OR.push(
        { categoryId: product.categoryId },
        { subcategoryId: product.subcategoryId }
      );
    }
  } else if (categoryId) {
    where.OR = [
      { categoryId: categoryId },
      { 
        AND: [
          { productId: null },
          { categoryId: null },
          { subcategoryId: null }
        ]
      }
    ];
  } else if (subcategoryId) {
    where.OR = [
      { subcategoryId: subcategoryId },
      { 
        AND: [
          { productId: null },
          { categoryId: null },
          { subcategoryId: null }
        ]
      }
    ];
  } else {
    // Sitewide discounts
    where.productId = null;
    where.categoryId = null;
    where.subcategoryId = null;
  }

  const discounts = await prisma.discount.findMany({
    where,
    include: {
      product: {
        select: {
          id: true,
          name: true,
          productCode: true,
          images: {
            take: 1,
            select: { imageUrl: true }
          }
        }
      },
      category: {
        select: {
          id: true,
          name: true,
          image: true
        }
      },
      subcategory: {
        select: {
          id: true,
          name: true,
          image: true,
          category: {
            select: {
              id: true,
              name: true
            }
          }
        }
      }
    },
    orderBy: [
      { discountValue: 'desc' },
      { createdAt: 'desc' }
    ]
  });

  // Filter by user eligibility
  const eligibleDiscounts = await Promise.all(
    discounts.map(async discount => {
      // Check user eligibility
      if (discount.userType && discount.userType !== 'ALL' && userId) {
        const user = await prisma.user.findUnique({
          where: { id: userId },
          select: { role: true }
        });
        
        if (user?.role !== discount.userType) {
          return null;
        }
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
          return null;
        }
      }
      
      // Check usage limit
      if (discount.usageLimit && discount.usedCount >= discount.usageLimit) {
        return null;
      }
      
      return discount;
    })
  );

  return eligibleDiscounts.filter(discount => discount !== null);
}

// services/discountService.js - FIXED
async calculateProductDiscount(productId, userId = null) {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: {
      id: true,
      normalPrice: true,    // ✅ Changed from price to normalPrice
      offerPrice: true,
      categoryId: true,
      subcategoryId: true
    }
  });

  if (!product) {
    throw new Error('Product not found');
  }

  const applicableDiscounts = await this.getProductDiscounts(productId, userId);
  
  if (applicableDiscounts.length === 0) {
    return {
      hasDiscount: false,
      originalPrice: product.offerPrice || product.normalPrice, // ✅ Fixed
      finalPrice: product.offerPrice || product.normalPrice,    // ✅ Fixed
      discountAmount: 0,
      applicableDiscounts: []
    };
  }

  // Calculate discount amount for each applicable discount
  const price = product.offerPrice || product.normalPrice; // ✅ Fixed
  const discountsWithAmount = applicableDiscounts.map(discount => {
    let discountAmount = 0;
    
    if (discount.discountType === 'PERCENTAGE') {
      discountAmount = (price * discount.discountValue) / 100;
      if (discount.maxDiscount && discountAmount > discount.maxDiscount) {
        discountAmount = discount.maxDiscount;
      }
    } else if (discount.discountType === 'FIXED_AMOUNT') {
      discountAmount = Math.min(discount.discountValue, price);
    } else if (discount.discountType === 'BUY_X_GET_Y') {
      discountAmount = Math.min(discount.discountValue, price);
    }
    
    return {
      ...discount,
      calculatedAmount: discountAmount,
      finalPrice: Math.max(0, price - discountAmount)
    };
  });

  // Sort by discount amount (highest first)
  discountsWithAmount.sort((a, b) => b.calculatedAmount - a.calculatedAmount);
  
  const bestDiscount = discountsWithAmount[0];
  
  return {
    hasDiscount: true,
    originalPrice: price,
    finalPrice: bestDiscount.finalPrice,
    discountAmount: bestDiscount.calculatedAmount,
    applicableDiscounts: discountsWithAmount,
    bestDiscount: bestDiscount
  };
}



  // services/discountService.js - Add these methods
async getDiscountByIdOrName(identifier) {
  const discount = await prisma.discount.findFirst({
    where: {
      OR: [
        { id: identifier },
        { name: identifier }
      ]
    },
    include: {
      product: true,
      category: true,
      subcategory: true
    }
  });
  
  if (!discount) {
    throw new Error('Discount not found');
  }
  
  return discount;
}

// services/discountService.js - FIXED calculateCartDiscounts method
async calculateCartDiscounts(cartItems, userId, discountCode = null) {
  let totalDiscount = 0;
  const appliedDiscounts = [];
  const errors = [];

  // ---------------- SUBTOTAL ----------------
  const subtotal = cartItems.reduce((sum, item) => {
    const price = item.product.offerPrice || item.product.normalPrice;
    return sum + price * item.quantity;
  }, 0);

  // =====================================================
  // 1️⃣ USER ENTERED COUPON → APPLY ONLY COUPON
  // =====================================================
  if (discountCode) {
    try {
      const validation = await this.validateDiscount(
        discountCode,
        userId,
        subtotal
      );

      if (!validation.isValid) {
        throw new Error(validation.message);
      }

      const discount = validation.discount;

      totalDiscount += discount.discountAmount;

      appliedDiscounts.push({
        type: "ORDER_LEVEL",
        code: discountCode,
        name: discount.name,
        discountType: discount.discountType,
        discountValue: discount.discountValue,
        amount: discount.discountAmount,
        description: "User applied coupon"
      });

    } catch (error) {
      errors.push(error.message);
    }

    const finalTotal = Math.max(0, subtotal - totalDiscount);

    return {
      subtotal: Number(subtotal.toFixed(2)),
      totalDiscount: Number(totalDiscount.toFixed(2)),
      finalTotal: Number(finalTotal.toFixed(2)),
      appliedDiscounts,
      errors: errors.length ? errors : null,
      discountCode
    };
  }

  // =====================================================
  // 2️⃣ NO COUPON → AUTO APPLY BEST PRODUCT DISCOUNTS
  // =====================================================
  for (const item of cartItems) {
    const productDiscounts = await this.getProductDiscounts(
      item.productId,
      userId
    );

    if (!productDiscounts.length) continue;

    const bestDiscount = this.getBestProductDiscount(
      productDiscounts,
      item
    );

    if (!bestDiscount) continue;

    totalDiscount += bestDiscount.calculatedAmount;

    appliedDiscounts.push({
      type: "PRODUCT_LEVEL",
      productId: item.productId,
      productName: item.product?.name,
      discountType: bestDiscount.discountType,
      discountValue: bestDiscount.discountValue,
      amount: bestDiscount.calculatedAmount,
      description: "Automatic best offer applied"
    });
  }

  const finalTotal = Math.max(0, subtotal - totalDiscount);

  return {
    subtotal: Number(subtotal.toFixed(2)),
    totalDiscount: Number(totalDiscount.toFixed(2)),
    finalTotal: Number(finalTotal.toFixed(2)),
    appliedDiscounts,
    errors: null,
    discountCode: null
  };
}



// FIXED calculateFinalAmountWithDiscounts method
async calculateFinalAmountWithDiscounts(cartData, userId, discountCode = null) {
  const { cartItems, shippingState } = cartData;
  
  // Calculate subtotal from cart items
  let subtotal = 0;
  const itemsWithDetails = [];
  
  for (const item of cartItems) {
    const product = await prisma.product.findUnique({
      where: { id: item.productId },
      select: {
        id: true,
        name: true,
        normalPrice: true,
        offerPrice: true,
        status: true
      }
    });
    
    if (!product) {
      throw new Error(`Product ${item.productId} not found`);
    }
    
    const price = product.offerPrice || product.normalPrice;
    const itemTotal = price * item.quantity;
    subtotal += itemTotal;
    
    itemsWithDetails.push({
      product,
      price,
      quantity: item.quantity,
      itemTotal
    });
  }
  
  // Apply discounts using the FIXED calculateCartDiscounts method
  const discountResult = await this.calculateCartDiscounts(
    itemsWithDetails.map(item => ({
      ...item,
      product: item.product
    })),
    userId,
    discountCode
  );
  
  // Calculate shipping based on state
  const shippingCost = this.calculateShippingCost(shippingState);
  
  // Calculate final total
  const finalTotal = Math.max(0, (subtotal - discountResult.totalDiscount + shippingCost));
  
  return {
    success: true,
    data: {
      subtotal: parseFloat(subtotal.toFixed(2)),
      totalDiscount: discountResult.totalDiscount,
      shipping: parseFloat(shippingCost.toFixed(2)),
      finalTotal: parseFloat(finalTotal.toFixed(2)),
      appliedDiscounts: discountResult.appliedDiscounts,
      errors: discountResult.errors,
      discountCode
    }
  };
}

// FIXED applyDiscountToCart method
async applyDiscountToCart(cartItems, userId) {
  let totalDiscount = 0;
  const appliedDiscounts = [];
  const cartWithDiscounts = [];

  for (const item of cartItems) {
    const productDiscounts = await this.getProductDiscounts(item.productId, userId);
    
    if (productDiscounts.length > 0) {
      const bestDiscount = this.getBestProductDiscount(productDiscounts, item);
      
      if (bestDiscount) {
        // FIXED: Apply discount ONCE, not multiplied by quantity
        const itemDiscount = bestDiscount.calculatedAmount;
        totalDiscount += itemDiscount;
        
        appliedDiscounts.push({
          productId: item.productId,
          discount: bestDiscount,
          amount: itemDiscount, // Single discount amount
          perUnit: bestDiscount.calculatedAmount
        });
        
        cartWithDiscounts.push({
          ...item,
          originalPrice: item.price,
          discountedPrice: Math.max(0, item.price - (bestDiscount.calculatedAmount / item.quantity)), // Adjust per unit
          discountApplied: bestDiscount.calculatedAmount, // Total discount for this product
          discountType: bestDiscount.discountType,
          discountCode: bestDiscount.name
        });
      } else {
        cartWithDiscounts.push({
          ...item,
          originalPrice: item.price,
          discountedPrice: item.price,
          discountApplied: 0,
          discountType: null,
          discountCode: null
        });
      }
    } else {
      cartWithDiscounts.push({
        ...item,
        originalPrice: item.price,
        discountedPrice: item.price,
        discountApplied: 0,
        discountType: null,
        discountCode: null
      });
    }
  }

  const subtotal = cartItems.reduce((sum, item) => 
    sum + (item.price * item.quantity), 0
  );
  
  const finalTotal = Math.max(0, subtotal - totalDiscount);

  return {
    subtotal,
    totalDiscount,
    finalTotal,
    appliedDiscounts,
    cartItems: cartWithDiscounts
  };
}

// Add this helper method to handle quantity-based discounts properly
calculateDiscountForItem(discount, price, quantity) {
  switch (discount.discountType) {
    case 'PERCENTAGE':
      const percentageDiscount = (price * discount.discountValue) / 100;
      const cappedDiscount = discount.maxDiscount 
        ? Math.min(percentageDiscount, discount.maxDiscount) 
        : percentageDiscount;
      // For percentage, apply ONCE per product
      return cappedDiscount;
      
    case 'FIXED_AMOUNT':
      // For fixed amount, apply ONCE per product
      return Math.min(discount.discountValue, price);
      
    case 'BUY_X_GET_Y':
      // For buy X get Y, calculate based on quantity
      if (discount.minQuantity && quantity >= discount.minQuantity) {
        const freeItems = Math.floor(quantity / discount.minQuantity);
        return Math.min(freeItems * discount.discountValue, price * freeItems);
      }
      return 0;
      
    default:
      return Math.min(discount.discountValue, price);
  }
}
// Helper to get best product discount
getBestProductDiscount(discounts, cartItem) {
  const unitPrice =
    cartItem.product.offerPrice || cartItem.product.normalPrice;

  const totalPrice = unitPrice * cartItem.quantity;

  let bestDiscount = null;
  let maxDiscountAmount = 0;

  for (const discount of discounts) {
    if (
      discount.minQuantity &&
      cartItem.quantity < discount.minQuantity
    ) {
      continue;
    }

    let discountAmount = 0;

    switch (discount.discountType) {
      case "PERCENTAGE":
        discountAmount = (totalPrice * discount.discountValue) / 100;
        if (discount.maxDiscount) {
          discountAmount = Math.min(
            discountAmount,
            discount.maxDiscount
          );
        }
        break;

      case "FIXED_AMOUNT":
        discountAmount = Math.min(
          discount.discountValue,
          totalPrice
        );
        break;

      case "BUY_X_GET_Y":
        if (cartItem.quantity >= discount.minQuantity) {
          discountAmount = discount.discountValue;
        }
        break;
    }

    if (discountAmount > maxDiscountAmount) {
      maxDiscountAmount = discountAmount;
      bestDiscount = {
        ...discount,
        calculatedAmount: discountAmount,
        finalPrice: Math.max(0, totalPrice - discountAmount)
      };
    }
  }

  return bestDiscount;
}



async validateDiscount(code, userId, orderAmount = 0) {
  try {
    // Convert orderAmount to number
    const orderAmt = parseFloat(orderAmount) || 0;
    
    // First try to find by name (code)
    let discount = await prisma.discount.findFirst({
      where: {
        name: code,
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

    // If not found by name, try by ID
    if (!discount) {
      discount = await prisma.discount.findUnique({
        where: { 
          id: code 
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
    }
    
    if (!discount) {
      return {
        isValid: false,
        message: 'Invalid discount code'
      };
    }
    
    // Check if discount is active
    if (!discount.isActive) {
      return {
        isValid: false,
        message: 'Discount is not active'
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
    const minOrderAmount = discount.minOrderAmount || 0;
    if (orderAmt < minOrderAmount) {
      return {
        isValid: false,
        message: `Minimum order amount of ₹${minOrderAmount} required`
      };
    }
    
    // Calculate discount amount
    let discountAmount = 0;
    let maxDiscountReached = false;
    
    if (discount.discountType === 'PERCENTAGE') {
      discountAmount = (orderAmt * discount.discountValue) / 100;
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
        minOrderAmount: discount.minOrderAmount || 0,
        product: discount.product,
        category: discount.category,
        subcategory: discount.subcategory
      }
    };
    
  } catch (error) {
    logger.error('Error validating discount:', error);
    return {
      isValid: false,
      message: 'Error validating discount code'
    };
  }
}


async calculateFinalAmountWithDiscounts(cartData, userId, discountCode = null) {
  const { cartItems, shippingState } = cartData;
  
  // Calculate subtotal from cart items
  let subtotal = 0;
  const itemsWithDetails = [];
  
  for (const item of cartItems) {
    const product = await prisma.product.findUnique({
      where: { id: item.productId },
      select: {
        id: true,
        name: true,
        normalPrice: true,
        offerPrice: true,
        status: true
      }
    });
    
    if (!product) {
      throw new Error(`Product ${item.productId} not found`);
    }
    
    const price = product.offerPrice || product.normalPrice;
    const itemTotal = price * item.quantity;
    subtotal += itemTotal;
    
    itemsWithDetails.push({
      product,
      price,
      quantity: item.quantity,
      itemTotal
    });
  }
  
  // Apply discount code if provided
  let discountAmount = 0;
  let appliedDiscounts = [];
  let errors = [];
  
  if (discountCode) {
    try {
      const validation = await this.validateDiscount(discountCode, userId, subtotal);
      
      if (validation.isValid) {
        discountAmount = validation.discount.discountAmount;
        appliedDiscounts.push({
          discount: validation.discount,
          amount: discountAmount,
          type: 'CODE'
        });
      } else {
        errors.push(validation.message);
      }
    } catch (error) {
      errors.push(error.message);
    }
  }
  
  // Apply product-specific discounts
  let productDiscounts = 0;
  for (const item of itemsWithDetails) {
    const productDiscount = await this.calculateProductDiscount(item.product.id, userId);
    
    if (productDiscount.hasDiscount) {
      const itemDiscount = productDiscount.discountAmount * item.quantity;
      productDiscounts += itemDiscount;
      
      appliedDiscounts.push({
        productId: item.product.id,
        discount: productDiscount.bestDiscount,
        amount: itemDiscount,
        type: productDiscount.bestDiscount.discountType
      });
    }
  }
  
  const totalDiscount = discountAmount + productDiscounts;
  
  // Calculate shipping based on state
  const shippingCost = this.calculateShippingCost(shippingState);
  
  // Calculate final total (SUBTOTAL - DISCOUNTS + SHIPPING)
  const finalTotal = Math.max(0, (subtotal - totalDiscount + shippingCost));
  
  return {
    success: true,
    data: {
      subtotal: parseFloat(subtotal.toFixed(2)),
      totalDiscount: parseFloat(totalDiscount.toFixed(2)),
      shipping: parseFloat(shippingCost.toFixed(2)),
      finalTotal: parseFloat(finalTotal.toFixed(2)),
      appliedDiscounts,
      errors: errors.length > 0 ? errors : null,
      discountCode
    }
  };
}

// Calculate shipping cost
calculateShippingCost(state) {
  const shippingRates = {
    'Tamil Nadu': 80,
    'Kerala': 100,
    'Karnataka': 100,
    'Andhra Pradesh': 100,
    'Telangana': 100,
    'Other': 200
  };
  
  return shippingRates[state] || shippingRates['Other'];
}
}

export default new DiscountService();