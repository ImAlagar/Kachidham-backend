// services/authService.js
import twilio from 'twilio';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import prisma from '../config/database.js';
import { JWT_SECRET } from '../config/index.js';
import emailNotificationService from './emailNotificationService.js';
import logger from '../utils/logger.js';
import s3UploadService from './s3UploadService.js';

const twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

class AuthService {

async register(userData, files = []) {
  const { email, password, name, role, phone, businessType, ...wholesalerData } = userData;


  // Check if user exists
  const existingUser = await prisma.user.findFirst({
    where: {
      OR: [
        { email },
        ...(phone ? [{ phone }] : [])
      ]
    }
  });

  if (existingUser) {
    throw new Error('User with this email or phone already exists');
  }

  // Hash password
  const hashedPassword = await bcrypt.hash(password, 12);

  let user;
  let profileData;

  // Create user with transaction
  try {
    const result = await prisma.$transaction(async (tx) => {
      user = await tx.user.create({
        data: {
          email,
          password: hashedPassword,
          name,
          role: role || 'CUSTOMER',
          phone: role === 'WHOLESALER' ? phone : null,
          isApproved: role === 'WHOLESALER' ? false : true
        },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          phone: true,
          isApproved: true,
          createdAt: true
        }
      });

      // Create wholesaler profile if applicable
      if (role === 'WHOLESALER') {
        
        let shopPhotoUrls = [];

        // Upload shop photos to S3 if files are provided
        if (files && files.length > 0) {
          try {
            const uploadResults = await s3UploadService.uploadWholesalerShopPhotos(
              files, 
              user.id, 
              businessType
            );
            shopPhotoUrls = uploadResults.map(result => result.url);
            logger.info('Shop photos uploaded during registration', {
              userId: user.id,
              count: shopPhotoUrls.length
            });
          } catch (uploadError) {
            logger.error('Failed to upload shop photos during registration', {
              userId: user.id,
              error: uploadError.message
            });
            // Don't throw error - continue without photos
          }
        }

        // Prepare wholesaler profile data
        profileData = {
          userId: user.id,
          businessType: businessType,
          companyName: wholesalerData.companyName || null,
          gstNumber: wholesalerData.gstNumber || null,
          websiteUrl: wholesalerData.websiteUrl || null,
          instagramUrl: wholesalerData.instagramUrl || null,
          shopPhotos: shopPhotoUrls,
          city: wholesalerData.city || null,
          state: wholesalerData.state || null,
        };

        await tx.wholesalerProfile.create({
          data: profileData
        });
      }

      return user;
    });

    user = result;
  } catch (transactionError) {
    logger.error('Transaction failed during registration', {
      email,
      error: transactionError.message
    });
    throw new Error(`Registration failed: ${transactionError.message}`);
  }

  // Send admin notification AFTER transaction is committed
  if (role === 'WHOLESALER' && user) {
    try {
      await this.notifyAdminForApproval(user, profileData);
    } catch (notificationError) {
      logger.error('Admin notification failed after registration', {
        userId: user.id,
        error: notificationError.message
      });
      // Don't throw error - notification failure shouldn't break registration
    }
  }

  // Generate tokens
  let tokens = {};
  try {
    if (user.role !== 'WHOLESALER' || user.isApproved) {
      tokens = this.generateTokens(user);
    }
  } catch (tokenError) {
    logger.error('Token generation failed', {
      userId: user.id,
      error: tokenError.message
    });
    // Don't throw error - token generation failure shouldn't break registration
    // Return user without tokens
  }

  return { user, ...tokens };
}

  async login(credentials) {
    const { email, phone, password, otp } = credentials;

    // Validate input
    if (!email && !phone) {
      throw new Error('Email or phone number is required');
    }

    // Find user
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          ...(email ? [{ email }] : []),
          ...(phone ? [{ phone }] : [])
        ]
      },
      include: {
        wholesalerProfile: true
      }
    });

    if (!user) {
      throw new Error('Invalid credentials');
    }

    if (!user.isActive) {
      throw new Error('Account is deactivated');
    }

    // Handle different user types
    switch (user.role) {
      case 'WHOLESALER':
        return await this.handleWholesalerLogin(user, phone, otp);
      
      case 'CUSTOMER':
      case 'ADMIN':
        return await this.handlePasswordLogin(user, password);
      
      default:
        throw new Error('Invalid user role');
    }
  }

  async handleWholesalerLogin(user, phone, otp) {
    if (!user.isApproved) {
      throw new Error("Your account is pending admin approval.");
    }

    // If OTP not provided → send OTP
    if (!otp) {
      return this.sendOTP(phone);
    }

    // OTP provided → verify
    await this.verifyOTP(phone, otp);

    const tokens = this.generateTokens(user);
    const { password: _, otpSecret: __, otpAttempts: ___, ...userData } = user;

    return {
      user: userData,
      ...tokens
    };
  }


  async handlePasswordLogin(user, password) {
    if (!password) {
      throw new Error('Password is required');
    }

    // Verify password
    if (!(await bcrypt.compare(password, user.password))) {
      throw new Error('Invalid credentials');
    }

    // Generate tokens
    const tokens = this.generateTokens(user);
    const { password: _, ...userData } = user;

    return { 
      user: userData, 
      ...tokens 
    };
  }

  async sendOTP(phoneNumber) {
    const user = await prisma.user.findFirst({ where: { phone: phoneNumber } });

    // 🛑 OTP already active → don't send again
    if (user.otpExpiry && user.otpExpiry > new Date()) {
      throw new Error("OTP already sent. Please wait until it expires.");
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpSecret = await bcrypt.hash(otp, 10);
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 min validity

    await prisma.user.update({
      where: { id: user.id },
      data: {
        otpSecret,
        otpExpiry,
        otpAttempts: 0 // reset attempts on new OTP
      }
    });

    await twilioClient.messages.create({
      body: `Kachidham Fashions: Your OTP is ${otp}. Do not share. Valid for 10 minutes.`,
      to: phoneNumber,
      from: process.env.TWILIO_PHONE_NUMBER
    });

    return { requiresOTP: true, message: "OTP sent successfully" };
  }

  async verifyOTP(phoneNumber, otp) {
    const user = await prisma.user.findFirst({
      where: {
        phone: phoneNumber,
        otpExpiry: { gt: new Date() }
      }
    });

    if (!user || !user.otpSecret) {
      throw new Error("Invalid or expired OTP");
    }

    // ❌ Too many wrong attempts
    if (user.otpAttempts >= 5) {
      throw new Error("Too many failed attempts. Please request new OTP.");
    }

    const isValid = await bcrypt.compare(otp, user.otpSecret);

    if (!isValid) {
      await prisma.user.update({
        where: { id: user.id },
        data: { otpAttempts: { increment: 1 } }
      });
      throw new Error("Invalid OTP");
    }

    // OTP success → clear secret, expiry, attempts
    await prisma.user.update({
      where: { id: user.id },
      data: {
        isPhoneVerified: true,
        otpSecret: null,
        otpExpiry: null,
        otpAttempts: 0
      }
    });

    return { success: true, message: "OTP verified successfully" };
  }


  async handleRegularLogin(user, password) {
    // Verify password for customers/admins
    if (!(await bcrypt.compare(password, user.password))) {
      throw new Error('Invalid credentials');
    }

    // Generate tokens
    const tokens = this.generateTokens(user);
    const { password: _, ...userWithoutPassword } = user;

    return { 
      user: userWithoutPassword, 
      ...tokens 
    };
  }


  async notifyAdminForApproval(wholesalerUser, profileData = {}) {
    try {
      // Validate required fields
      if (!wholesalerUser || !wholesalerUser.email) {
        logger.error('Invalid wholesaler user data for admin notification', {
          wholesalerUser,
          profileData
        });
        throw new Error('Invalid wholesaler user data: email is required');
      }

      // Prepare wholesaler data with ALL required fields
      const wholesalerInfo = {
        businessName: profileData.companyName || wholesalerUser.name || 'Unknown Business',
        email: wholesalerUser.email,
        contactPerson: wholesalerUser.name || 'Unknown',
        phone: wholesalerUser.phone || 'Not provided',
        businessType: profileData.businessType || 'Unknown',
        city: profileData.city || 'Not specified',
        state: profileData.state || 'Not specified',
        registrationDate: wholesalerUser.createdAt || new Date(),
        // Add fields that the email template expects
        gstNumber: profileData.gstNumber || 'Not provided',
        address: `${profileData.city || ''} ${profileData.state || ''}`.trim() || 'Not provided',
        expectedVolume: 'To be determined', // Default value
        additionalInfo: `Business registered as ${profileData.businessType} in ${profileData.city}, ${profileData.state}`
      };

      // Find admin users
      const admins = await prisma.user.findMany({
        where: { role: 'ADMIN' },
        select: { email: true, name: true, id: true }
      });

      if (admins.length === 0) {
        logger.warn('No admin users found for notification');
        return;
      }

      // Send email notification to admins
      for (const admin of admins) {
        try {
          // FIX: Make sure we're passing the complete wholesalerInfo object
          await emailNotificationService.sendWholesalerApprovalNotification({
            adminName: admin.name,
            adminEmail: admin.email,
            // Pass the complete wholesalerInfo object that has all required fields
            ...wholesalerInfo
          });

          logger.info('Admin notification sent successfully', {
            adminEmail: admin.email,
            wholesalerEmail: wholesalerInfo.email,
            wholesalerId: wholesalerUser.id
          });
        } catch (notificationError) {
          logger.error('Failed to send notification to specific admin', {
            adminEmail: admin.email,
            wholesalerEmail: wholesalerInfo.email,
            error: notificationError.message,
            // Log the data that was sent for debugging
            sentData: {
              email: wholesalerInfo.email,
              businessName: wholesalerInfo.businessName,
              contactPerson: wholesalerInfo.contactPerson
            }
          });
          // Continue with other admins even if one fails
        }
      }

    } catch (error) {
      logger.error('Wholesaler approval notification failed', {
        wholesalerId: wholesalerUser?.id,
        wholesalerEmail: wholesalerUser?.email,
        error: error.message,
        timestamp: new Date().toISOString()
      });
      // Don't throw error - admin notification failure shouldn't break registration
    }
  }

  // Admin method to approve wholesalers
  async approveWholesaler(wholesalerId, adminId) {
    const user = await prisma.user.findUnique({
      where: { id: wholesalerId },
      include: { wholesalerProfile: true }
    });

    if (!user || user.role !== 'WHOLESALER') {
      throw new Error('Wholesaler not found');
    }

    if (user.isApproved) {
      throw new Error('Wholesaler is already approved');
    }

    const approvedUser = await prisma.user.update({
      where: { id: wholesalerId },
      data: {
        isApproved: true,
        approvedAt: new Date(),
        approvedBy: adminId
      },
      include: {
        wholesalerProfile: true
      }
    });

    // Send approval notification to wholesaler
    await this.sendApprovalNotification(approvedUser);

    return approvedUser;
  }

  async sendApprovalNotification(wholesalerUser) {
    try {
      if (!wholesalerUser || !wholesalerUser.email) {
        logger.error('Invalid wholesaler data for approval notification', {
          wholesalerUser
        });
        return;
      }

      // If you have email service implemented
      await emailNotificationService.sendWholesalerApprovalConfirmation({
        name: wholesalerUser.name || 'Valued Customer',
        email: wholesalerUser.email,
        phone: wholesalerUser.phone || 'Not provided',
        approvalDate: wholesalerUser.approvedAt || new Date()
      });

      logger.info('Wholesaler approval notification sent', {
        wholesalerId: wholesalerUser.id,
        wholesalerEmail: wholesalerUser.email
      });
    } catch (error) {
      logger.error('Failed to send approval notification', {
        wholesalerId: wholesalerUser?.id,
        error: error.message
      });
    }
  }

  generateTokens(user) {
    const payload = {
      userId: user.id,
      email: user.email,
      role: user.role,
      isApproved: user.isApproved
    };

    const accessToken = jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
    const refreshToken = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '30d' });

    return { accessToken, refreshToken };
  }

  // Get pending wholesalers for admin
  async getPendingWholesalers() {
    return await prisma.user.findMany({
      where: {
        role: 'WHOLESALER',
        isApproved: false
      },
      include: {
        wholesalerProfile: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
  }

  // Existing methods
  async logout(userId) {
    return true;
  }


  // Add to services/authService.js

async adminForgotPassword(email) {
  try {
    const admin = await prisma.user.findFirst({
      where: { 
        email,
        role: 'ADMIN'
      }
    });

    if (!admin) {
      logger.log(`Admin password reset requested for: ${email} (admin not found)`);
      // Return success even if admin not found for security
      return { 
        success: true, 
        message: 'If an admin account with that email exists, a reset link has been sent.' 
      };
    }

    // Generate secure reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenHash = crypto
      .createHash('sha256')
      .update(resetToken)
      .digest('hex');

    // Set expiry to 1 hour
    const resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000);

    // Save reset token to database
    await prisma.user.update({
      where: { id: admin.id },
      data: {
        resetToken: resetTokenHash,
        resetTokenExpiry
      }
    });

    // Create admin-specific reset URL
    const resetUrl = `${process.env.FRONTEND_URL}/admin/reset-password?token=${resetToken}&adminId=${admin.id}`;

    // Send admin password reset email
    await emailNotificationService.sendAdminPasswordReset({
      name: admin.name,
      email: admin.email
    }, resetUrl);

    logger.info('Admin password reset email sent', {
      adminId: admin.id,
      adminEmail: admin.email
    });

    return {
      success: true,
      message: 'If an admin account with that email exists, a reset link has been sent.'
    };

  } catch (error) {
    console.error('❌ Admin forgot password error:', error);
    logger.error('Admin forgot password failed', {
      email,
      error: error.message
    });
    throw new Error('Failed to process admin password reset request');
  }
}

async adminResetPassword(token, adminId, newPassword) {
  try {
    if (!token || !adminId || !newPassword) {
      throw new Error('Token, admin ID, and new password are required');
    }

    if (newPassword.length < 8) {
      throw new Error('Password must be at least 8 characters long');
    }

    // Validate password strength for admin
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/;
    if (!passwordRegex.test(newPassword)) {
      throw new Error('Password must contain at least one uppercase letter, one lowercase letter, and one number');
    }

    // Hash the provided token to compare with stored hash
    const resetTokenHash = crypto
      .createHash('sha256')
      .update(token)
      .digest('hex');

    // Find admin with valid reset token
    const admin = await prisma.user.findFirst({
      where: {
        id: adminId,
        role: 'ADMIN',
        resetToken: resetTokenHash,
        resetTokenExpiry: {
          gt: new Date()
        }
      }
    });

    if (!admin) {
      throw new Error('Invalid or expired admin reset token');
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    // Update password and clear reset token
    await prisma.user.update({
      where: { id: admin.id },
      data: {
        password: hashedPassword,
        resetToken: null,
        resetTokenExpiry: null,
        updatedAt: new Date()
      }
    });

    // Send admin password changed confirmation
    await emailNotificationService.sendAdminPasswordChangedConfirmation({
      name: admin.name,
      email: admin.email
    });

    logger.info('Admin password reset successful', {
      adminId: admin.id,
      adminEmail: admin.email
    });

    return {
      success: true,
      message: 'Admin password has been reset successfully. You can now login with your new password.'
    };

  } catch (error) {
    console.error('❌ Admin reset password error:', error);
    logger.error('Admin reset password failed', {
      adminId,
      error: error.message
    });
    throw error;
  }
}

async validateAdminResetToken(token, adminId) {
  try {
    if (!token || !adminId) {
      return { isValid: false, admin: null };
    }

    // Hash the provided token to compare with stored hash
    const resetTokenHash = crypto
      .createHash('sha256')
      .update(token)
      .digest('hex');

    // Find admin with valid reset token
    const admin = await prisma.user.findFirst({
      where: {
        id: adminId,
        role: 'ADMIN',
        resetToken: resetTokenHash,
        resetTokenExpiry: {
          gt: new Date()
        }
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        avatar: true
      }
    });

    return {
      isValid: !!admin,
      admin: admin || null
    };
  } catch (error) {
    console.error('Validate admin reset token error:', error);
    logger.error('Admin reset token validation failed', {
      adminId,
      error: error.message
    });
    return { isValid: false, admin: null };
  }
}

  async forgotPassword(email) {
    try {
      const user = await prisma.user.findUnique({
        where: { email }
      });

      if (!user) {
        logger.log(`Password reset requested for: ${email} (user not found)`);
        return { 
          success: true, 
          message: 'If an account with that email exists, a reset link has been sent.' 
        };
      }

      // Generate secure reset token
      const resetToken = crypto.randomBytes(32).toString('hex');
      const resetTokenHash = crypto
        .createHash('sha256')
        .update(resetToken)
        .digest('hex');

      // Set expiry to 1 hour
      const resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000);

      // Save reset token to database
      await prisma.user.update({
        where: { id: user.id },
        data: {
          resetToken: resetTokenHash,
          resetTokenExpiry
        }
      });

      // Create reset URL - FIXED: changed 'id' to 'userId'
      const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}&userId=${user.id}`;

      // Send password reset email
      await emailNotificationService.sendPasswordReset({
        name: user.name,
        email: user.email
      }, resetUrl);

      return {
        success: true,
        message: 'If an account with that email exists, a reset link has been sent.'
      };

    } catch (error) {
      console.error('❌ Forgot password error:', error);
      throw new Error('Failed to process password reset request');
    }
  }

  // Add to services/authService.js
async forgotPasswordWholesaler(phone) {
  try {
    const user = await prisma.user.findFirst({
      where: { 
        phone,
        role: 'WHOLESALER'
      }
    });

    if (!user) {
      logger.log(`Password reset requested for wholesaler: ${phone} (user not found)`);
      return { 
        success: true, 
        message: 'If an account with that phone number exists, a reset link has been sent.' 
      };
    }

    if (!user.isApproved) {
      throw new Error('Your account is pending admin approval. Please contact support.');
    }

    // Generate secure reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenHash = crypto
      .createHash('sha256')
      .update(resetToken)
      .digest('hex');

    // Set expiry to 1 hour
    const resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000);

    // Save reset token to database
    await prisma.user.update({
      where: { id: user.id },
      data: {
        resetToken: resetTokenHash,
        resetTokenExpiry
      }
    });

    // Create reset URL
    const resetUrl = `${process.env.FRONTEND_URL}/wholesaler/reset-password?token=${resetToken}&userId=${user.id}`;

    // Send SMS with reset link
    await twilioClient.messages.create({
      body: `Kachidham Fashions: Password reset link - ${resetUrl}. This link expires in 1 hour.`,
      to: phone,
      from: process.env.TWILIO_PHONE_NUMBER
    });

    return {
      success: true,
      message: 'If an account with that phone number exists, a reset link has been sent via SMS.'
    };

  } catch (error) {
    console.error('❌ Wholesaler forgot password error:', error);
    throw new Error('Failed to process password reset request');
  }
}

// Add this method to your AuthService class
async validateResetToken(token, userId) {
  try {
    if (!token || !userId) {
      return { isValid: false, user: null };
    }

    // Hash the provided token to compare with stored hash
    const resetTokenHash = crypto
      .createHash('sha256')
      .update(token)
      .digest('hex');

    // Find user with valid reset token
    const user = await prisma.user.findFirst({
      where: {
        id: userId,
        resetToken: resetTokenHash,
        resetTokenExpiry: {
          gt: new Date()
        }
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true
      }
    });

    return {
      isValid: !!user,
      user: user || null
    };
  } catch (error) {
    console.error('Validate reset token error:', error);
    return { isValid: false, user: null };
  }
}


  async resetPassword(token, userId, newPassword) {
    try {
      if (!token || !userId || !newPassword) {
        throw new Error('Token, user ID, and new password are required');
      }

      if (newPassword.length < 6) {
        throw new Error('Password must be at least 6 characters long');
      }

      // Hash the provided token to compare with stored hash
      const resetTokenHash = crypto
        .createHash('sha256')
        .update(token)
        .digest('hex');

      // Find user with valid reset token
      const user = await prisma.user.findFirst({
        where: {
          id: userId,
          resetToken: resetTokenHash,
          resetTokenExpiry: {
            gt: new Date()
          }
        }
      });

      if (!user) {
        throw new Error('Invalid or expired reset token');
      }

      // Hash new password
      const hashedPassword = await bcrypt.hash(newPassword, 12);

      // Update password and clear reset token
      await prisma.user.update({
        where: { id: user.id },
        data: {
          password: hashedPassword,
          resetToken: null,
          resetTokenExpiry: null,
          updatedAt: new Date()
        }
      });

      // Send password changed confirmation
      await emailNotificationService.sendPasswordChangedConfirmation({
        name: user.name,
        email: user.email
      });

      return {
        success: true,
        message: 'Password has been reset successfully. You can now login with your new password.'
      };

    } catch (error) {
      console.error('❌ Reset password error:', error);
      throw error;
    }
  }

  async getProfile(userId) {
    return await prisma.user.findUnique({
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
        addresses: true,
        wholesalerProfile: true
      }
    });
  }
}

export default new AuthService();