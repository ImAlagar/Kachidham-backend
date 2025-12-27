// controllers/categoryController.js
import { categoryService } from '../services/index.js';
import { asyncHandler } from '../utils/helpers.js';
import logger from '../utils/logger.js';

// Get all categories
export const getAllCategories = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, isActive, includeSubcategories } = req.query;
  
  const result = await categoryService.getAllCategories({
    page: parseInt(page),
    limit: parseInt(limit),
    isActive: isActive, // Let service handle the conversion
    includeSubcategories: includeSubcategories === 'true'
  });
  
  res.status(200).json({
    success: true,
    data: result.categories, // Changed from result to result.categories
    pagination: result.pagination
  });
});

// Get category by ID
export const getCategoryById = asyncHandler(async (req, res) => {
  const { categoryId } = req.params;
  const { includeSubcategories } = req.query;
  
  const category = await categoryService.getCategoryById(
    categoryId, 
    includeSubcategories === 'true'
  );
  
  res.status(200).json({
    success: true,
    data: category
  });
});

// Create category (Admin only)
export const createCategory = asyncHandler(async (req, res) => {
  const categoryData = req.body;
  const file = req.file;
  
  const category = await categoryService.createCategory(categoryData, file);
  
  res.status(201).json({
    success: true,
    message: 'Category created successfully',
    data: category
  });
});

// Update category (Admin only)
export const updateCategory = asyncHandler(async (req, res) => {
  const { categoryId } = req.params;
  const updateData = req.body;
  const file = req.file;
  
  const updatedCategory = await categoryService.updateCategory(
    categoryId, 
    updateData, 
    file
  );
  
  res.status(200).json({
    success: true,
    message: 'Category updated successfully',
    data: updatedCategory
  });
});

// Delete category (Admin only)
export const deleteCategory = asyncHandler(async (req, res) => {
  const { categoryId } = req.params;
  
  await categoryService.deleteCategory(categoryId);
  
  res.status(200).json({
    success: true,
    message: 'Category deleted successfully'
  });
});

// Toggle category status (Admin only)
export const toggleCategoryStatus = asyncHandler(async (req, res) => {
  const { categoryId } = req.params;
  const { isActive } = req.body;
  
  const updatedCategory = await categoryService.toggleCategoryStatus(
    categoryId, 
    isActive
  );
  
  res.status(200).json({
    success: true,
    message: `Category ${isActive ? 'activated' : 'deactivated'} successfully`,
    data: updatedCategory
  });
});

// Get category statistics (Admin only)
export const getCategoryStats = asyncHandler(async (req, res) => {
  const stats = await categoryService.getCategoryStats();
  
  res.status(200).json({
    success: true,
    data: stats
  });
});

// Update category image (Admin only)
export const updateCategoryImage = asyncHandler(async (req, res) => {
  const { categoryId } = req.params;
  const file = req.file;
  
  if (!file) {
    return res.status(400).json({
      success: false,
      message: 'Category image is required'
    });
  }
  
  const updatedCategory = await categoryService.updateCategoryImage(
    categoryId, 
    file
  );
  
  res.status(200).json({
    success: true,
    message: 'Category image updated successfully',
    data: updatedCategory
  });
});

// Remove category image (Admin only)
export const removeCategoryImage = asyncHandler(async (req, res) => {
  const { categoryId } = req.params;
  
  const updatedCategory = await categoryService.removeCategoryImage(categoryId);
  
  res.status(200).json({
    success: true,
    message: 'Category image removed successfully',
    data: updatedCategory
  });
});