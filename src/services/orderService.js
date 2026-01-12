import prisma from '../config/database.js';
import emailNotificationService from './emailNotificationService.js';
import phonepeService from './phonepeService.js';
import logger from '../utils/logger.js';
import razorpayService from './razorpayService.js';
import discountService from './discountService.js';

class OrderService {

    calculateShippingCost(state) {
    if (!state) return 200; // Default to "Other" category
    
    // Normalize state name
    const normalizedState = state.trim().toLowerCase();
    
    switch (normalizedState) {
      case "tamil nadu":
        return 80;
      
      case "kerala":
      case "karnataka":
      case "andhra pradesh":
      case "telangana":
        return 100;
      
      default:
        return 200;
    }
  }

  generateOrderNumber() {
    const timestamp = Date.now().toString();
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `ORD-${timestamp}-${random}`;
  }

  // Calculate quantity price for a single item
  async calculateItemQuantityPrice(productId, subcategoryId, basePrice, quantity) {
    // If no subcategory, return regular pricing
    if (!subcategoryId) {
      return {
        originalPrice: basePrice * quantity,
        finalPrice: basePrice * quantity,
        totalSavings: 0,
        pricePerItem: basePrice,
        hasDiscount: false
      };
    }

    // Get quantity prices for the subcategory
    const quantityPrices = await prisma.subcategoryQuantityPrice.findMany({
      where: { 
        subcategoryId: subcategoryId,
        isActive: true,
        quantity: { lte: quantity }
      },
      orderBy: { 
        quantity: 'desc'
      }
    });

    let bestTotal = basePrice * quantity;
    let appliedDiscount = null;

    // Find the best applicable discount
    for (const priceRule of quantityPrices) {
      if (quantity >= priceRule.quantity) {
        let finalPriceForRule = 0;

        if (priceRule.priceType === 'PERCENTAGE') {
          // Calculate percentage discount
          finalPriceForRule = (basePrice * quantity) * (1 - priceRule.value / 100);
        } else {
          // Fixed amount
          finalPriceForRule = priceRule.value;
        }

        // If this rule gives a better price, use it
        if (finalPriceForRule < bestTotal) {
          bestTotal = finalPriceForRule;
          appliedDiscount = {
            quantity: priceRule.quantity,
            priceType: priceRule.priceType,
            value: priceRule.value
          };
        }
      }
    }

    const totalSavings = (basePrice * quantity) - bestTotal;
    
    return {
      originalPrice: basePrice * quantity,
      finalPrice: bestTotal,
      totalSavings: totalSavings,
      pricePerItem: bestTotal / quantity,
      hasDiscount: appliedDiscount !== null,
      appliedDiscount
    };
  }

  // Enhanced order totals calculation with quantity pricing
async calculateOrderTotals(orderItems, discountCode = null, shippingState = null, userId = null) {
  let subtotal = 0;
  let quantitySavings = 0;
  
  if (!orderItems || !Array.isArray(orderItems) || orderItems.length === 0) {
    throw new Error('Order items are required and must be a non-empty array');
  }

  const itemsWithPricing = [];

  // Calculate subtotal with quantity pricing
  for (const item of orderItems) {
    if (!item.productId || !item.quantity || item.quantity <= 0) {
      throw new Error('Invalid order item: productId and quantity are required');
    }

    // Get product details
    const product = await prisma.product.findUnique({
      where: { id: item.productId },
      select: {
        id: true,
        name: true,
        normalPrice: true,
        offerPrice: true,
        wholesalePrice: true,
        status: true,
        subcategoryId: true,
        productCode: true
      }
    });

    if (!product) {
      throw new Error(`Product not found: ${item.productId}`);
    }

    if (product.status !== 'ACTIVE') {
      throw new Error(`Product ${product.id} is not available for purchase`);
    }

    // Check variant stock and get variant-specific price if exists
    let variant = null;
    let variantPrice = null;
    let variantDetails = null;
    
    if (item.productVariantId) {
      variant = await prisma.productVariant.findUnique({
        where: { id: item.productVariantId },
        select: { 
          id: true,
          stock: true,
          price: true, // This will now work after schema update
          color: true,
          size: true,
          sku: true
        }
      });

      if (!variant) {
        throw new Error(`Product variant not found: ${item.productVariantId}`);
      }

      if (variant.stock < item.quantity) {
        throw new Error(`Insufficient stock for variant ${item.productVariantId}. Available: ${variant.stock}, Requested: ${item.quantity}`);
      }

      variantPrice = variant.price;
      variantDetails = {
        id: variant.id,
        color: variant.color,
        size: variant.size,
        sku: variant.sku
      };
    }

    // Calculate base price: variant price overrides product price if exists
    // Convert Decimal to Number for calculations
    let basePrice;
    if (variantPrice !== null && variantPrice !== undefined) {
      basePrice = Number(variantPrice);
    } else {
      // Use product offer price or normal price
      basePrice = product.offerPrice ? Number(product.offerPrice) : Number(product.normalPrice);
    }

    // Calculate price with quantity discounts
    const quantityPriceCalculation = await this.calculateItemQuantityPrice(
      product.id,
      product.subcategoryId,
      basePrice,
      item.quantity
    );

    const itemTotal = quantityPriceCalculation.finalPrice;
    const itemSavings = quantityPriceCalculation.totalSavings;

    subtotal += itemTotal;
    quantitySavings += itemSavings;

    itemsWithPricing.push({
      ...item,
      product: {
        id: product.id,
        name: product.name,
        productCode: product.productCode,
        normalPrice: Number(product.normalPrice),
        offerPrice: product.offerPrice ? Number(product.offerPrice) : null,
        wholesalePrice: product.wholesalePrice ? Number(product.wholesalePrice) : null
      },
      variant: variantDetails,
      basePrice,
      quantityPricing: quantityPriceCalculation,
      itemTotal,
      itemSavings
    });
  }

  // Calculate coupon/discount using DiscountService
  let discountAmount = 0;
  let appliedDiscounts = [];
  let discountError = null;
  
  if (discountCode) {
    try {
      const discountResult = await discountService.calculateCartDiscounts(
        itemsWithPricing.map(item => ({
          product: item.product,
          quantity: item.quantity,
          productId: item.productId,
          variantId: item.productVariantId
        })),
        userId,
        discountCode
      );
      
      discountAmount = discountResult.totalDiscount;
      appliedDiscounts = discountResult.appliedDiscounts;
      
      if (discountResult.errors) {
        discountError = discountResult.errors.join(', ');
      }
    } catch (error) {
      discountError = error.message;
    }
  }

  // Calculate shipping cost
  const shippingCost = this.calculateShippingCost(shippingState);
  
  const totalAmount = subtotal - discountAmount + shippingCost;

  return {
    subtotal: parseFloat(subtotal.toFixed(2)),
    quantitySavings: parseFloat(quantitySavings.toFixed(2)),
    discountAmount: parseFloat(discountAmount.toFixed(2)),
    appliedDiscounts,
    shippingCost: parseFloat(shippingCost.toFixed(2)),
    shippingState: shippingState || null,
    totalAmount: parseFloat(totalAmount.toFixed(2)),
    items: itemsWithPricing,
    hasQuantityDiscounts: quantitySavings > 0,
    discountError
  };
}


  async initiateRazorpayPayment(orderData) {
    const {
      userId,
      name,
      email,
      phone,
      address,
      city,
      state,
      pincode,
      orderItems,
      discountCode, // Changed from couponCode to discountCode
      customImages = []
    } = orderData;

    // Validate required fields
    if (!name || !email || !phone || !address || !city || !state || !pincode) {
      throw new Error('All shipping information fields are required');
    }

    // Calculate totals with quantity pricing AND SHIPPING (pass state)
    const totals = await this.calculateOrderTotals(orderItems, discountCode, state, userId);

    if (totals.discountError) {
      throw new Error(totals.discountError);
    }

    // Create Razorpay order with total amount (includes shipping)
    const razorpayOrder = await razorpayService.createOrder(
      totals.totalAmount,
      'INR'
    );

    // Store temporary order data
    const tempOrderData = {
      userId,
      name,
      email,
      phone,
      address,
      city,
      state,
      pincode,
      orderItems,
      discountCode,
      appliedDiscounts: totals.appliedDiscounts,
      customImages,
      totals,
      razorpayOrderId: razorpayOrder.id
    };

    logger.info(`Razorpay order initiated. Subtotal: ₹${totals.subtotal}, Discount: ₹${totals.discountAmount}, Shipping: ₹${totals.shippingCost}, Total: ₹${totals.totalAmount}`);

    return {
      razorpayOrder,
      tempOrderData: {
        ...tempOrderData,
        orderNumber: this.generateOrderNumber()
      }
    };
  }

  async verifyAndCreateOrder(paymentData) {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      orderData
    } = paymentData;

    // Verify payment signature
    const isValid = razorpayService.verifyPayment(
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature
    );

    if (!isValid) {
      throw new Error('Payment verification failed');
    }

    // Calculate totals again to ensure consistency
    const totals = await this.calculateOrderTotals(orderData.orderItems, orderData.discountCode, orderData.state, orderData.userId);
    
    // Prepare custom images data
    const customImages = orderData.customImages || [];

    // Create the order
    const orderCreateData = {
      orderNumber: this.generateOrderNumber(),
      user: {
        connect: {
          id: orderData.userId
        }
      },
      name: orderData.name,
      email: orderData.email,
      phone: orderData.phone,
      address: orderData.address,
      city: orderData.city,
      state: orderData.state,
      pincode: orderData.pincode,
      status: 'CONFIRMED',
      totalAmount: totals.totalAmount,
      subtotal: totals.subtotal,
      discount: totals.discountAmount,
      shippingCost: totals.shippingCost,
      paymentStatus: 'PAID',
      paymentMethod: 'ONLINE',
      razorpayOrderId: razorpay_order_id,
      razorpayPaymentId: razorpay_payment_id,
      razorpaySignature: razorpay_signature,
      // Create custom image records if any
      ...(customImages.length > 0 && {
        customImages: {
          create: customImages.map(img => ({
            imageUrl: img.url,
            imageKey: img.key,
            filename: img.filename || `custom-image-${Date.now()}.jpg`
          }))
        }
      }),
      orderItems: {
        create: await Promise.all(
          totals.items.map(async (item) => {
            return {
              productId: item.productId,
              productVariantId: item.productVariantId || null,
              quantity: item.quantity,
              price: item.basePrice,
            };
          })
        )
      }
    };

    // Create the actual order in database
    const order = await prisma.order.create({
      data: orderCreateData,
      include: {
        orderItems: {
          include: {
            product: {
              include: {
                images: {
                  take: 1,
                  select: {
                    imageUrl: true
                  }
                }
              }
            },
            productVariant: {
              include: {
                variantImages: {
                  select: {
                    imageUrl: true,
                    color: true
                  }
                }
              }
            }
          }
        },
        customImages: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });

    // Update stock for variants
    for (const item of orderData.orderItems) {
      if (item.productVariantId) {
        await prisma.productVariant.update({
          where: { id: item.productVariantId },
          data: {
            stock: { decrement: item.quantity }
          }
        });
      }
    }

    // FIXED: Record discount usage if discount was applied
    if (totals.discountAmount > 0 && orderData.discountCode) {
      try {
        // Record the main discount
        await discountService.recordDiscountUsage(
          orderData.discountCode,
          orderData.userId,
          order.id,
          totals.discountAmount
        );
      } catch (error) {
        logger.error(`Failed to record discount usage for ${orderData.discountCode}:`, error.message);
      }
    }

    // Also record any product-specific discounts
    if (totals.appliedDiscounts && totals.appliedDiscounts.length > 0) {
      for (const discount of totals.appliedDiscounts) {
        if (discount.code && discount.code !== orderData.discountCode) {
          try {
            await discountService.recordDiscountUsage(
              discount.code,
              orderData.userId,
              order.id,
              discount.amount || 0
            );
          } catch (error) {
            logger.error(`Failed to record product discount usage: ${error.message}`);
          }
        }
      }
    }

    // Create tracking history
    await prisma.trackingHistory.create({
      data: {
        orderId: order.id,
        status: 'CONFIRMED',
        description: `Order confirmed and payment received. Discount: ₹${totals.discountAmount}`,
        location: `${order.city}, ${order.state}`
      }
    });

    // Send email notification
    try {
      await emailNotificationService.sendOrderNotifications(order);
    } catch (emailError) {
      logger.error('Failed to send order confirmation email:', emailError);
    }

    logger.info(`Order created successfully. Discount: ₹${totals.discountAmount}`);
    
    return {
      ...order,
      quantitySavings: totals.quantitySavings,
      discountAmount: totals.discountAmount,
      appliedDiscounts: totals.appliedDiscounts
    };
  }


  async createCODOrder(orderData) {
    const {
      userId,
      name,
      email,
      phone,
      address,
      city,
      state,
      pincode,
      orderItems,
      couponCode,
      customImages = []
    } = orderData;

    // Validate required fields
    if (!name || !email || !phone || !address || !city || !state || !pincode) {
      throw new Error('All shipping information fields are required');
    }

    // Calculate totals with quantity pricing
    const totals = await this.calculateOrderTotals(orderItems, couponCode);

    // Prepare order data - FIXED: Use coupon relation instead of couponId
    const orderCreateData = {
      orderNumber: this.generateOrderNumber(),
      user: {
        connect: {
          id: userId
        }
      },
      name,
      email,
      phone,
      address,
      city,
      state,
      pincode,
      status: 'CONFIRMED',
      totalAmount: totals.totalAmount,
      subtotal: totals.subtotal,
      discount: totals.couponDiscount,
      shippingCost: totals.shippingCost,
      paymentStatus: 'PENDING',
      paymentMethod: 'COD',
      // FIXED: Use coupon relation instead of couponId
      ...(totals.coupon && {
        coupon: {
          connect: {
            id: totals.coupon.id
          }
        }
      }),
      // Create custom image records if any
      ...(customImages.length > 0 && {
        customImages: {
          create: customImages.map(img => ({
            imageUrl: img.url,
            imageKey: img.key,
            filename: img.filename || `custom-image-${Date.now()}.jpg`
          }))
        }
      }),
      orderItems: {
        create: await Promise.all(
          totals.items.map(async (item) => {
            return {
              productId: item.productId,
              productVariantId: item.productVariantId || null,
              quantity: item.quantity,
              price: item.basePrice,
            };
          })
        )
      }
    };

    // Create order with COD status
    const order = await prisma.order.create({
      data: orderCreateData,
      include: {
        orderItems: {
          include: {
            product: {
              include: {
                images: {
                  take: 1,
                  select: {
                    imageUrl: true
                  }
                }
              }
            },
            productVariant: {
              include: {
                variantImages: {
                  take: 1,
                  select: {
                    imageUrl: true,
                    color: true
                  }
                }
              }
            }
          }
        },
        customImages: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        coupon: true
      }
    });

    // Update stock for variants
    for (const item of orderItems) {
      if (item.productVariantId) {
        await prisma.productVariant.update({
          where: { id: item.productVariantId },
          data: {
            stock: { decrement: item.quantity }
          }
        });
      }
    }

    // Increment coupon usage
    if (totals.coupon) {
      await prisma.coupon.update({
        where: { id: totals.coupon.id },
        data: {
          usedCount: { increment: 1 }
        }
      });
    }

    // Create tracking history
    await prisma.trackingHistory.create({
      data: {
        orderId: order.id,
        status: 'CONFIRMED',
        description: `COD order confirmed. Quantity savings: ₹${totals.quantitySavings}`,
        location: `${order.city}, ${order.state}`
      }
    });

    // Send email notification
    try {
      await emailNotificationService.sendOrderNotifications(order);
    } catch (emailError) {
      logger.error('Failed to send COD order confirmation email:', emailError);
    }

    logger.info(`COD order created successfully with quantity discounts. Savings: ₹${totals.quantitySavings}`);
    
    // Return order with quantity discount info
    return {
      ...order,
      quantitySavings: totals.quantitySavings,
      hasQuantityDiscounts: totals.hasQuantityDiscounts
    };
  }


  async getAllOrders({ page, limit, status, userId, paymentStatus }) {
    const skip = (page - 1) * limit;
    
    const where = {};
    
    if (status) {
      where.status = status;
    }
    
    if (userId) {
      where.userId = userId;
    }
    
    if (paymentStatus) {
      where.paymentStatus = paymentStatus;
    }
    
    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        skip,
        take: limit,
        include: {
          orderItems: {
            include: {
              product: {
                include: {
                  images: {
                    take: 1,
                    select: {
                      imageUrl: true
                    }
                  }
                }
              },
              productVariant: {
                include: {
                  variantImages: {
                    take: 1,
                    select: {
                      imageUrl: true,
                      color: true
                    }
                  }
                }
              }
            }
          },
          customImages: true, // Include custom images
          user: {
            select: {
              id: true,
              name: true,
              email: true
            }
          },
          coupon: true,
          trackingHistory: {
            take: 5,
            orderBy: {
              createdAt: 'desc'
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      }),
      prisma.order.count({ where })
    ]);
    
    return {
      orders,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  }

  async getOrderById(orderId) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        orderItems: {
          include: {
            product: {
              include: {
                images: {
                  select: {
                    imageUrl: true
                  }
                }
              }
            },
              productVariant: {
                include: {
                  variantImages: {
                    take: 1,
                    select: {
                      imageUrl: true,
                      color: true
                    }
                  }
                }
              }
          }
        },
        customImages: {
          select: {
            imageUrl: true,
            imageKey: true,
            filename: true
          }
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true
          }
        },
        coupon: true,
        trackingHistory: {
          orderBy: {
            createdAt: 'desc'
          }
        }
      }
    });
    
    if (!order) {
      throw new Error('Order not found');
    }
    
    return order;
  }

  async getOrderByOrderNumber(orderNumber) {
    const order = await prisma.order.findUnique({
      where: { orderNumber },
      include: {
        orderItems: {
          include: {
            product: {
              include: {
                images: {
                  take: 1,
                  select: {
                    imageUrl: true
                  }
                }
              }
            },
            productVariant: {
              select: {
                id: true,
                color: true,
                size: true
              }
            }
          }
        },
        customImages: true, // Include custom images
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        coupon: true,
        trackingHistory: {
          orderBy: {
            createdAt: 'desc'
          }
        }
      }
    });
    
    if (!order) {
      throw new Error('Order not found');
    }
    
    return order;
  }

  async updateOrderStatus(orderId, statusData) {
    const { status, adminNotes } = statusData;
    
    const order = await prisma.order.findUnique({
      where: { id: orderId }
    });
    
    if (!order) {
      throw new Error('Order not found');
    }
    
    const validStatuses = ['PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'REFUNDED'];
    if (!validStatuses.includes(status)) {
      throw new Error('Invalid status');
    }
    
    const oldStatus = order.status;
    
    const updateData = {
      status,
      ...(adminNotes && { adminNotes })
    };

    // Set timestamps for specific status changes
    if (status === 'SHIPPED' && order.status !== 'SHIPPED') {
      updateData.shippedAt = new Date();
    }
    
    if (status === 'DELIVERED' && order.status !== 'DELIVERED') {
      updateData.deliveredAt = new Date();
    }
    
    const updatedOrder = await prisma.order.update({
      where: { id: orderId },
      data: updateData,
      include: {
        orderItems: {
          include: {
            product: {
              include: {
                images: {
                  take: 1,
                  select: {
                    imageUrl: true
                  }
                }
              }
            },
            productVariant: {
              select: {
                id: true,
                color: true,
                size: true
              }
            }
          }
        },
        customImages: true, // Include custom images
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });
    

    if (status !== order.status) {
      await prisma.trackingHistory.create({
        data: {
          orderId,
          status,
          description: this.getStatusDescription(status),
          location: `${order.city}, ${order.state}`
        }
      });

      try {
        await emailNotificationService.sendOrderStatusUpdate(updatedOrder, oldStatus, status);
      } catch (emailError) {
        logger.error('Failed to send status update email:', emailError);
      }
    }
    
    logger.info(`Order status updated: ${orderId} -> ${status}`);
    return updatedOrder;
  }

  async updateTrackingInfo(orderId, trackingData) {
    const { trackingNumber, carrier, trackingUrl, estimatedDelivery } = trackingData;
    
    const order = await prisma.order.findUnique({
      where: { id: orderId }
    });
    
    if (!order) {
      throw new Error('Order not found');
    }
    
    const updatedOrder = await prisma.order.update({
      where: { id: orderId },
      data: {
        trackingNumber,
        carrier,
        trackingUrl,
        estimatedDelivery: estimatedDelivery ? new Date(estimatedDelivery) : null,
        status: 'SHIPPED',
        shippedAt: new Date()
      },
      include: {
        orderItems: {
          include: {
            product: {
              include: {
                images: {
                  take: 1,
                  select: {
                    imageUrl: true
                  }
                }
              }
            },
            productVariant: {
              select: {
                id: true,
                color: true,
                size: true
              }
            }
          }
        },
        customImages: true, // Include custom images
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });
    
    await prisma.trackingHistory.create({
      data: {
        orderId,
        status: 'SHIPPED',
        description: `Order shipped via ${carrier}. Tracking number: ${trackingNumber}`,
        location: `${order.city}, ${order.state}`
      }
    });

    try {
      await emailNotificationService.sendOrderStatusUpdate(updatedOrder, order.status, 'SHIPPED');
    } catch (emailError) {
      logger.error('Failed to send shipping notification email:', emailError);
    }
    
    logger.info(`Tracking info updated for order: ${orderId}`);
    return updatedOrder;
  }

  async processRefund(orderId, refundData) {
    const { refundAmount, reason, adminNotes } = refundData;
    
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        orderItems: {
          include: {
            product: {
              include: {
                images: {
                  take: 1,
                  select: {
                    imageUrl: true
                  }
                }
              }
            },
            productVariant: true
          }
        },
        customImages: true // Include custom images
      }
    });
    
    if (!order) {
      throw new Error('Order not found');
    }
    
    if (order.paymentStatus !== 'PAID') {
      throw new Error('Cannot refund order that is not paid');
    }
    
    if (order.status === 'REFUNDED') {
      throw new Error('Order is already refunded');
    }

    if (!order.phonepeTransactionId) {
      throw new Error('Original transaction ID not found for refund');
    }
    
    let phonepeRefundId = null;
    try {
      const refundResponse = await phonepeService.processRefund(
        order.phonepeTransactionId,
        refundAmount || order.totalAmount,
        `REFUND_${order.id}`
      );
      
      if (refundResponse.success) {
        phonepeRefundId = refundResponse.data.merchantRefundId;
      } else {
        throw new Error(refundResponse.message || 'Refund failed');
      }
    } catch (phonepeError) {
      logger.error('PhonePe refund failed:', phonepeError);
      throw new Error('Refund processing failed: ' + phonepeError.message);
    }
    
    const updatedOrder = await prisma.order.update({
      where: { id: orderId },
      data: {
        status: 'REFUNDED',
        paymentStatus: 'REFUNDED',
        ...(adminNotes && { adminNotes })
      },
      include: {
        orderItems: {
          include: {
            product: {
              include: {
                images: {
                  take: 1,
                  select: {
                    imageUrl: true
                  }
                }
              }
            },
            productVariant: {
              select: {
                id: true,
                color: true,
                size: true
              }
            }
          }
        },
        customImages: true, // Include custom images
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });
    
    await prisma.trackingHistory.create({
      data: {
        orderId,
        status: 'REFUNDED',
        description: `Order refunded. Amount: ₹${refundAmount || order.totalAmount}. Reason: ${reason}. Refund ID: ${phonepeRefundId}`,
        location: 'System'
      }
    });
    
    // Restore stock for refunded items
    for (const item of order.orderItems) {
      if (item.productVariantId) {
        await prisma.productVariant.update({
          where: { id: item.productVariantId },
          data: {
            stock: { increment: item.quantity }
          }
        });
      }
    }

    try {
      await emailNotificationService.sendOrderRefundNotification(updatedOrder, {
        refundAmount: refundAmount || order.totalAmount,
        reason,
        phonepeRefundId
      });
    } catch (emailError) {
      logger.error('Failed to send refund notification email:', emailError);
    }
    
    logger.info(`Order refunded: ${orderId}, PhonePe Refund ID: ${phonepeRefundId}`);
    return {
      ...updatedOrder,
      phonepeRefundId,
      refundAmount: refundAmount || order.totalAmount
    };
  }

  async getUserOrders(userId, { page, limit, status }) {
    const skip = (page - 1) * limit;
    
    const where = { userId };
    
    if (status) {
      where.status = status;
    }
    
    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        skip,
        take: limit,
        include: {
          orderItems: {
            include: {
              product: {
                include: {
                  images: {
                    take: 1,
                    select: {
                      imageUrl: true
                    }
                  }
                }
              },
              productVariant: {
                include: {
                  variantImages: {
                    take: 1,
                    select: {
                      imageUrl: true,
                      color: true
                    }
                  }
                }
              }
            }
          },
          customImages: true, // Include custom images
          trackingHistory: {
            take: 3,
            orderBy: {
              createdAt: 'desc'
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      }),
      prisma.order.count({ where })
    ]);
    
    return {
      orders,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  }

  async getOrderStats() {
    const [
      totalOrders,
      pendingOrders,
      confirmedOrders,
      processingOrders,
      shippedOrders,
      deliveredOrders,
      cancelledOrders,
      refundedOrders,
      totalRevenue,
      todayOrders,
      monthlyRevenue
    ] = await Promise.all([
      prisma.order.count(),
      prisma.order.count({ where: { status: 'PENDING' } }),
      prisma.order.count({ where: { status: 'CONFIRMED' } }),
      prisma.order.count({ where: { status: 'PROCESSING' } }),
      prisma.order.count({ where: { status: 'SHIPPED' } }),
      prisma.order.count({ where: { status: 'DELIVERED' } }),
      prisma.order.count({ where: { status: 'CANCELLED' } }),
      prisma.order.count({ where: { status: 'REFUNDED' } }),
      prisma.order.aggregate({
        _sum: {
          totalAmount: true
        },
        where: {
          status: { not: 'CANCELLED' },
          paymentStatus: 'PAID'
        }
      }),
      prisma.order.count({
        where: {
          createdAt: {
            gte: new Date(new Date().setHours(0, 0, 0, 0))
          }
        }
      }),
      prisma.order.aggregate({
        _sum: {
          totalAmount: true
        },
        where: {
          createdAt: {
            gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
          },
          status: { not: 'CANCELLED' },
          paymentStatus: 'PAID'
        }
      })
    ]);
    
    return {
      totalOrders,
      statusBreakdown: {
        PENDING: pendingOrders,
        CONFIRMED: confirmedOrders,
        PROCESSING: processingOrders,
        SHIPPED: shippedOrders,
        DELIVERED: deliveredOrders,
        CANCELLED: cancelledOrders,
        REFUNDED: refundedOrders
      },
      revenue: {
        total: totalRevenue._sum.totalAmount || 0,
        monthly: monthlyRevenue._sum.totalAmount || 0
      },
      todayOrders
    };
  }

  async checkPaymentStatus(merchantTransactionId) {
    try {
      const order = await prisma.order.findFirst({
        where: { phonepeMerchantTransactionId: merchantTransactionId },
        select: {
          id: true,
          orderNumber: true,
          status: true,
          paymentStatus: true,
          phonepeResponseCode: true,
          phonepeResponseMessage: true,
          totalAmount: true
        }
      });
      
      if (!order) {
        throw new Error('Order not found for the given transaction ID');
      }

      // If payment is already successful, return order status
      if (order.paymentStatus === 'PAID') {
        return order;
      }

      // Check with PhonePe for latest status
      const phonepeStatus = await phonepeService.checkPaymentStatus(merchantTransactionId);
      
      if (phonepeStatus.success && phonepeStatus.code === 'PAYMENT_SUCCESS' && order.paymentStatus !== 'PAID') {
        // Update order status if payment was successful
        await this.handlePhonePeCallback({
          merchantTransactionId,
          transactionId: phonepeStatus.data.transactionId,
          code: phonepeStatus.code,
          message: phonepeStatus.message,
          paymentInstrument: phonepeStatus.data.paymentInstrument
        });

        // Fetch updated order
        const updatedOrder = await prisma.order.findFirst({
          where: { phonepeMerchantTransactionId: merchantTransactionId },
          select: {
            id: true,
            orderNumber: true,
            status: true,
            paymentStatus: true,
            phonepeResponseCode: true,
            phonepeResponseMessage: true,
            totalAmount: true
          }
        });

        return updatedOrder;
      }

      return order;
    } catch (error) {
      logger.error('Error checking payment status:', error);
      throw error;
    }
  }

  getStatusDescription(status) {
    const descriptions = {
      PENDING: 'Order has been placed and is awaiting confirmation',
      CONFIRMED: 'Order has been confirmed and is being processed',
      PROCESSING: 'Order is being prepared for shipment',
      SHIPPED: 'Order has been shipped',
      DELIVERED: 'Order has been delivered successfully',
      CANCELLED: 'Order has been cancelled',
      REFUNDED: 'Order has been refunded'
    };
    return descriptions[status] || 'Order status updated';
  }

  // Utility method to cancel expired pending orders
  async cancelExpiredPendingOrders() {
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    
    const expiredOrders = await prisma.order.findMany({
      where: {
        status: 'PENDING',
        paymentStatus: 'PENDING',
        createdAt: { lt: twentyFourHoursAgo }
      },
      include: {
        orderItems: {
          include: {
            product: {
              include: {
                images: {
                  take: 1,
                  select: {
                    imageUrl: true
                  }
                }
              }
            }
          }
        },
        customImages: true // Include custom images
      }
    });

    for (const order of expiredOrders) {
      await prisma.order.update({
        where: { id: order.id },
        data: {
          status: 'CANCELLED',
          paymentStatus: 'FAILED',
          phonepeResponseMessage: 'Payment not completed within 24 hours'
        }
      });

      await prisma.trackingHistory.create({
        data: {
          orderId: order.id,
          status: 'CANCELLED',
          description: 'Order automatically cancelled due to incomplete payment within 24 hours',
          location: 'System'
        }
      });

      logger.info(`Auto-cancelled expired order: ${order.orderNumber}`);
    }

    return {
      cancelledCount: expiredOrders.length,
      cancelledOrders: expiredOrders.map(order => order.orderNumber)
    };
  }

}

export default new OrderService();