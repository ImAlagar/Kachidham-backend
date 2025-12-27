// services/categoryService.js
import prisma from '../config/database.js';
import s3UploadService from './s3UploadService.js';
import logger from '../utils/logger.js';

class CategoryService {
  // Get all categories with pagination and filtering
async getAllCategories({ page, limit, isActive, includeSubcategories }) {
  const skip = (page - 1) * limit;
  
  const where = {};
  
  // Only apply filter if isActive is explicitly provided
  if (isActive !== undefined) {
    where.isActive = isActive === 'true' ? true : isActive === 'false' ? false : isActive;
  }
  
  const include = {
    _count: {
      select: {
        products: true,
        subcategories: true
      }
    }  
  };
  
  if (includeSubcategories) {
    include.subcategories = {
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        description: true,
        image: true,
        isActive: true,
        createdAt: true
      }
    };
  }
  
  try {
    const [categories, total] = await Promise.all([
      prisma.category.findMany({
        where,
        skip,
        take: limit,
        include,
        orderBy: {
          createdAt: 'desc'
        }
      }),
      prisma.category.count({ where })
    ]);
    
    return {
      categories,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    };
  } catch (error) {
    logger.error('Error in getAllCategories:', error);
    throw new Error('Failed to fetch categories');
  }
}

// Get category by ID - Also include counts
async getCategoryById(categoryId, includeSubcategories = false) {
  const include = {
    _count: {
      select: {
        products: true,
        subcategories: true
      }
    }
  };
  
  if (includeSubcategories) {
    include.subcategories = {
      where: { isActive: true },
      include: {
        _count: {
          select: {
            products: true
          }
        },
        products: {
          where: { status: 'ACTIVE' },
          select: {
            id: true,
            name: true,
            productCode: true,
            normalPrice: true,
            offerPrice: true,
            status: true
          }
        }
      }
    };
  }
  
  try {
    const category = await prisma.category.findUnique({
      where: { id: categoryId },
      include
    });
    
    if (!category) {
      throw new Error('Category not found');
    }
    
    return category;
  } catch (error) {
    logger.error('Error in getCategoryById:', error);
    throw new Error('Failed to fetch category');
  }
}
  
// Create category
async createCategory(categoryData, file = null) {
  const { name, description, isActive = true } = categoryData;
  
  // Check if category name already exists
  const existingCategory = await prisma.category.findFirst({
    where: { name }
  });
  
  if (existingCategory) {
    throw new Error('Category name already exists');
  }
  
  let imageUrl = null;
  let imagePublicId = null;
  
  // Upload category image if provided
  if (file) {
    try {
      const uploadResult = await s3UploadService.uploadCategoryImage(file.buffer);
      imageUrl = uploadResult.url;
      imagePublicId = uploadResult.key;
    } catch (uploadError) {
      logger.error('Failed to upload category image:', uploadError);
      throw new Error('Failed to upload category image');
    }
  }
  
  const category = await prisma.category.create({
    data: {
      name,
      description,
      image: imageUrl,
      imagePublicId,
      isActive,
      subcategories: {
        create: [] // Initialize with empty subcategories
      }
    },
    include: {
      subcategories: true
    }
  });
  
  logger.info(`Category created: ${category.id}`);
  return category;
}
  
  // Update category
  async updateCategory(categoryId, updateData, file = null) {
    const category = await prisma.category.findUnique({
      where: { id: categoryId }
    });
    
    if (!category) {
      throw new Error('Category not found');
    }
    
    const { name, description, isActive } = updateData;
    
    // Check if category name is being updated and if it's already taken
    if (name && name !== category.name) {
      const existingCategory = await prisma.category.findFirst({
        where: {
          name,
          id: { not: categoryId }
        }
      });
      
      if (existingCategory) {
        throw new Error('Category name already exists');
      }
    }
    
    let imageUrl = category.image;
    let imagePublicId = category.imagePublicId;
    
    // Upload new category image if provided
    if (file) {
      // Delete old image if exists
      if (category.imagePublicId) {
        try {
          await s3UploadService.deleteImage(category.imagePublicId);
        } catch (error) {
          logger.error('Failed to delete old category image:', error);
          // Continue with new upload
        }
      }
      
      try {
        const uploadResult = await s3UploadService.uploadCategoryImage(file.buffer);
        imageUrl = uploadResult.url;
        imagePublicId = uploadResult.key;
      } catch (uploadError) {
        logger.error('Failed to upload category image:', uploadError);
        throw new Error('Failed to upload category image');
      }
    }
    
    const updatedCategory = await prisma.category.update({
      where: { id: categoryId },
      data: {
        name,
        description,
        image: imageUrl,
        imagePublicId,
        isActive,
        updatedAt: new Date()
      },
      include: {
        subcategories: true
      }
    });
    
    logger.info(`Category updated: ${categoryId}`);
    return updatedCategory;
  }
  
  // Delete category
  async deleteCategory(categoryId) {
    const category = await prisma.category.findUnique({
      where: { id: categoryId },
      include: {
        subcategories: true,
        products: true
      }
    });
    
    if (!category) {
      throw new Error('Category not found');
    }
    
    // Check if category has products
    if (category.products.length > 0) {
      throw new Error('Cannot delete category with existing products');
    }
    
    // Delete category image from S3 if exists
    if (category.imagePublicId) {
      try {
        await s3UploadService.deleteImage(category.imagePublicId);
      } catch (error) {
        logger.error('Failed to delete category image from S3:', error);
        // Continue with category deletion
      }
    }
    
    // Delete subcategories images
    for (const subcategory of category.subcategories) {
      if (subcategory.imagePublicId) {
        try {
          await s3UploadService.deleteImage(subcategory.imagePublicId);
        } catch (error) {
          logger.error('Failed to delete subcategory image from S3:', error);
        }
      }
    }
    
    // Delete category and its subcategories
    await prisma.category.delete({
      where: { id: categoryId }
    });
    
    logger.info(`Category deleted: ${categoryId}`);
  }
  
  // Toggle category status
  async toggleCategoryStatus(categoryId, isActive) {
    const category = await prisma.category.findUnique({
      where: { id: categoryId }
    });
    
    if (!category) {
      throw new Error('Category not found');
    }
    
    const activeStatus = isActive === true || isActive === 'true';
    
    const updatedCategory = await prisma.category.update({
      where: { id: categoryId },
      data: {
        isActive: activeStatus,
        updatedAt: new Date()
      },
      include: {
        subcategories: true
      }
    });
    
    logger.info(`Category status updated: ${categoryId} -> ${activeStatus ? 'active' : 'inactive'}`);
    return updatedCategory;
  }
  
  // Update category image
  async updateCategoryImage(categoryId, file) {
    const category = await prisma.category.findUnique({
      where: { id: categoryId }
    });
    
    if (!category) {
      throw new Error('Category not found');
    }
    
    // Delete old image if exists
    if (category.imagePublicId) {
      try {
        await s3UploadService.deleteImage(category.imagePublicId);
      } catch (error) {
        logger.error('Failed to delete old category image:', error);
        // Continue with new upload
      }
    }
    
    let imageUrl = null;
    let imagePublicId = null;
    
    // Upload new image
    try {
      const uploadResult = await s3UploadService.uploadCategoryImage(file.buffer);
      imageUrl = uploadResult.url;
      imagePublicId = uploadResult.key;
    } catch (uploadError) {
      logger.error('Failed to upload category image:', uploadError);
      throw new Error('Failed to upload category image');
    }
    
    const updatedCategory = await prisma.category.update({
      where: { id: categoryId },
      data: {
        image: imageUrl,
        imagePublicId,
        updatedAt: new Date()
      }
    });
    
    logger.info(`Category image updated: ${categoryId}`);
    return updatedCategory;
  }
  
  // Remove category image
  async removeCategoryImage(categoryId) {
    const category = await prisma.category.findUnique({
      where: { id: categoryId }
    });
    
    if (!category) {
      throw new Error('Category not found');
    }
    
    if (!category.imagePublicId) {
      throw new Error('Category does not have an image');
    }
    
    // Delete image from S3
    try {
      await s3UploadService.deleteImage(category.imagePublicId);
    } catch (error) {
      logger.error('Failed to delete category image from S3:', error);
      throw new Error('Failed to remove category image');
    }
    
    const updatedCategory = await prisma.category.update({
      where: { id: categoryId },
      data: {
        image: null,
        imagePublicId: null,
        updatedAt: new Date()
      }
    });
    
    logger.info(`Category image removed: ${categoryId}`);
    return updatedCategory;
  }
  
  // Get category statistics
  async getCategoryStats() {
    const [
      totalCategories,
      activeCategories,
      categoriesWithProducts,
      totalSubcategories,
      categoriesByType
    ] = await Promise.all([
      prisma.category.count(),
      prisma.category.count({ where: { isActive: true } }),
      prisma.category.count({
        where: {
          products: {
            some: {
              status: 'ACTIVE'
            }
          }
        }
      }),
      prisma.subcategory.count({ where: { isActive: true } }),
      prisma.category.groupBy({
        by: ['name'],
        _count: {
          id: true
        }
      })
    ]);
    
    return {
      totalCategories,
      activeCategories,
      inactiveCategories: totalCategories - activeCategories,
      categoriesWithProducts,
      totalSubcategories,
      categoriesByType
    };
  }
}

export default new CategoryService();