import prisma from '../config/database.js';
import logger from '../utils/logger.js';

class FaqService {
  // Get all FAQs with filtering and pagination
  async getAllFaqs({ page, limit, isActive, category, search }) {
    const skip = (page - 1) * limit;
    
    const where = {};
    
    // Apply filters if provided
    if (isActive !== undefined) {
      where.isActive = isActive === 'true' || isActive === true;
    }
    
    if (category) {
      where.category = category;
    }
    
    if (search) {
      where.OR = [
        { question: { contains: search, mode: 'insensitive' } },
        { answer: { contains: search, mode: 'insensitive' } }
      ];
    }
    
    try {
      const [faqs, total] = await Promise.all([
        prisma.fAQ.findMany({
          where,
          skip,
          take: limit,
          orderBy: [
            { order: 'asc' },
            { createdAt: 'desc' }
          ]
        }),
        prisma.fAQ.count({ where })
      ]);
      
      return {
        faqs,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      logger.error('Error in getAllFaqs:', error);
      throw new Error('Failed to fetch FAQs');
    }
  }
  
  // Get active FAQs by category (public access)
  async getActiveFaqsByCategory(category) {
    try {
      const faqs = await prisma.fAQ.findMany({
        where: {
          isActive: true,
          category: category || undefined
        },
        orderBy: [
          { order: 'asc' },
          { createdAt: 'desc' }
        ],
        select: {
          id: true,
          question: true,
          answer: true,
          category: true,
          order: true
        }
      });
      
      return faqs;
    } catch (error) {
      logger.error('Error in getActiveFaqsByCategory:', error);
      throw new Error('Failed to fetch FAQs');
    }
  }
  
  // Get FAQ by ID
  async getFaqById(faqId) {
    try {
      const faq = await prisma.fAQ.findUnique({
        where: { id: faqId }
      });
      
      if (!faq) {
        throw new Error('FAQ not found');
      }
      
      return faq;
    } catch (error) {
      logger.error('Error in getFaqById:', error);
      if (error.message === 'FAQ not found') {
        throw error;
      }
      throw new Error('Failed to fetch FAQ');
    }
  }
  
  // Create FAQ
  async createFaq(faqData) {
    const { question, answer, category = 'GENERAL', order = 0, isActive = true } = faqData;
    
    // Validate required fields
    if (!question || !answer) {
      throw new Error('Question and answer are required');
    }
    
    // Validate category
    const validCategories = ['GENERAL', 'ORDERS', 'SHIPPING', 'RETURNS', 'PAYMENTS', 'PRODUCTS', 'CUSTOMIZATION', 'WHOLESALE', 'ACCOUNT'];
    if (!validCategories.includes(category)) {
      throw new Error('Invalid FAQ category');
    }
    
    // Get highest order value to set default
    let calculatedOrder = order;
    if (!order) {
      const lastFaq = await prisma.fAQ.findFirst({
        where: { category, isActive: true },
        orderBy: { order: 'desc' },
        select: { order: true }
      });
      calculatedOrder = lastFaq ? lastFaq.order + 1 : 0;
    }
    
    try {
      const faq = await prisma.fAQ.create({
        data: {
          question,
          answer,
          category,
          order: calculatedOrder,
          isActive
        }
      });
      
      logger.info(`FAQ created: ${faq.id}`);
      return faq;
    } catch (error) {
      logger.error('Error in createFaq:', error);
      if (error.code === 'P2002') {
        throw new Error('Duplicate FAQ entry');
      }
      throw new Error('Failed to create FAQ');
    }
  }
  
  // Update FAQ
  async updateFaq(faqId, updateData) {
    const { question, answer, category, order, isActive } = updateData;
    
    // Check if FAQ exists
    const existingFaq = await prisma.fAQ.findUnique({
      where: { id: faqId }
    });
    
    if (!existingFaq) {
      throw new Error('FAQ not found');
    }
    
    // Validate category if being updated
    if (category) {
      const validCategories = ['GENERAL', 'ORDERS', 'SHIPPING', 'RETURNS', 'PAYMENTS', 'PRODUCTS', 'CUSTOMIZATION', 'WHOLESALE', 'ACCOUNT'];
      if (!validCategories.includes(category)) {
        throw new Error('Invalid FAQ category');
      }
    }
    
    try {
      const updatedFaq = await prisma.fAQ.update({
        where: { id: faqId },
        data: {
          question,
          answer,
          category,
          order: order !== undefined ? parseInt(order) : undefined,
          isActive,
          updatedAt: new Date()
        }
      });
      
      logger.info(`FAQ updated: ${faqId}`);
      return updatedFaq;
    } catch (error) {
      logger.error('Error in updateFaq:', error);
      throw new Error('Failed to update FAQ');
    }
  }
  
  // Delete FAQ
  async deleteFaq(faqId) {
    // Check if FAQ exists
    const existingFaq = await prisma.fAQ.findUnique({
      where: { id: faqId }
    });
    
    if (!existingFaq) {
      throw new Error('FAQ not found');
    }
    
    try {
      await prisma.fAQ.delete({
        where: { id: faqId }
      });
      
      logger.info(`FAQ deleted: ${faqId}`);
    } catch (error) {
      logger.error('Error in deleteFaq:', error);
      throw new Error('Failed to delete FAQ');
    }
  }
  
  // Toggle FAQ status
  async toggleFaqStatus(faqId, isActive) {
    // Check if FAQ exists
    const existingFaq = await prisma.fAQ.findUnique({
      where: { id: faqId }
    });
    
    if (!existingFaq) {
      throw new Error('FAQ not found');
    }
    
    const activeStatus = isActive === true || isActive === 'true';
    
    try {
      const updatedFaq = await prisma.fAQ.update({
        where: { id: faqId },
        data: {
          isActive: activeStatus,
          updatedAt: new Date()
        }
      });
      
      logger.info(`FAQ status updated: ${faqId} -> ${activeStatus ? 'active' : 'inactive'}`);
      return updatedFaq;
    } catch (error) {
      logger.error('Error in toggleFaqStatus:', error);
      throw new Error('Failed to update FAQ status');
    }
  }
  
  // Update FAQ order
  async updateFaqOrder(faqId, order) {
    // Check if FAQ exists
    const existingFaq = await prisma.fAQ.findUnique({
      where: { id: faqId }
    });
    
    if (!existingFaq) {
      throw new Error('FAQ not found');
    }
    
    try {
      const updatedFaq = await prisma.fAQ.update({
        where: { id: faqId },
        data: {
          order,
          updatedAt: new Date()
        }
      });
      
      logger.info(`FAQ order updated: ${faqId} -> ${order}`);
      return updatedFaq;
    } catch (error) {
      logger.error('Error in updateFaqOrder:', error);
      throw new Error('Failed to update FAQ order');
    }
  }
  
  // Bulk update FAQ order
  async bulkUpdateFaqOrder(faqs) {
    if (!Array.isArray(faqs)) {
      throw new Error('FAQ list must be an array');
    }
    
    try {
      const updatePromises = faqs.map(faq => 
        prisma.fAQ.update({
          where: { id: faq.id },
          data: { 
            order: faq.order,
            updatedAt: new Date()
          }
        })
      );
      
      const updatedFaqs = await Promise.all(updatePromises);
      
      logger.info(`Bulk FAQ order update completed: ${updatedFaqs.length} FAQs updated`);
      return updatedFaqs;
    } catch (error) {
      logger.error('Error in bulkUpdateFaqOrder:', error);
      throw new Error('Failed to bulk update FAQ orders');
    }
  }
  
  // Get FAQ statistics
  async getFaqStats() {
    try {
      const [
        totalFaqs,
        activeFaqs,
        faqsByCategory,
        recentFaqs
      ] = await Promise.all([
        prisma.fAQ.count(),
        prisma.fAQ.count({ where: { isActive: true } }),
        prisma.fAQ.groupBy({
          by: ['category'],
          _count: {
            id: true
          },
          where: {
            isActive: true
          }
        }),
        prisma.fAQ.findMany({
          where: { isActive: true },
          orderBy: { createdAt: 'desc' },
          take: 5,
          select: {
            id: true,
            question: true,
            category: true,
            createdAt: true
          }
        })
      ]);
      
      return {
        totalFaqs,
        activeFaqs,
        inactiveFaqs: totalFaqs - activeFaqs,
        faqsByCategory,
        recentFaqs
      };
    } catch (error) {
      logger.error('Error in getFaqStats:', error);
      throw new Error('Failed to fetch FAQ statistics');
    }
  }
  
  // Get FAQ categories
  async getFaqCategories() {
    try {
      const categories = await prisma.fAQ.groupBy({
        by: ['category'],
        _count: {
          id: true
        },
        where: {
          isActive: true
        },
        orderBy: {
          category: 'asc'
        }
      });
      
      return categories.map(cat => ({
        category: cat.category,
        count: cat._count.id
      }));
    } catch (error) {
      logger.error('Error in getFaqCategories:', error);
      throw new Error('Failed to fetch FAQ categories');
    }
  }
}

export default new FaqService();