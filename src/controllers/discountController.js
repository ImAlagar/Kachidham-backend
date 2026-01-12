// controllers/discountController.js
import prisma from '../config/database.js';
import discountService from '../services/discountService.js';
import { asyncHandler } from '../utils/helpers.js';

// Create discount
export const createDiscount = asyncHandler(async (req, res) => {
  const discountData = req.body;
  
  const discount = await discountService.createDiscount(discountData);
  
  res.status(201).json({
    success: true,
    message: 'Discount created successfully',
    data: discount
  });
});

// Get all discounts
export const getAllDiscounts = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, isActive, discountType, search } = req.query;
  
  const result = await discountService.getAllDiscounts({
    page: parseInt(page),
    limit: parseInt(limit),
    isActive,
    discountType,
    search
  });
  
  res.status(200).json({
    success: true,
    data: result
  });
});

// Get discount by ID
export const getDiscountById = asyncHandler(async (req, res) => {
  const { discountId } = req.params;
  
  const discount = await discountService.getDiscountById(discountId);
  
  res.status(200).json({
    success: true,
    data: discount
  });
});

// Update discount
export const updateDiscount = asyncHandler(async (req, res) => {
  const { discountId } = req.params;
  const updateData = req.body;
  
  const updatedDiscount = await discountService.updateDiscount(discountId, updateData);
  
  res.status(200).json({
    success: true,
    message: 'Discount updated successfully',
    data: updatedDiscount
  });
});

// Delete discount
export const deleteDiscount = asyncHandler(async (req, res) => {
  const { discountId } = req.params;
  
  await discountService.deleteDiscount(discountId);
  
  res.status(200).json({
    success: true,
    message: 'Discount deleted successfully'
  });
});

// Toggle discount activation
export const toggleDiscountActivation = asyncHandler(async (req, res) => {
  const { discountId } = req.params;
  const { isActive } = req.body;
  
  const updatedDiscount = await discountService.toggleDiscountActivation(discountId, isActive);
  
  res.status(200).json({
    success: true,
    message: `Discount ${isActive ? 'activated' : 'deactivated'} successfully`,
    data: updatedDiscount
  });
});

// Apply discount to order
export const applyDiscount = asyncHandler(async (req, res) => {
  const { orderId, discountId } = req.params;
  const userId = req.user.id;
  
  const discountUsage = await discountService.applyDiscount(orderId, discountId, userId);
  
  res.status(200).json({
    success: true,
    message: 'Discount applied successfully',
    data: discountUsage
  });
});

// Get discount statistics
export const getDiscountStats = asyncHandler(async (req, res) => {
  const stats = await discountService.getDiscountStats();
  
  res.status(200).json({
    success: true,
    data: stats
  });
});

// Validate discount code
export const validateDiscount = asyncHandler(async (req, res) => {
  try {
    const { code } = req.params;
    const userId = req.user?.id;
    
    // Get orderAmount from query parameters
    const { orderAmount = 0 } = req.query;
    
    const validation = await discountService.validateDiscount(
      code, 
      userId, 
      parseFloat(orderAmount)
    );
    
    // Check if validation is undefined
    if (!validation) {
      return res.status(200).json({
        success: false,
        data: {
          isValid: false,
          message: 'Error validating discount code'
        }
      });
    }
    
    res.status(200).json({
      success: validation.isValid,
      data: validation
    });
    
  } catch (error) {
    logger.error('Discount validation error:', error);
    res.status(200).json({
      success: false,
      data: {
        isValid: false,
        message: 'Error validating discount code'
      }
    });
  }
});


export const getProductDiscounts = asyncHandler(async (req, res) => {
  const { productId } = req.params;
  const userId = req.user?.id;
  
  const discounts = await discountService.getProductDiscounts(productId, userId);
  
  res.status(200).json({
    success: true,
    data: discounts
  });
});

// Get active discounts for user
export const getActiveDiscounts = asyncHandler(async (req, res) => {
  const userId = req.user?.id;
  const { productId, categoryId, subcategoryId } = req.query;
  
  const discounts = await discountService.getActiveDiscounts({
    userId,
    productId,
    categoryId,
    subcategoryId
  });
  
  res.status(200).json({
    success: true,
    data: discounts
  });
});



export const calculateCartDiscounts = asyncHandler(async (req, res) => {
  const { cartItems, discountCode } = req.body;
  const userId = req.user?.id;
  
  if (!cartItems || !Array.isArray(cartItems)) {
    return res.status(400).json({
      success: false,
      message: 'Cart items are required'
    });
  }

  // Get product details for cart items
  const enrichedCartItems = await Promise.all(
    cartItems.map(async (item) => {
      const product = await prisma.product.findUnique({
        where: { id: item.productId },
        select: {
          id: true,
          name: true,
          normalPrice: true,
          offerPrice: true,
          categoryId: true,
          subcategoryId: true,
          images: {
            take: 1,
            select: { imageUrl: true }
          }
        }
      });
      
      return {
        ...item,
        product
      };
    })
  );

  const result = await discountService.calculateCartDiscounts(
    enrichedCartItems,
    userId,
    discountCode
  );
  
  res.status(200).json({
    success: result.errors ? false : true,
    data: result
  });
});

export const getAvailableDiscounts = asyncHandler(async (req, res) => {
  const { cartItems } = req.body;
  const userId = req.user?.id;
  
  if (!cartItems || !Array.isArray(cartItems)) {
    return res.status(400).json({
      success: false,
      message: 'Cart items are required'
    });
  }

  const productIds = cartItems.map(item => item.productId);
  const discounts = [];
  
  // Get discounts for each product
  for (const productId of productIds) {
    const productDiscounts = await discountService.getProductDiscounts(productId, userId);
    discounts.push(...productDiscounts);
  }
  
  // Get sitewide discounts
  const sitewideDiscounts = await discountService.getActiveDiscounts({
    userId,
    productId: null,
    categoryId: null,
    subcategoryId: null
  });
  
  discounts.push(...sitewideDiscounts);
  
  // Remove duplicates
  const uniqueDiscounts = discounts.filter((discount, index, self) =>
    index === self.findIndex(d => d.id === discount.id)
  );
  
  res.status(200).json({
    success: true,
    data: uniqueDiscounts
  });
});

export const calculateProductDiscount = asyncHandler(async (req, res) => {
  const { productId } = req.params;
  const userId = req.user?.id;
  
  const discount = await discountService.calculateProductDiscount(productId, userId);
  
  res.status(200).json({
    success: true,
    data: discount
  });
});