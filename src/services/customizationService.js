// services/customizationService.js
import prisma from '../config/database.js';
import logger from '../utils/logger.js';

class CustomizationService {
  // Get customization by product ID - ALWAYS returns customization
  async getCustomizationByProductId(productId) {
    try {
      // First, try to find existing customization
      let customization = await prisma.productCustomization.findFirst({
        where: { 
          productId
        },
        include: {
          product: {
            include: {
              images: true,
              variants: {
                where: { stock: { gt: 0 } }
              }
            }
          },
          // SAFE: Exclude designs with large data fields
          designs: {
            select: {
              id: true,
              status: true,
              createdAt: true,
              updatedAt: true,
              // EXCLUDED: designData, previewImage, thumbnailImage (too large)
            },
            take: 5,
            orderBy: {
              createdAt: 'desc'
            }
          }
        }
      });
      
      // If no customization exists, create a default one automatically
      if (!customization) {
        customization = await this.createDefaultCustomization(productId);
      }
      
      // Ensure product is marked as customizable
      await this.ensureProductIsCustomizable(productId);
      
      return customization;
    } catch (error) {
      logger.info('Error in getCustomizationByProductId:', error);
      // Return default customization object even if there's an error
      return this.getDefaultCustomizationObject(productId);
    }
  }
  
  // Create customization - ALWAYS sets as active
  async createCustomization(customizationData) {
    const { 
      productId, 
      name = 'Default Customization',
      basePrice = 0, 
      maxTextLength = 100, 
      maxImages = 5, 
      allowedFonts = [], 
      allowedColors = [] 
    } = customizationData;
    
    // Check if product exists
    const product = await prisma.product.findUnique({
      where: { id: productId }
    });
    
    if (!product) {
      throw new Error('Product not found');
    }
    
    // Check if customization already exists for this product
    const existingCustomization = await prisma.productCustomization.findFirst({
      where: { productId }
    });
    
    if (existingCustomization) {
      // Update existing instead of throwing error
      return await this.updateCustomization(existingCustomization.id, {
        name,
        basePrice,
        maxTextLength,
        maxImages,
        allowedFonts,
        allowedColors,
        isActive: true // Always true
      });
    }
    
    try {
      const customization = await prisma.productCustomization.create({
        data: {
          productId,
          name,
          basePrice,
          maxTextLength,
          maxImages,
          allowedFonts: allowedFonts.length > 0 ? allowedFonts : ['Arial', 'Helvetica', 'Times New Roman', 'Verdana', 'Georgia'],
          allowedColors: allowedColors.length > 0 ? allowedColors : ['#000000', '#FFFFFF', '#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF', '#00FFFF'],
          isActive: true // Always true
        },
        include: {
          product: true
        }
      });
      
      // Update product to mark as customizable
      await this.ensureProductIsCustomizable(productId, basePrice);
      
      logger.info(`Customization created: ${customization.id}`);
      return customization;
    } catch (error) {
      logger.error('Error in createCustomization:', error);
      throw new Error('Failed to create customization');
    }
  }
  
  // Update customization - ALWAYS keeps active
  async updateCustomization(customizationId, updateData) {
    const customization = await prisma.productCustomization.findUnique({
      where: { id: customizationId }
    });
    
    if (!customization) {
      throw new Error('Customization not found');
    }
    
    try {
      // Force isActive to always be true
      const updateDataWithActive = {
        ...updateData,
        isActive: true, // Always true
        updatedAt: new Date()
      };
      
      const updatedCustomization = await prisma.productCustomization.update({
        where: { id: customizationId },
        data: updateDataWithActive,
        include: {
          product: true
        }
      });
      
      logger.info(`Customization updated: ${customizationId}`);
      return updatedCustomization;
    } catch (error) {
      logger.error('Error in updateCustomization:', error);
      throw new Error('Failed to update customization');
    }
  }
  
  // Toggle customization status - ALWAYS returns active
  async toggleCustomizationStatus(customizationId, isActive) {
    const customization = await prisma.productCustomization.findUnique({
      where: { id: customizationId }
    });
    
    if (!customization) {
      throw new Error('Customization not found');
    }
    
    // Force isActive to always be true regardless of input
    const activeStatus = true;
    
    try {
      const updatedCustomization = await prisma.productCustomization.update({
        where: { id: customizationId },
        data: {
          isActive: activeStatus, // Always true
          updatedAt: new Date()
        }
      });
      
      // Update product customizable status to always true
      await this.ensureProductIsCustomizable(customization.productId);
      
      logger.info(`Customization status forced to active: ${customizationId}`);
      return updatedCustomization;
    } catch (error) {
      logger.error('Error in toggleCustomizationStatus:', error);
      throw new Error('Failed to update customization status');
    }
  }
  
  // Delete customization - Products remain customizable
  async deleteCustomization(customizationId) {
    const customization = await prisma.productCustomization.findUnique({
      where: { id: customizationId },
      include: {
        designs: {
          select: {
            id: true
          }
        }
      }
    });
    
    if (!customization) {
      throw new Error('Customization not found');
    }
    
    // Check if there are designs associated
    if (customization.designs.length > 0) {
      throw new Error('Cannot delete customization with existing designs');
    }
    
    try {
      // DO NOT update product to mark as not customizable
      // Products should always remain customizable
      
      await prisma.productCustomization.delete({
        where: { id: customizationId }
      });
      
      // Immediately create a new default customization
      await this.createDefaultCustomization(customization.productId);
      
      logger.info(`Customization recreated after deletion: ${customizationId}`);
    } catch (error) {
      logger.error('Error in deleteCustomization:', error);
      throw new Error('Failed to delete customization');
    }
  }

  // ========== SAFE CUSTOM DESIGNS METHODS ==========
  
  // SAFE: Get custom designs without large fields
  async getCustomDesignsSafe(page = 1, pageSize = 20) {
    try {
      const skip = (page - 1) * pageSize;
      
      const customDesigns = await prisma.customDesign.findMany({
        select: {
          id: true,
          customizationId: true,
          userId: true,
          sessionId: true,
          status: true,
          orderItemId: true,
          createdAt: true,
          updatedAt: true,
          // EXCLUDED: designData, previewImage, thumbnailImage (too large)
        },
        orderBy: {
          id: 'asc'
        },
        skip: skip,
        take: pageSize
      });
      
      const totalCount = await prisma.customDesign.count();
      
      return {
        data: customDesigns,
        pagination: {
          currentPage: page,
          pageSize: pageSize,
          totalCount: totalCount,
          totalPages: Math.ceil(totalCount / pageSize),
          hasNext: skip + pageSize < totalCount,
          hasPrev: page > 1
        }
      };
    } catch (error) {
      logger.error('Error in getCustomDesignsSafe:', error);
      throw new Error('Failed to fetch custom designs');
    }
  }

  // Get specific custom design with all data (single record only)
  async getCustomDesignById(id) {
    try {
      const customDesign = await prisma.customDesign.findUnique({
        where: { id },
        select: {
          id: true,
          customizationId: true,
          userId: true,
          sessionId: true,
          designData: true,
          previewImage: true,
          thumbnailImage: true,
          status: true,
          orderItemId: true,
          createdAt: true,
          updatedAt: true,
          customization: {
            select: {
              product: {
                select: {
                  id: true,
                  name: true,
                  productCode: true
                }
              }
            }
          }
        }
      });
      
      return customDesign;
    } catch (error) {
      logger.error('Error in getCustomDesignById:', error);
      throw new Error('Failed to fetch custom design');
    }
  }

  // Get only the large data fields for a specific design
  async getDesignLargeData(id) {
    try {
      const design = await prisma.customDesign.findUnique({
        where: { id },
        select: {
          id: true,
          designData: true,
          previewImage: true,
          thumbnailImage: true
        }
      });
      
      return design;
    } catch (error) {
      logger.error('Error in getDesignLargeData:', error);
      throw new Error('Failed to fetch design large data');
    }
  }

  // Create custom design (safe response)
  async createCustomDesign(designData) {
    try {
      const customDesign = await prisma.customDesign.create({
        data: designData,
        select: {
          id: true,
          customizationId: true,
          userId: true,
          sessionId: true,
          status: true,
          orderItemId: true,
          createdAt: true,
          updatedAt: true,
          // EXCLUDE large fields in response
        }
      });
      
      logger.info(`Custom design created: ${customDesign.id}`);
      return customDesign;
    } catch (error) {
      logger.error('Error in createCustomDesign:', error);
      throw new Error('Failed to create custom design');
    }
  }

  // ========== HELPER METHODS ==========
  
  // Create default customization for products without one
  async createDefaultCustomization(productId) {
    try {
      const product = await prisma.product.findUnique({
        where: { id: productId }
      });
      
      if (!product) {
        throw new Error('Product not found');
      }
      
      const customization = await prisma.productCustomization.create({
        data: {
          productId,
          name: 'Default Customization',
          basePrice: 0,
          isActive: true, // Always true
          maxTextLength: 100,
          maxImages: 5,
          allowedFonts: ['Arial', 'Helvetica', 'Times New Roman', 'Verdana', 'Georgia'],
          allowedColors: ['#000000', '#FFFFFF', '#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF', '#00FFFF']
        },
        include: {
          product: {
            include: {
              images: true,
              variants: {
                where: { stock: { gt: 0 } }
              }
            }
          }
        }
      });
      
      // Ensure product is marked as customizable
      await this.ensureProductIsCustomizable(productId);
      
      logger.info(`Default customization created for product: ${productId}`);
      return customization;
    } catch (error) {
      logger.error('Error creating default customization:', error);
      // Return default object even if creation fails
      return this.getDefaultCustomizationObject(productId);
    }
  }

  // Ensure product is always marked as customizable
  async ensureProductIsCustomizable(productId, basePrice = 0) {
    try {
      await prisma.product.update({
        where: { id: productId },
        data: { 
          isCustomizable: true, // Always true
          baseCustomizationPrice: basePrice 
        }
      });
    } catch (error) {
      logger.error('Error ensuring product is customizable:', error);
      // Continue even if this fails
    }
  }

  // Get default customization object (fallback)
  getDefaultCustomizationObject(productId) {
    return {
      id: 'default-customization',
      productId,
      name: 'Default Customization',
      basePrice: 0,
      isActive: true, // Always true
      maxTextLength: 100,
      maxImages: 5,
      allowedFonts: ['Arial', 'Helvetica', 'Times New Roman', 'Verdana', 'Georgia'],
      allowedColors: ['#000000', '#FFFFFF', '#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF', '#00FFFF'],
      createdAt: new Date(),
      updatedAt: new Date(),
      product: {
        id: productId,
        isCustomizable: true, // Always true
        baseCustomizationPrice: 0
      }
    };
  }

  // ========== BULK OPERATIONS ==========
  
  // Ensure ALL products have customization and are marked as customizable
  async ensureAllProductsHaveCustomization() {
    try {
      // First, ensure all products are marked as customizable
      await prisma.product.updateMany({
        data: {
          isCustomizable: true
        }
      });
      
      // Find products without customization
      const productsWithoutCustomization = await prisma.product.findMany({
        where: {
          customizations: {
            none: {}
          }
        }
      });
      
      const results = [];
      for (const product of productsWithoutCustomization) {
        try {
          const customization = await this.createDefaultCustomization(product.id);
          results.push({
            productId: product.id,
            productName: product.name,
            success: true,
            customizationId: customization.id
          });
        } catch (error) {
          results.push({
            productId: product.id,
            productName: product.name,
            success: false,
            error: error.message
          });
        }
      }
      
      logger.info(`Ensured customizations for ${results.filter(r => r.success).length} products`);
      return {
        totalProducts: productsWithoutCustomization.length,
        successful: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length,
        details: results
      };
    } catch (error) {
      logger.error('Error in ensureAllProductsHaveCustomization:', error);
      throw new Error('Failed to ensure customizations for all products');
    }
  }

  // Force activate ALL existing customizations
  async activateAllCustomizations() {
    try {
      const result = await prisma.productCustomization.updateMany({
        where: {
          isActive: false
        },
        data: {
          isActive: true
        }
      });
      
      logger.info(`Activated ${result.count} customizations`);
      return result;
    } catch (error) {
      logger.error('Error in activateAllCustomizations:', error);
      throw new Error('Failed to activate all customizations');
    }
  }

  // Get all products with their customization status
  async getAllProductsCustomizationStatus() {
    try {
      const products = await prisma.product.findMany({
        select: {
          id: true,
          name: true,
          isCustomizable: true,
          baseCustomizationPrice: true,
          customizations: {
            select: {
              id: true,
              isActive: true,
              basePrice: true
            }
          }
        },
        orderBy: {
          name: 'asc'
        }
      });
      
      return products.map(product => ({
        id: product.id,
        name: product.name,
        isCustomizable: product.isCustomizable,
        hasCustomization: product.customizations.length > 0,
        customization: product.customizations[0] || null,
        customizationActive: product.customizations[0]?.isActive || false
      }));
    } catch (error) {
      logger.error('Error in getAllProductsCustomizationStatus:', error);
      throw new Error('Failed to get products customization status');
    }
  }
}

// Run this once to initialize all products as customizable
async function initializeAllProductsAsCustomizable() {
  try {
    const service = new CustomizationService();
    const result = await service.ensureAllProductsHaveCustomization();
    logger.info('✅ All products are now customizable!', result);
    
    const activationResult = await service.activateAllCustomizations();
    logger.info('✅ All customizations activated!', activationResult);
  } catch (error) {
    logger.error('Error initializing customizable products:', error);
  }
}

// Call this function once
initializeAllProductsAsCustomizable();

export default new CustomizationService();