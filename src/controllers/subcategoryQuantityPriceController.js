// controllers/subcategoryQuantityPriceController.js
import { asyncHandler } from '../utils/helpers.js';
import subcategoryQuantityPriceService from '../services/subcategoryQuantityPriceService.js';
import prisma from '../config/database.js';

// Add quantity price to subcategory
export const addSubcategoryQuantityPrice = asyncHandler(async (req, res) => {
  const { subcategoryId } = req.params;
  const { quantity, priceType, value } = req.body;

  if (!quantity || !priceType || !value) {
    return res.status(400).json({
      success: false,
      message: 'Quantity, priceType, and value are required'
    });
  }

  const quantityPrice = await subcategoryQuantityPriceService.addQuantityPrice(
    subcategoryId,
    { quantity, priceType, value }
  );

  res.status(201).json({
    success: true,
    message: 'Quantity price added to subcategory successfully',
    data: quantityPrice
  });
});

// Get all quantity prices for a subcategory
export const getSubcategoryQuantityPrices = asyncHandler(async (req, res) => {
  const { subcategoryId } = req.params;

  const subcategory = await subcategoryQuantityPriceService.getSubcategoryQuantityPrices(subcategoryId);

  res.status(200).json({
    success: true,
    data: subcategory
  });
});

// ✅ FIXED: Use the correct model name
export const getQuantityPriceById = asyncHandler(async (req, res) => {
  const { quantityPriceId } = req.params;

  try {
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
      return res.status(404).json({
        success: false,
        message: 'Quantity price not found'
      });
    }

    res.status(200).json({
      success: true,
      data: quantityPrice
    });
  } catch (error) {
    console.error('Error in getQuantityPriceById:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch quantity price'
    });
  }
});

// Update quantity price
export const updateSubcategoryQuantityPrice = asyncHandler(async (req, res) => {
  const { quantityPriceId } = req.params;
  const updateData = req.body;

  const updatedPrice = await subcategoryQuantityPriceService.updateQuantityPrice(
    quantityPriceId,
    updateData
  );

  res.status(200).json({
    success: true,
    message: 'Quantity price updated successfully',
    data: updatedPrice
  });
});

// Delete quantity price
export const deleteSubcategoryQuantityPrice = asyncHandler(async (req, res) => {
  const { quantityPriceId } = req.params;

  await subcategoryQuantityPriceService.deleteQuantityPrice(quantityPriceId);

  res.status(200).json({
    success: true,
    message: 'Quantity price deleted successfully'
  });
});

// Toggle quantity price status
export const toggleSubcategoryQuantityPriceStatus = asyncHandler(async (req, res) => {
  const { quantityPriceId } = req.params;
  const { isActive } = req.body;

  if (isActive === undefined) {
    return res.status(400).json({
      success: false,
      message: 'isActive field is required'
    });
  }

  const updatedPrice = await subcategoryQuantityPriceService.toggleQuantityPriceStatus(
    quantityPriceId,
    isActive
  );

  res.status(200).json({
    success: true,
    message: `Quantity price ${isActive ? 'activated' : 'deactivated'} successfully`,
    data: updatedPrice
  });
});

// Get all subcategories with quantity pricing
export const getSubcategoriesWithQuantityPricing = asyncHandler(async (req, res) => {
  const subcategories = await subcategoryQuantityPriceService.getSubcategoriesWithQuantityPricing();

  res.status(200).json({
    success: true,
    data: subcategories
  });
});