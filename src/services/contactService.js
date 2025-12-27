import prisma from '../config/database.js';
import emailNotificationService from './emailNotificationService.js';
import logger from '../utils/logger.js';

class ContactService {
  // Get all contacts with pagination and filtering
  async getAllContacts({ page, limit, status, userId }) {
    const skip = (page - 1) * limit;
    
    const where = {};
    
    if (status) {
      where.status = status;
    }
    
    if (userId) {
      where.userId = userId;
    }
    
    const [contacts, total] = await Promise.all([
      prisma.contact.findMany({
        where,
        skip,
        take: limit,
        include: {
          users: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      }),
      prisma.contact.count({ where })
    ]);
    
    return {
      contacts,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  }

  // Get contact by ID
  async getContactById(contactId) {
    const contact = await prisma.contact.findUnique({
      where: { id: contactId },
      include: {
        users: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true
          }
        }
      }
    });
    
    if (!contact) {
      throw new Error('Contact not found');
    }
    
    return contact;
  }

  // Create contact
  async createContact(contactData) {
    const { name, email, phone, message, userId } = contactData;
    
    // Validate required fields
    if (!name || !email || !message) {
      throw new Error('Name, email, and message are required');
    }
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new Error('Invalid email format');
    }
    
    const contact = await prisma.contact.create({
      data: {
        name,
        email,
        phone: phone || null,
        message,
        userId: userId || null,
        status: 'PENDING'
      },
      include: {
        users: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true
          }
        }
      }
    });
    
    // Send notification emails
    try {
      // Send notification to admin
      await emailNotificationService.sendContactNotification(contact);
      
      // Send auto-reply to customer
      await emailNotificationService.sendContactAutoReply(contact);
      
      logger.info(`Contact created and notifications sent: ${contact.id}`);
    } catch (emailError) {
      logger.error('Failed to send contact notification emails:', emailError);
      // Don't throw error - contact should be created even if emails fail
    }
    
    return contact;
  }

// services/contactService.js - Update this method
async updateContactStatus(contactId, statusData) {
  const { status, adminNotes } = statusData;
  
  const contact = await prisma.contact.findUnique({
    where: { id: contactId }
  });
  
  if (!contact) {
    throw new Error('Contact not found');
  }
  
  const validStatuses = ['PENDING', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'];
  if (!validStatuses.includes(status)) {
    throw new Error('Invalid status');
  }
  
  // Include adminNotes in the update
  const updatedContact = await prisma.contact.update({
    where: { id: contactId },
    data: {
      status,
      ...(adminNotes && { adminNotes }) // Add this back
    },
    include: {
      users: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true
        }
      }
    }
  });
  
  logger.info(`Contact status updated: ${contactId} -> ${status}`);
  return updatedContact;
}

  // Update contact (Admin only)
  async updateContact(contactId, updateData) {
    const contact = await prisma.contact.findUnique({
      where: { id: contactId }
    });
    
    if (!contact) {
      throw new Error('Contact not found');
    }
    
    const { name, email, phone, message, status } = updateData;
    
    // Validate email if provided
    if (email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        throw new Error('Invalid email format');
      }
    }
    
    // Validate status if provided
    if (status) {
      const validStatuses = ['PENDING', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'];
      if (!validStatuses.includes(status)) {
        throw new Error('Invalid status');
      }
    }
    
    const updatedContact = await prisma.contact.update({
      where: { id: contactId },
      data: {
        ...(name && { name }),
        ...(email && { email }),
        ...(phone !== undefined && { phone }),
        ...(message && { message }),
        ...(status && { status }),
        updatedAt: new Date()
      },
      include: {
        users: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true
          }
        }
      }
    });
    
    logger.info(`Contact updated: ${contactId}`);
    return updatedContact;
  }

  // Delete contact (Admin only)
  async deleteContact(contactId) {
    const contact = await prisma.contact.findUnique({
      where: { id: contactId }
    });
    
    if (!contact) {
      throw new Error('Contact not found');
    }
    
    await prisma.contact.delete({
      where: { id: contactId }
    });
    
    logger.info(`Contact deleted: ${contactId}`);
  }

  // Get contact statistics (Admin only)
  async getContactStats() {
    const [
      totalContacts,
      pendingContacts,
      inProgressContacts,
      resolvedContacts,
      closedContacts,
      contactsByMonth,
      contactsWithUsers
    ] = await Promise.all([
      prisma.contact.count(),
      prisma.contact.count({ where: { status: 'PENDING' } }),
      prisma.contact.count({ where: { status: 'IN_PROGRESS' } }),
      prisma.contact.count({ where: { status: 'RESOLVED' } }),
      prisma.contact.count({ where: { status: 'CLOSED' } }),
      prisma.contact.groupBy({
        by: ['createdAt'],
        _count: {
          id: true
        },
        where: {
          createdAt: {
            gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
          }
        }
      }),
      prisma.contact.count({
        where: {
          userId: {
            not: null
          }
        }
      })
    ]);
    
    return {
      totalContacts,
      statusBreakdown: {
        PENDING: pendingContacts,
        IN_PROGRESS: inProgressContacts,
        RESOLVED: resolvedContacts,
        CLOSED: closedContacts
      },
      contactsWithUsers,
      contactsWithoutUsers: totalContacts - contactsWithUsers,
      monthlyStats: contactsByMonth
    };
  }

  // Get user's contacts
  async getUserContacts(userId, { page, limit, status }) {
    const skip = (page - 1) * limit;
    
    const where = { userId };
    
    if (status) {
      where.status = status;
    }
    
    const [contacts, total] = await Promise.all([
      prisma.contact.findMany({
        where,
        skip,
        take: limit,
        orderBy: {
          createdAt: 'desc'
        }
      }),
      prisma.contact.count({ where })
    ]);
    
    return {
      contacts,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  }

  // Bulk update contact status (Admin only)
  async bulkUpdateContactStatus(contactIds, status) {
    const validStatuses = ['PENDING', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'];
    if (!validStatuses.includes(status)) {
      throw new Error('Invalid status');
    }
    
    const result = await prisma.contact.updateMany({
      where: {
        id: {
          in: contactIds
        }
      },
      data: {
        status,
        updatedAt: new Date()
      }
    });
    
    logger.info(`Bulk contact status update: ${contactIds.length} contacts -> ${status}`);
    return result;
  }
}

export default new ContactService();