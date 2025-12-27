// services/userService.js
import prisma from '../config/database.js';
import s3UploadService from './s3UploadService.js';
import logger from '../utils/logger.js';

class UserService {
  // Get all users with pagination and filtering
  async getAllUsers({ page, limit, role, search }) {
    const skip = (page - 1) * limit;
    
    const where = {};
    
    if (role) {
      where.role = role;
    }
    
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } }
      ];
    }
    
    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: limit,
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          avatar: true,
          phone: true,
          isActive: true,
          isApproved: true,
          createdAt: true,
          addresses: true,
          wholesalerProfile: true
        },
        orderBy: {
          createdAt: 'desc'
        }
      }),
      prisma.user.count({ where })
    ]);
    
    return {
      users,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  }
  
  // Get user by ID
  async getUserById(userId) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        avatar: true,
        phone: true,
        isActive: true,
        isApproved: true,
        createdAt: true,
        updatedAt: true,
        addresses: {
          select: {
            id: true,
            street: true,
            city: true,
            state: true,
            country: true,
            zipCode: true,
            isDefault: true
          }
        },
        wholesalerProfile: true,
        orders: {
          select: {
            id: true,
            orderNumber: true,
            status: true,
            totalAmount: true,
            createdAt: true
          },
          orderBy: {
            createdAt: 'desc'
          },
          take: 5
        }
      }
    });
    
    if (!user) {
      throw new Error('User not found');
    }
    
    return user;
  }

  // In userService.js - createUser method
  async createUser(userData) {
    const { name, email, password, phone, role } = userData; // Make sure this matches

    // Check if email already exists
    const existingEmail = await prisma.user.findUnique({
      where: { email }
    });

    if (existingEmail) {
      throw new Error('Email already exists');
    }

    // Hash password
    const bcrypt = await import('bcryptjs');
    const hashedPassword = await bcrypt.default.hash(password, 12);

    // Create user with correct field names
    const newUser = await prisma.user.create({
      data: {
        name,        // This should match Prisma schema
        email,
        password: hashedPassword,
        phone,
        role,
        isActive: true,
        isApproved: role !== 'WHOLESALER'
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        phone: true,
        isActive: true,
        isApproved: true,
        createdAt: true
      }
    });

    return newUser;
  }
  
  // Update user profile
  async updateProfile(userId, updateData) {
    const { name, phone, ...otherData } = updateData;
    
    // Check if phone is being updated and if it's already taken
    if (phone) {
      const existingUser = await prisma.user.findFirst({
        where: {
          phone: phone,
          id: { not: userId }
        }
      });
      
      if (existingUser) {
        throw new Error('Phone number is already taken');
      }
    }
    
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        name,
        phone,
        ...otherData,
        updatedAt: new Date()
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        avatar: true,
        phone: true,
        isActive: true,
        isApproved: true,
        createdAt: true,
        updatedAt: true,
        addresses: true,
        wholesalerProfile: true
      }
    });
    
    logger.log(`User profile updated: ${userId}`);
    return updatedUser;
  }
  
  // Update wholesaler profile
  async updateWholesalerProfile(userId, updateData, files = []) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { wholesalerProfile: true }
    });
    
    if (!user || user.role !== 'WHOLESALER') {
      throw new Error('User is not a wholesaler');
    }
    
    let shopPhotoUrls = [];
    
    // Upload new shop photos if provided
    if (files && files.length > 0) {
      try {
        const uploadResults = await s3UploadService.uploadWholesalerShopPhotos(
          files, 
          userId, 
          user.wholesalerProfile.businessType
        );
        shopPhotoUrls = uploadResults.map(result => result.url);
        logger.log(`Uploaded ${shopPhotoUrls.length} new shop photos for wholesaler ${userId}`);
      } catch (uploadError) {
        logger.error('Failed to upload shop photos:', uploadError);
        throw new Error('Failed to upload shop photos');
      }
    }
    
    // Prepare update data
    const profileUpdateData = {
      ...updateData,
      updatedAt: new Date()
    };
    
    // If new photos were uploaded, add them to existing photos
    if (shopPhotoUrls.length > 0) {
      const existingPhotos = user.wholesalerProfile.shopPhotos || [];
      profileUpdateData.shopPhotos = {
        set: [...existingPhotos, ...shopPhotoUrls]
      };
    }
    
    const updatedProfile = await prisma.wholesalerProfile.update({
      where: { userId: userId },
      data: profileUpdateData,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
            phone: true,
            isActive: true,
            isApproved: true
          }
        }
      }
    });
    
    logger.log(`Wholesaler profile updated: ${userId}`);
    return updatedProfile;
  }
  
  // Delete user
  async deleteUser(userId) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { wholesalerProfile: true }
    });
    
    if (!user) {
      throw new Error('User not found');
    }
    
    // Use transaction to ensure all related data is deleted
    await prisma.$transaction(async (tx) => {
      // Delete wholesaler profile if exists
      if (user.wholesalerProfile) {
        await tx.wholesalerProfile.delete({
          where: { userId: userId }
        });
        
        // Delete wholesaler shop photos from S3
        try {
          const deleteResult = await s3UploadService.deleteAllWholesalerShopPhotos(userId);
        } catch (error) {
          console.error('Failed to delete wholesaler shop photos:', error);
          // Continue with user deletion even if photo deletion fails
        }
      }
      
      // Delete user addresses
      await tx.address.deleteMany({
        where: { userId: userId }
      });
      
      // Delete user orders and related data
      await this.deleteUserRelatedData(tx, userId);
      
      // Delete user avatar from S3 if exists
      if (user.avatar) {
        try {
          // Extract key from avatar URL
          const avatarUrl = user.avatar;
          const key = this.extractS3KeyFromUrl(avatarUrl);
          if (key) {
            await s3UploadService.deleteImage(key);
          }
        } catch (error) {
          console.error('Failed to delete user avatar:', error);
          // Continue with user deletion even if avatar deletion fails
        }
      }
      
      // Delete user
      await tx.user.delete({
        where: { id: userId }
      });
    });
    
  }

  // Helper method to delete user related data
  async deleteUserRelatedData(tx, userId) {
    try {
      // Delete user's ratings
      await tx.rating.deleteMany({
        where: { userId: userId }
      });

      // Delete user's contacts
      await tx.contact.deleteMany({
        where: { userId: userId }
      });

      // For orders, we need to handle them carefully due to relations
      const userOrders = await tx.order.findMany({
        where: { userId: userId },
        select: { id: true }
      });

      for (const order of userOrders) {
        // Delete order items first
        await tx.orderItem.deleteMany({
          where: { orderId: order.id }
        });

        // Delete tracking history
        await tx.trackingHistory.deleteMany({
          where: { orderId: order.id }
        });

        // Delete the order
        await tx.order.delete({
          where: { id: order.id }
        });
      }

    } catch (error) {
      console.error('Failed to delete user related data:', error);
      throw new Error('Failed to delete user related data');
    }
  }

  // Helper method to extract S3 key from URL
  extractS3KeyFromUrl(url) {
    try {
      if (!url) return null;
      
      // Remove the base URL part to get the key
      const urlObj = new URL(url);
      return urlObj.pathname.substring(1); // Remove leading slash
    } catch (error) {
      console.error('Failed to extract S3 key from URL:', error);
      return null;
    }
  }
  
  // Toggle user active status
  async toggleUserStatus(userId, isActive) {
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });
    
    if (!user) {
      throw new Error('User not found');
    }
    
    // Convert to boolean to handle string "true"/"false" from request body
    const activeStatus = isActive === true || isActive === 'true';
    
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        isActive: activeStatus,
        updatedAt: new Date()
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        isApproved: true,
        createdAt: true
      }
    });
    
    return updatedUser;
  }  
  
  // Change user role
async changeUserRole(userId, role) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { wholesalerProfile: true }
  });
  
  if (!user) {
    throw new Error('User not found');
  }
  
  // If changing from wholesaler to another role, delete wholesaler profile
  if (user.role === 'WHOLESALER' && role !== 'WHOLESALER') {
    await prisma.wholesalerProfile.delete({
      where: { userId: userId }
    });
    
    // Delete wholesaler shop photos from S3
    try {
      await s3UploadService.deleteAllWholesalerShopPhotos(userId);
    } catch (error) {
      logger.error('Failed to delete wholesaler shop photos:', error);
      // Continue with role change even if photo deletion fails
    }
  }
  
  // If changing to wholesaler from another role, set isApproved to false
  const updateData = {
    role: role,
    updatedAt: new Date()
  };
  
  if (role === 'WHOLESALER' && user.role !== 'WHOLESALER') {
    updateData.isApproved = false;
  }
  
  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: updateData,
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      isActive: true,
      isApproved: true,
      createdAt: true,
      wholesalerProfile: true
    }
  });
  
  // FIX: Use proper logger syntax with log level
  logger.info('User role changed', { 
    userId: userId, 
    oldRole: user.role, 
    newRole: role 
  });
  
  return updatedUser;
}
  
  // Update user avatar
  async updateAvatar(userId, file) {
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });
    
    if (!user) {
      throw new Error('User not found');
    }
    
    // Delete old avatar from S3 if exists
    if (user.avatar) {
      try {
        // Extract key from avatar URL
        const oldAvatarUrl = user.avatar;
        const oldKey = oldAvatarUrl.split('/').slice(3).join('/'); // Remove https://bucket.s3.region.amazonaws.com/
        await s3UploadService.deleteImage(oldKey);
      } catch (error) {
        logger.error('Failed to delete old avatar:', error);
        // Continue with new avatar upload
      }
    }
    
    // Upload new avatar using your existing function
    let avatarUrl = '';
    try {
      const uploadResult = await s3UploadService.uploadUserImage(file.buffer);
      avatarUrl = uploadResult.url;
    } catch (uploadError) {
      logger.error('Failed to upload avatar:', uploadError);
      throw new Error('Failed to upload avatar');
    }
    
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        avatar: avatarUrl,
        updatedAt: new Date()
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        avatar: true,
        phone: true,
        isActive: true,
        isApproved: true,
        createdAt: true
      }
    });
    
    logger.log(`User avatar updated: ${userId}`);
    return updatedUser;
  }
  
  // Remove user avatar
  async removeAvatar(userId) {
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });
    
    if (!user) {
      throw new Error('User not found');
    }
    
    if (!user.avatar) {
      throw new Error('User does not have an avatar');
    }
    
    // Delete avatar from S3
    try {
      // Extract key from avatar URL
      const avatarUrl = user.avatar;
      const key = avatarUrl.split('/').slice(3).join('/'); // Remove https://bucket.s3.region.amazonaws.com/
      await s3UploadService.deleteImage(key);
    } catch (error) {
      logger.error('Failed to delete avatar from S3:', error);
      // Continue with database update
    }
    
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        avatar: null,
        updatedAt: new Date()
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        avatar: true,
        phone: true,
        isActive: true,
        isApproved: true,
        createdAt: true
      }
    });
    
    logger.log(`User avatar removed: ${userId}`);
    return updatedUser;
  }
  
  // Delete specific shop photo from wholesaler profile
  async deleteShopPhoto(userId, photoUrl) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { wholesalerProfile: true }
    });
    
    if (!user || user.role !== 'WHOLESALER') {
      throw new Error('User is not a wholesaler');
    }
    
    if (!user.wholesalerProfile) {
      throw new Error('Wholesaler profile not found');
    }
    
    // Remove photo from S3
    try {
      const key = photoUrl.split('/').slice(3).join('/'); // Remove https://bucket.s3.region.amazonaws.com/
      await s3UploadService.deleteImage(key);
    } catch (error) {
      logger.error('Failed to delete shop photo from S3:', error);
      throw new Error('Failed to delete shop photo');
    }
    
    // Remove photo URL from database array
    const updatedPhotos = user.wholesalerProfile.shopPhotos.filter(photo => photo !== photoUrl);
    
    const updatedProfile = await prisma.wholesalerProfile.update({
      where: { userId: userId },
      data: {
        shopPhotos: {
          set: updatedPhotos
        },
        updatedAt: new Date()
      }
    });
    
    logger.log(`Shop photo deleted for wholesaler: ${userId}`);
    return updatedProfile;
  }
  
  // Get user statistics
  async getUserStats() {
    const [
      totalUsers,
      totalCustomers,
      totalWholesalers,
      totalAdmins,
      activeUsers,
      pendingWholesalers,
      newUsersThisMonth
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { role: 'CUSTOMER' } }),
      prisma.user.count({ where: { role: 'WHOLESALER' } }),
      prisma.user.count({ where: { role: 'ADMIN' } }),
      prisma.user.count({ where: { isActive: true } }),
      prisma.user.count({ 
        where: { 
          role: 'WHOLESALER',
          isApproved: false 
        } 
      }),
      prisma.user.count({
        where: {
          createdAt: {
            gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
          }
        }
      })
    ]);
    
    return {
      totalUsers,
      totalCustomers,
      totalWholesalers,
      totalAdmins,
      activeUsers,
      inactiveUsers: totalUsers - activeUsers,
      pendingWholesalers,
      newUsersThisMonth,
      userDistribution: {
        customers: totalCustomers,
        wholesalers: totalWholesalers,
        admins: totalAdmins
      }
    };
  }
}

export default new UserService();