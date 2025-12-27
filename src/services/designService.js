// services/designService.js
import prisma from '../config/database.js';
import logger from '../utils/logger.js';

class DesignService {
  // Create design
    async createDesign(designData, userId, sessionId) {
    const { 
        customizationId, 
        designData: designJson, 
        previewImage, 
        thumbnailImage 
    } = designData;
    
    // Enhanced validation with detailed error messages
    if (!customizationId) {
        throw new Error('Customization ID is required');
    }
    
    if (!designJson) {
        throw new Error('Design data is required');
    }
    
    if (!designJson.layers || !Array.isArray(designJson.layers)) {
        throw new Error('Design data must contain a layers array');
    }
    
    if (!previewImage) {
        throw new Error('Preview image is required');
    }

    // Check if preview image is a valid data URL
    if (!previewImage.startsWith('data:image/')) {
        throw new Error('Preview image must be a valid data URL');
    }


    try {
        // Validate customization exists and is active
        const customization = await prisma.productCustomization.findFirst({
        where: { 
            id: customizationId, 
            isActive: true 
        }
        });
        
        if (!customization) {
        throw new Error(`Customization not found or inactive: ${customizationId}`);
        }


        // Prepare data for database - handle both authenticated and anonymous users
        const designDataForDb = {
        customizationId,
        designData: designJson,
        previewImage,
        thumbnailImage: thumbnailImage || previewImage,
        userId: userId || null, // null for anonymous users
        sessionId: sessionId || `anon_${Date.now()}`, // Ensure sessionId is always present
        status: 'DRAFT'
        };



        const design = await prisma.customDesign.create({
        data: designDataForDb,
        include: {
            customization: {
            include: {
                product: true
            }
            }
        }
        });
        
        return design;
        
    } catch (error) {
        console.error('❌ DATABASE ERROR in createDesign:', {
        name: error.name,
        message: error.message,
        code: error.code,
        meta: error.meta
        });
        
        // More specific error messages for common Prisma errors
        if (error.code === 'P2002') {
        throw new Error('Design with these details already exists');
        } else if (error.code === 'P2003') {
        throw new Error('Invalid customization reference - the customization does not exist');
        } else if (error.code === 'P2016') {
        throw new Error('Required field missing in design data');
        } else if (error.code === 'P2025') {
        throw new Error('Referenced record not found');
        } else {
        throw new Error(`Database error: ${error.message}`);
        }
    }
    }
  
  // Get design by ID with access control
  async getDesignById(designId, userId, sessionId) {
    try {
      const where = { id: designId };
      
      // Add access control
      if (userId) {
        where.OR = [
          { userId },
          { sessionId }
        ];
      } else {
        where.sessionId = sessionId;
      }
      
      const design = await prisma.customDesign.findFirst({
        where,
        include: {
          customization: {
            include: {
              product: {
                include: {
                  images: true,
                  variants: true
                }
              }
            }
          }
        }
      });
      
      if (!design) {
        throw new Error('Design not found or access denied');
      }
      
      return design;
    } catch (error) {
      logger.error('Error in getDesignById:', error);
      throw new Error('Failed to fetch design');
    }
  }
  
  // Get user designs
  async getUserDesigns(userId, sessionId, status = null) {
    try {
      const where = {};
      
      if (userId) {
        where.OR = [
          { userId },
          { sessionId }
        ];
      } else {
        where.sessionId = sessionId;
      }
      
      if (status) {
        where.status = status;
      }
      
      const designs = await prisma.customDesign.findMany({
        where,
        include: {
          customization: {
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                  normalPrice: true,
                  offerPrice: true,
                  images: true
                }
              }
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      });
      
      return designs;
    } catch (error) {
      logger.error('Error in getUserDesigns:', error);
      throw new Error('Failed to fetch user designs');
    }
  }
  
  // Update design
  async updateDesign(designId, updateData, userId, sessionId) {
    const design = await this.getDesignById(designId, userId, sessionId);
    
    if (!design) {
      throw new Error('Design not found or access denied');
    }
    
    try {
      const updatedDesign = await prisma.customDesign.update({
        where: { id: designId },
        data: {
          ...updateData,
          updatedAt: new Date()
        },
        include: {
          customization: {
            include: {
              product: true
            }
          }
        }
      });
      
      logger.info(`Design updated: ${designId}`);
      return updatedDesign;
    } catch (error) {
      logger.error('Error in updateDesign:', error);
      throw new Error('Failed to update design');
    }
  }
  
  // Delete design
  async deleteDesign(designId, userId, sessionId) {
    const design = await this.getDesignById(designId, userId, sessionId);
    
    if (!design) {
      throw new Error('Design not found or access denied');
    }
    
    // Cannot delete designs that are already ordered
    if (design.status === 'ORDERED') {
      throw new Error('Cannot delete ordered designs');
    }
    
    try {
      await prisma.customDesign.delete({
        where: { id: designId }
      });
      
      logger.info(`Design deleted: ${designId}`);
    } catch (error) {
      logger.error('Error in deleteDesign:', error);
      throw new Error('Failed to delete design');
    }
  }
  
  // Generate design preview (placeholder - implement actual canvas rendering)
  async generateDesignPreview(designId, width, height) {
    try {
      const design = await prisma.customDesign.findUnique({
        where: { id: designId }
      });
      
      if (!design) {
        throw new Error('Design not found');
      }
      
      // This would integrate with a canvas rendering service
      // For now, return the existing preview
      return {
        previewUrl: design.previewImage,
        thumbnailUrl: design.thumbnailImage,
        designId: design.id
      };
    } catch (error) {
      logger.error('Error in generateDesignPreview:', error);
      throw new Error('Failed to generate design preview');
    }
  }
  
  // Validate design data structure
  validateDesignData(designData, customization) {
    
    if (!designData || typeof designData !== 'object') {
      console.error('❌ Design data is not an object');
      return false;
    }
    
    // Check for required structure
    if (!designData.layers || !Array.isArray(designData.layers)) {
      console.error('❌ Design data missing layers array');
      return false;
    }
    
    // Check layer count limits
    if (designData.layers.length > 50) {
      console.error('❌ Too many layers');
      return false;
    }
    
    // Validate each layer
    for (const layer of designData.layers) {
      if (!this.validateLayer(layer, customization)) {
        console.error('❌ Invalid layer:', layer);
        return false;
      }
    }
    
    return true;
  }
  
  // Validate individual layer
  validateLayer(layer, customization) {
    if (!layer || typeof layer !== 'object') {
      return false;
    }
    
    // Required fields for all layers
    if (!layer.id || !layer.type) {
      return false;
    }
    
    // Validate based on layer type
    switch (layer.type) {
      case 'text':
        return this.validateTextLayer(layer, customization);
      case 'image':
        return this.validateImageLayer(layer, customization);
      case 'shape':
        return this.validateShapeLayer(layer);
      default:
        console.error('❌ Unknown layer type:', layer.type);
        return false;
    }
  }
  
  // Validate text layer
  validateTextLayer(layer, customization) {
    if (typeof layer.text !== 'string') {
      return false;
    }
    
    // Check text length
    if (layer.text.length > (customization.maxTextLength || 500)) {
      console.error(`❌ Text too long: ${layer.text.length} > ${customization.maxTextLength}`);
      return false;
    }
    
    // Check font if specified
    if (layer.fontFamily && customization.allowedFonts) {
      if (!customization.allowedFonts.includes(layer.fontFamily)) {
        console.error(`❌ Font not allowed: ${layer.fontFamily}`);
        return false;
      }
    }
    
    // Check color if specified
    if (layer.color && customization.allowedColors) {
      if (!customization.allowedColors.includes(layer.color)) {
        console.error(`❌ Color not allowed: ${layer.color}`);
        return false;
      }
    }
    
    // Validate position
    if (typeof layer.x !== 'number' || typeof layer.y !== 'number') {
      return false;
    }
    
    return true;
  }
  
  // Validate image layer
  validateImageLayer(layer, customization) {
    if (!layer.src) {
      return false;
    }
    
    // Count image layers
    const imageLayersCount = customization.maxImages || 10;
    // Note: This count should be done in the main validation, not per layer
    
    // Validate position and size
    if (typeof layer.x !== 'number' || typeof layer.y !== 'number' ||
        typeof layer.width !== 'number' || typeof layer.height !== 'number') {
      return false;
    }
    
    return true;
  }
  
  // Validate shape layer
  validateShapeLayer(layer) {
    if (!layer.shape || !['rectangle', 'circle'].includes(layer.shape)) {
      return false;
    }
    
    // Validate position and size
    if (typeof layer.x !== 'number' || typeof layer.y !== 'number' ||
        typeof layer.width !== 'number' || typeof layer.height !== 'number') {
      return false;
    }
    
    return true;
  }

}

export default new DesignService();