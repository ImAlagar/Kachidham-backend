// controllers/subcategoryController.js
import prisma from '../config/database.js';
import { subcategoryService } from '../services/index.js';
import { asyncHandler } from '../utils/helpers.js';

// Get all subcategories
export const getAllSubcategories = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, categoryId, isActive } = req.query;
  
  const result = await subcategoryService.getAllSubcategories({
    page: parseInt(page),
    limit: parseInt(limit),
    categoryId,
    isActive: isActive !== undefined ? isActive === 'true' : undefined
  });
  
  res.status(200).json({
    success: true,
    data: result.subcategories,
    pagination: result.pagination // Add this line
  });
});
// Get subcategory by ID
export const getSubcategoryById = asyncHandler(async (req, res) => {
  const { subcategoryId } = req.params;
  
  const subcategory = await subcategoryService.getSubcategoryById(subcategoryId);
  
  res.status(200).json({
    success: true,
    data: subcategory
  });
});

// Create subcategory (Admin only)
export const createSubcategory = asyncHandler(async (req, res) => {
  const subcategoryData = req.body;
  const file = req.file;
  
  const subcategory = await subcategoryService.createSubcategory(subcategoryData, file);
  
  res.status(201).json({
    success: true,
    message: 'Subcategory created successfully',
    data: subcategory
  });
});

// Update subcategory (Admin only)
export const updateSubcategory = asyncHandler(async (req, res) => {
  const { subcategoryId } = req.params;
  const updateData = req.body;
  const file = req.file;
  
  const updatedSubcategory = await subcategoryService.updateSubcategory(
    subcategoryId, 
    updateData, 
    file
  );
  
  res.status(200).json({
    success: true,
    message: 'Subcategory updated successfully',
    data: updatedSubcategory
  });
});

// Delete subcategory (Admin only)
export const deleteSubcategory = asyncHandler(async (req, res) => {
  const { subcategoryId } = req.params;
  
  await subcategoryService.deleteSubcategory(subcategoryId);
  
  res.status(200).json({
    success: true,
    message: 'Subcategory deleted successfully'
  });
});

// Toggle subcategory status (Admin only)
export const toggleSubcategoryStatus = asyncHandler(async (req, res) => {
  const { subcategoryId } = req.params;
  const { isActive } = req.body;
  
  const updatedSubcategory = await subcategoryService.toggleSubcategoryStatus(
    subcategoryId, 
    isActive
  );
  
  res.status(200).json({
    success: true,
    message: `Subcategory ${isActive ? 'activated' : 'deactivated'} successfully`,
    data: updatedSubcategory
  });
});


// Get subcategories by category ID
export const getSubcategoriesByCategory = asyncHandler(async (req, res) => {
  const { categoryId } = req.params;
  const { isActive = 'true' } = req.query;
  
  // Validate category exists
  const category = await prisma.category.findUnique({
    where: { id: categoryId }
  });
  
  if (!category) {
    return res.status(404).json({
      success: false,
      message: 'Category not found'
    });
  }
  
  const subcategories = await prisma.subcategory.findMany({
    where: {
      categoryId,
      isActive: isActive === 'true'
    },
    include: {
      category: {
        select: {
          id: true,
          name: true
        }
      }
    },
    orderBy: {
      name: 'asc'
    }
  });
  
  res.status(200).json({
    success: true,
    data: subcategories
  });
});