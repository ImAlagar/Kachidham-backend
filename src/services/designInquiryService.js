import prisma from '../config/database.js';
import s3UploadService from './s3UploadService.js';
import logger from '../utils/logger.js';

class DesignInquiryService {
  // Get all design inquiries with pagination and filtering
  async getAllInquiries({ 
    page = 1, 
    limit = 10, 
    status, 
    fabricSource,
    startDate,
    endDate,
    search
  }) {
    const skip = (page - 1) * limit;
    
    const where = {};
    
    // Status filter
    if (status && status !== 'all') {
      where.status = status;
    }
    
    // Fabric source filter
    if (fabricSource && fabricSource !== 'all') {
      where.fabricSource = fabricSource;
    }
    
    // Date range filter
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        where.createdAt.gte = new Date(startDate);
      }
      if (endDate) {
        where.createdAt.lte = new Date(endDate);
      }
    }
    
    // Search by name or contact number
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { contactNumber: { contains: search, mode: 'insensitive' } },
        { whatsappNumber: { contains: search, mode: 'insensitive' } }
      ];
    }
    
    try {
      const [inquiries, total] = await Promise.all([
        prisma.designInquiry.findMany({
          where,
          skip,
          take: limit,
          orderBy: {
            createdAt: 'desc'
          },
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true
              }
            }
          }
        }),
        prisma.designInquiry.count({ where })
      ]);
      
      return {
        inquiries,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      logger.error('Error in getAllInquiries:', error);
      throw new Error('Failed to fetch design inquiries');
    }
  }
  
  // Get inquiry by ID
  async getInquiryById(inquiryId) {
    try {
      const inquiry = await prisma.designInquiry.findUnique({
        where: { id: inquiryId },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true
            }
          }
        }
      });
      
      if (!inquiry) {
        throw new Error('Design inquiry not found');
      }
      
      return inquiry;
    } catch (error) {
      logger.error('Error in getInquiryById:', error);
      throw new Error('Failed to fetch design inquiry');
    }
  }
  
  async createInquiry(inquiryData, file = null) {
    const { 
      name, 
      contactNumber, 
      whatsappNumber, 
      fabricSource, 
      fabricDetails, 
      preferredDate, 
      preferredTime 
    } = inquiryData;
    
    let referencePicture = null;
    
    // Upload reference picture if provided
    if (file) {
      try {
        const uploadResult = await s3UploadService.uploadInquiryImage(file.buffer);
        referencePicture = uploadResult.url;
      } catch (uploadError) {
        logger.error('Failed to upload reference picture:', uploadError);
        throw new Error('Failed to upload reference picture');
      }
    }
    
    // Clean fabricSource value
    const cleanFabricSource = fabricSource.toLowerCase().includes('already_available') 
      ? 'already_available' 
      : 'to_be_sourced';
    
    try {
      const inquiry = await prisma.designInquiry.create({
        data: {
          name,
          contactNumber,
          whatsappNumber: whatsappNumber || null,
          referencePicture, // URL or null
          fabricSource: cleanFabricSource,
          fabricDetails: fabricDetails || null,
          preferredDate: new Date(preferredDate),
          preferredTime
        }
      });
      
      logger.info(`Design inquiry created: ${inquiry.id} by ${name}`);
      return inquiry;
    } catch (error) {
      logger.error('Error in createInquiry:', error);
      throw new Error('Failed to create design inquiry');
    }
  }
  
  
  // Update inquiry status (Admin only)
  async updateInquiryStatus(inquiryId, updateData) {
    const { status, adminNotes } = updateData;
    
    const inquiry = await prisma.designInquiry.findUnique({
      where: { id: inquiryId }
    });
    
    if (!inquiry) {
      throw new Error('Design inquiry not found');
    }
    
    const validStatuses = ['NEW', 'CONTACTED', 'IN_PROGRESS', 'QUOTED', 'CONVERTED', 'REJECTED', 'CLOSED'];
    if (!validStatuses.includes(status)) {
      throw new Error('Invalid status');
    }
    
    try {
      const updatedInquiry = await prisma.designInquiry.update({
        where: { id: inquiryId },
        data: {
          status,
          adminNotes,
          updatedAt: new Date()
        }
      });
      
      logger.info(`Design inquiry status updated: ${inquiryId} -> ${status}`);
      return updatedInquiry;
    } catch (error) {
      logger.error('Error in updateInquiryStatus:', error);
      throw new Error('Failed to update design inquiry');
    }
  }
  
  async updateInquiry(inquiryId, updateData, file = null) {
    const inquiry = await prisma.designInquiry.findUnique({
      where: { id: inquiryId }
    });
    
    if (!inquiry) {
      throw new Error('Design inquiry not found');
    }
    
    let referencePicture = inquiry.referencePicture;
    
    // Upload new reference picture if provided
    if (file) {
      // Delete old picture if exists (you'll need to extract the key from URL)
      if (inquiry.referencePicture) {
        try {
          // Extract the key from the S3 URL
          // Assuming your S3 URL format is: https://bucket.s3.region.amazonaws.com/key
          const urlParts = inquiry.referencePicture.split('/');
          const key = urlParts.slice(3).join('/'); // Remove https://bucket.s3.region.amazonaws.com/
          await s3UploadService.deleteImage(key);
        } catch (error) {
          logger.error('Failed to delete old reference picture:', error);
          // Continue with upload anyway
        }
      }
      
      try {
        // Use uploadInquiryImage instead of uploadDesignReferenceImage
        const uploadResult = await s3UploadService.uploadInquiryImage(file.buffer);
        referencePicture = uploadResult.url;
      } catch (uploadError) {
        logger.error('Failed to upload reference picture:', uploadError);
        throw new Error('Failed to upload reference picture');
      }
    }
    
    // Update preferred date if provided
    if (updateData.preferredDate) {
      const preferredDateTime = new Date(updateData.preferredDate);
      if (preferredDateTime < new Date()) {
        throw new Error('Preferred date cannot be in the past');
      }
      updateData.preferredDate = preferredDateTime;
    }
    
    // Clean fabricSource value if provided
    if (updateData.fabricSource) {
      updateData.fabricSource = updateData.fabricSource.toLowerCase().includes('already_available') 
        ? 'already_available' 
        : 'to_be_sourced';
    }
    
    try {
      const updatedInquiry = await prisma.designInquiry.update({
        where: { id: inquiryId },
        data: {
          ...updateData,
          referencePicture,
          updatedAt: new Date()
        }
      });
      
      logger.info(`Design inquiry updated: ${inquiryId}`);
      return updatedInquiry;
    } catch (error) {
      logger.error('Error in updateInquiry:', error);
      throw new Error('Failed to update design inquiry');
    }
  }
  
  // Delete inquiry (Admin only)
  async deleteInquiry(inquiryId) {
    const inquiry = await prisma.designInquiry.findUnique({
      where: { id: inquiryId }
    });
    
    if (!inquiry) {
      throw new Error('Design inquiry not found');
    }
    
    // Delete reference picture from S3 if exists
    if (inquiry.referencePicture) {
      try {
        // Extract the key from the S3 URL
        const urlParts = inquiry.referencePicture.split('/');
        const key = urlParts.slice(3).join('/');
        await s3UploadService.deleteImage(key);
      } catch (error) {
        logger.error('Failed to delete reference picture from S3:', error);
        // Continue with inquiry deletion
      }
    }
    
    try {
      await prisma.designInquiry.delete({
        where: { id: inquiryId }
      });
      
      logger.info(`Design inquiry deleted: ${inquiryId}`);
    } catch (error) {
      logger.error('Error in deleteInquiry:', error);
      throw new Error('Failed to delete design inquiry');
    }
  }

  
  // Get inquiry statistics
  async getInquiryStats() {
    try {
      const [
        totalInquiries,
        newInquiries,
        contactedInquiries,
        convertedInquiries,
        inquiriesByStatus,
        inquiriesByFabricSource,
        recentInquiries
      ] = await Promise.all([
        prisma.designInquiry.count(),
        prisma.designInquiry.count({ where: { status: 'NEW' } }),
        prisma.designInquiry.count({ where: { status: 'CONTACTED' } }),
        prisma.designInquiry.count({ where: { status: 'CONVERTED' } }),
        prisma.designInquiry.groupBy({
          by: ['status'],
          _count: {
            id: true
          }
        }),
        prisma.designInquiry.groupBy({
          by: ['fabricSource'],
          _count: {
            id: true
          }
        }),
        prisma.designInquiry.findMany({
          take: 5,
          orderBy: {
            createdAt: 'desc'
          },
          select: {
            id: true,
            name: true,
            contactNumber: true,
            status: true,
            preferredDate: true,
            createdAt: true
          }
        })
      ]);
      
      return {
        totalInquiries,
        newInquiries,
        contactedInquiries,
        convertedInquiries,
        conversionRate: totalInquiries > 0 ? (convertedInquiries / totalInquiries) * 100 : 0,
        inquiriesByStatus,
        inquiriesByFabricSource,
        recentInquiries
      };
    } catch (error) {
      logger.error('Error in getInquiryStats:', error);
      throw new Error('Failed to fetch inquiry statistics');
    }
  }
  
  // Get inquiries by user ID
  async getUserInquiries(userId, { page = 1, limit = 10 }) {
    const skip = (page - 1) * limit;
    
    try {
      const [inquiries, total] = await Promise.all([
        prisma.designInquiry.findMany({
          where: { userId },
          skip,
          take: limit,
          orderBy: {
            createdAt: 'desc'
          }
        }),
        prisma.designInquiry.count({ where: { userId } })
      ]);
      
      return {
        inquiries,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      logger.error('Error in getUserInquiries:', error);
      throw new Error('Failed to fetch user inquiries');
    }
  }
}

export default new DesignInquiryService();