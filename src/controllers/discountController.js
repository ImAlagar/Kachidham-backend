// controllers/discountController.js
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
  const { code } = req.params;
  const userId = req.user?.id;
  const { orderAmount = 0 } = req.body;
  
  const validation = await discountService.validateDiscount(code, userId, orderAmount);
  
  res.status(200).json({
    success: validation.isValid,
    data: validation
  });
});