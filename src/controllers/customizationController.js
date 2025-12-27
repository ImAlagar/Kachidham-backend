// controllers/customizationController.js
import { customizationService } from '../services/index.js';
import { asyncHandler } from '../utils/helpers.js';
import logger from '../utils/logger.js';

// Get customization by product ID
export const getCustomizationByProductId = asyncHandler(async (req, res) => {
  const { productId } = req.params;
  
  const customization = await customizationService.getCustomizationByProductId(productId);
  
  res.status(200).json({
    success: true,
    data: customization,
    message: customization ? 'Customization found' : 'No customization available for this product'
  });
});

// Create customization (Admin only)
export const createCustomization = asyncHandler(async (req, res) => {
  const customizationData = req.body;
  
  const customization = await customizationService.createCustomization(customizationData);
  
  res.status(201).json({
    success: true,
    message: 'Customization created successfully',
    data: customization
  });
});

// Update customization (Admin only)
export const updateCustomization = asyncHandler(async (req, res) => {
  const { customizationId } = req.params;
  const updateData = req.body;
  
  const updatedCustomization = await customizationService.updateCustomization(
    customizationId, 
    updateData
  );
  
  res.status(200).json({
    success: true,
    message: 'Customization updated successfully',
    data: updatedCustomization
  });
});

// Toggle customization status (Admin only)
export const toggleCustomizationStatus = asyncHandler(async (req, res) => {
  const { customizationId } = req.params;
  const { isActive } = req.body;
  
  const updatedCustomization = await customizationService.toggleCustomizationStatus(
    customizationId, 
    isActive
  );
  
  res.status(200).json({
    success: true,
    message: `Customization ${isActive ? 'activated' : 'deactivated'} successfully`,
    data: updatedCustomization
  });
});

// Delete customization (Admin only)
export const deleteCustomization = asyncHandler(async (req, res) => {
  const { customizationId } = req.params;
  
  await customizationService.deleteCustomization(customizationId);
  
  res.status(200).json({
    success: true,
    message: 'Customization deleted successfully'
  });
});