// controllers/authController.js
import { authService } from '../services/index.js';
import { asyncHandler } from '../utils/helpers.js';
import prisma from '../config/database.js';
import logger from '../utils/logger.js';


export const register = asyncHandler(async (req, res) => {
  // Parse JSON fields from form-data
  let { role, phone, businessType, ...userData } = req.body;
  
  // Handle userData if it's a string (from form-data)
  if (userData && typeof userData === 'string') {
    try {
      userData = JSON.parse(userData);
    } catch (parseError) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user data format'
      });
    }
  }

  // If businessType is sent as string in form-data, parse it
  if (businessType && typeof businessType === 'string') {
    businessType = businessType.toUpperCase();
  }


  // Validate required fields
  if (!userData || !userData.email || !userData.password || !userData.name) {
    return res.status(400).json({
      success: false,
      message: 'Name, email, and password are required'
    });
  }

  // Validate wholesaler data
  if (role === 'WHOLESALER') {
    if (!phone) {
      return res.status(400).json({
        success: false,
        message: 'Phone number is required for wholesaler registration'
      });
    }

    if (!businessType) {
      return res.status(400).json({
        success: false,
        message: 'Business type is required for wholesaler registration'
      });
    }

    // Validate business type values
    const validBusinessTypes = ['CLOTHING_STORE', 'GST_BUSINESS', 'WEBSITE', 'INSTAGRAM_PAGE', 'STARTUP'];
    if (!validBusinessTypes.includes(businessType)) {
      return res.status(400).json({
        success: false,
        message: `Invalid business type. Must be one of: ${validBusinessTypes.join(', ')}`
      });
    }

    // Validate business type specific fields
    if (businessType === 'CLOTHING_STORE' || businessType === 'STARTUP') {
      if (!userData.companyName) {
        return res.status(400).json({
          success: false,
          message: 'Company/Shop name is required for this business type'
        });
      }
    }

    if (businessType === 'GST_BUSINESS') {
      if (!userData.gstNumber) {
        return res.status(400).json({
          success: false,
          message: 'GST number is required for GST business'
        });
      }
    }

    if (businessType === 'WEBSITE') {
      if (!userData.websiteUrl) {
        return res.status(400).json({
          success: false,
          message: 'Website URL is required for website business'
        });
      }
    }

    if (businessType === 'INSTAGRAM_PAGE') {
      if (!userData.instagramUrl) {
        return res.status(400).json({
          success: false,
          message: 'Instagram URL is required for Instagram business'
        });
      }
    }

    // Validate shop photos (max 5 photos)
    const files = req.files || [];
    if (files.length > 5) {
      return res.status(400).json({
        success: false,
        message: 'Maximum 5 shop photos allowed'
      });
    }

    // Validate file types
    const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    const invalidFiles = files.filter(file => !allowedMimeTypes.includes(file.mimetype));
    
    if (invalidFiles.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Only JPEG, JPG, PNG, and WebP images are allowed'
      });
    }
  }

  try {
    const result = await authService.register({
      ...userData,
      role,
      phone,
      businessType,
    }, req.files || []);

    const message = role === 'WHOLESALER' 
      ? 'Wholesaler registered successfully. Your account is pending admin approval. You will be notified once approved.' 
      : 'User registered successfully';

    res.status(201).json({
      success: true,
      message,
      data: result
    });
  } catch (error) {
    logger.error('Registration failed', {
      email: userData.email,
      role,
      error: error.message
    });

    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

// Keep all other controller methods the same as before
export const login = asyncHandler(async (req, res) => {
  const result = await authService.login(req.body);
  
  // If OTP required, return that response
  if (result.requiresOTP) {
    return res.status(200).json({
      success: true,
      requiresOTP: true,
      message: result.message
    });
  }
  
  // If login successful, return user data and tokens
  res.status(200).json({
    success: true,
    message: 'Login successful',
    data: result
  });
});

export const verifyOTP = asyncHandler(async (req, res) => {
  const { phone, otp } = req.body;

  if (!phone || !otp) {
    return res.status(400).json({
      success: false,
      message: 'Phone number and OTP are required'
    });
  }

  // Verify OTP
  const result = await authService.verifyOTP(phone, otp);
  
  if (result.success) {
    // After OTP verification, find user and generate tokens
    const user = await prisma.user.findFirst({
      where: { 
        phone,
        role: 'WHOLESALER',
        isApproved: true
      },
      include: {
        wholesalerProfile: true
      }
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'User not found or not approved'
      });
    }

    const tokens = authService.generateTokens(user);
    const { password: _, otpSecret: __, ...userData } = user;
    
    return res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        user: userData,
        ...tokens
      }
    });
  }
});

export const resendOTP = asyncHandler(async (req, res) => {
  const { phone } = req.body;

  if (!phone) {
    return res.status(400).json({
      success: false,
      message: 'Phone number is required'
    });
  }

  const result = await authService.sendOTP(phone);
  
  res.status(200).json({
    success: true,
    message: result.message
  });
});

// Admin controllers
export const approveWholesaler = asyncHandler(async (req, res) => {
  const { wholesalerId } = req.params;
  
  const approvedUser = await authService.approveWholesaler(wholesalerId, req.user.id);
  
  res.status(200).json({
    success: true,
    message: 'Wholesaler approved successfully',
    data: approvedUser
  });
});

export const getPendingWholesalers = asyncHandler(async (req, res) => {
  const pendingWholesalers = await authService.getPendingWholesalers();
  
  res.status(200).json({
    success: true,
    data: pendingWholesalers
  });
});

export const logout = asyncHandler(async (req, res) => {
  await authService.logout(req.user.id);
  res.status(200).json({
    success: true,
    message: 'Logout successful'
  });
});

// Add to controllers/authController.js

export const adminForgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({
      success: false,
      message: 'Admin email is required'
    });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({
      success: false,
      message: 'Please provide a valid admin email address'
    });
  }

  const result = await authService.adminForgotPassword(email);
  
  res.status(200).json({
    success: result.success,
    message: result.message
  });
});

export const adminResetPassword = asyncHandler(async (req, res) => {
  const { token, adminId, password, confirmPassword } = req.body;

  if (!token || !adminId || !password || !confirmPassword) {
    return res.status(400).json({
      success: false,
      message: 'Token, admin ID, password, and confirm password are required'
    });
  }

  if (password !== confirmPassword) {
    return res.status(400).json({
      success: false,
      message: 'Passwords do not match'
    });
  }

  if (password.length < 8) {
    return res.status(400).json({
      success: false,
      message: 'Password must be at least 8 characters long'
    });
  }

  // Validate password strength
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/;
  if (!passwordRegex.test(password)) {
    return res.status(400).json({
      success: false,
      message: 'Password must contain at least one uppercase letter, one lowercase letter, and one number'
    });
  }

  const result = await authService.adminResetPassword(token, adminId, password);
  
  res.status(200).json({
    success: result.success,
    message: result.message
  });
});

export const validateAdminResetToken = asyncHandler(async (req, res) => {
  const { token, adminId } = req.query;

  if (!token || !adminId) {
    return res.status(400).json({
      success: false,
      message: 'Token and admin ID are required'
    });
  }

  const result = await authService.validateAdminResetToken(token, adminId);
  
  if (!result.isValid) {
    return res.status(400).json({
      success: false,
      message: 'Invalid or expired admin reset token'
    });
  }

  res.status(200).json({
    success: true,
    message: 'Valid admin reset token',
    admin: result.admin
  });
});

export const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({
      success: false,
      message: 'Email is required'
    });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({
      success: false,
      message: 'Please provide a valid email address'
    });
  }

  const result = await authService.forgotPassword(email);
  
  res.status(200).json({
    success: result.success,
    message: result.message
  });
});

// Add to controllers/authController.js
export const forgotPasswordWholesaler = asyncHandler(async (req, res) => {
  const { phone } = req.body;

  if (!phone) {
    return res.status(400).json({
      success: false,
      message: 'Phone number is required'
    });
  }

  const phoneRegex = /^[0-9]{10}$/;
  if (!phoneRegex.test(phone.replace(/\D/g, ''))) {
    return res.status(400).json({
      success: false,
      message: 'Please provide a valid 10-digit phone number'
    });
  }

  const result = await authService.forgotPasswordWholesaler(phone.replace(/\D/g, ''));
  
  res.status(200).json({
    success: result.success,
    message: result.message
  });
});
export const resetPassword = asyncHandler(async (req, res) => {
  const { token, userId, password } = req.body;

  if (!token || !userId || !password) {
    return res.status(400).json({
      success: false,
      message: 'Token, user ID, and password are required'
    });
  }

  if (password.length < 6) {
    return res.status(400).json({
      success: false,
      message: 'Password must be at least 6 characters long'
    });
  }

  const result = await authService.resetPassword(token, userId, password);
  
  res.status(200).json({
    success: result.success,
    message: result.message
  });
});

export const getProfile = asyncHandler(async (req, res) => {
  const profile = await authService.getProfile(req.user.id);
  res.status(200).json({
    success: true,
    data: profile
  });
});

// Add this to your authController.js
export const validateResetToken = asyncHandler(async (req, res) => {
  const { token, userId } = req.query;

  if (!token || !userId) {
    return res.status(400).json({
      success: false,
      message: 'Token and user ID are required'
    });
  }

  const result = await authService.validateResetToken(token, userId);
  
  if (!result.isValid) {
    return res.status(400).json({
      success: false,
      message: 'Invalid or expired reset token'
    });
  }

  res.status(200).json({
    success: true,
    message: 'Valid reset token',
    user: result.user
  });
});