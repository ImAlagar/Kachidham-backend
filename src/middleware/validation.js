import { body, validationResult } from 'express-validator';
import { findInvalidChars } from '../utils/findInvalidChars.js';


export const validate = (type) => {
  return (req, res, next) => {
    // Basic validation - you can extend this with Joi or similar
    try {
      switch (type) {
        case 'register':
          if (!req.body.email || !req.body.password || !req.body.name) {
            return res.status(400).json({
              success: false,
              message: 'Email, password, and name are required'
            });
          }
          break;

        case 'login':
          if (!req.body.email || !req.body.password) {
            return res.status(400).json({
              success: false,
              message: 'Email and password are required'
            });
          }
          break;

        case 'product':
          if (!req.body.name || !req.body.normalPrice || !req.body.categoryId) {
            return res.status(400).json({
              success: false,
              message: 'Name, price, and category are required'
            });
          }
          break;

        default:
          break;
      }
      next();
    } catch (error) {
      next(error);
    }
  };
};


// Contact form validation
export const validateContact = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Name is required')
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters'),
  
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid email is required'),
  
  body('phone')
    .optional()
    .isMobilePhone()
    .withMessage('Valid phone number is required'),
  
  body('message')
    .trim()
    .notEmpty()
    .withMessage('Message is required')
    .isLength({ min: 10, max: 2000 })
    .withMessage('Message must be between 10 and 2000 characters'),
  
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }
    next();
  }
];


// Rating validation
export const validateRating = [
  body('productId')
    .notEmpty()
    .withMessage('Product ID is required'),
  
  body('rating')
    .isInt({ min: 1, max: 5 })
    .withMessage('Rating must be an integer between 1 and 5'),
  
  body('title')
    .optional()
    .isLength({ max: 200 })
    .withMessage('Title must be less than 200 characters'),
  
  body('review')
    .optional()
    .isLength({ max: 1000 })
    .withMessage('Review must be less than 1000 characters'),
  
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }
    next();
  }
];


// Order validation
export const validateOrder = [
  body('orderData.name')
    .notEmpty()
    .withMessage('Name is required')
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters'),
  
  body('orderData.email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid email is required'),
  
  body('orderData.phone')
    .isMobilePhone()
    .withMessage('Valid phone number is required'),
  
  body('orderData.address')
    .notEmpty()
    .withMessage('Address is required')
    .isLength({ min: 10, max: 500 })
    .withMessage('Address must be between 10 and 500 characters'),
  
  body('orderData.city')
    .notEmpty()
    .withMessage('City is required'),
  
  body('orderData.state')
    .notEmpty()
    .withMessage('State is required'),
  
  body('orderData.pincode')
    .isPostalCode('IN')
    .withMessage('Valid pincode is required'),
  
  body('orderData.orderItems')
    .isArray({ min: 1 })
    .withMessage('At least one order item is required'),
  
  body('orderData.orderItems.*.productId')
    .notEmpty()
    .withMessage('Product ID is required'),
  
  body('orderData.orderItems.*.quantity')
    .isInt({ min: 1 })
    .withMessage('Quantity must be at least 1'),
  
  body('razorpay_order_id')
    .notEmpty()
    .withMessage('Razorpay order ID is required'),
  
  body('razorpay_payment_id')
    .notEmpty()
    .withMessage('Razorpay payment ID is required'),
  
  body('razorpay_signature')
    .notEmpty()
    .withMessage('Razorpay signature is required'),
  
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }
    next();
  }
];


export const validateProduct = [
  // Check if required fields exist
  body('name')
    .notEmpty()
    .withMessage('Product name is required')
    .isLength({ min: 2, max: 200 })
    .withMessage('Product name must be between 2 and 200 characters'),

  body('productCode')
    .notEmpty()
    .withMessage('Product code is required')
    .isLength({ min: 2, max: 50 })
    .withMessage('Product code must be between 2 and 50 characters')
    .matches(/^[A-Za-z0-9\-_]+$/)
    .withMessage('Product code can only contain letters, numbers, hyphens, and underscores'),

  body('normalPrice')
    .notEmpty()
    .withMessage('Normal price is required')
    .isFloat({ min: 0 })
    .withMessage('Normal price must be a valid number greater than or equal to 0'),


body('categoryId')
    .optional({ nullable: true })
    .isLength({ min: 1, max: 50 }) // CUIDs are typically 25 characters
    .withMessage('Category ID must be a valid ID'),

body('subcategoryId')
    .optional({ nullable: true })
    .isLength({ min: 1, max: 50 })
    .withMessage('Subcategory ID must be a valid ID'),  

  body('variants')
    .custom((value, { req }) => {
      if (!value) {
        throw new Error('Variants field is required');
      }
      
      // Value should already be parsed from FormData
      if (!Array.isArray(value)) {
        throw new Error('Variants must be an array');
      }

      if (value.length === 0) {
        throw new Error('At least one variant is required');
      }

      // Validate each variant
      value.forEach((variant, index) => {
        if (!variant.color || typeof variant.color !== 'string' || variant.color.trim() === '') {
          throw new Error(`Variant ${index}: Color is required and must be a non-empty string`);
        }

        if (!Array.isArray(variant.sizes)) {
          throw new Error(`Variant ${index}: Sizes must be an array`);
        }

        if (variant.sizes.length === 0) {
          throw new Error(`Variant ${index}: At least one size is required`);
        }

        // Validate each size
        variant.sizes.forEach((sizeObj, sizeIndex) => {
          if (!sizeObj.size || typeof sizeObj.size !== 'string' || sizeObj.size.trim() === '') {
            throw new Error(`Variant ${index}, Size ${sizeIndex}: Size value is required`);
          }

          if (sizeObj.stock !== undefined && sizeObj.stock !== null) {
            const stock = parseInt(sizeObj.stock);
            if (isNaN(stock) || stock < 0) {
              throw new Error(`Variant ${index}, Size ${sizeIndex}: Stock must be a non-negative integer`);
            }
          }
        });
      });

      return true;
    }),

  body('productDetails')
    .optional()
    .custom((value) => {
      if (!value) return true;
      
      if (!Array.isArray(value)) {
        throw new Error('Product details must be an array');
      }

      value.forEach((detail, index) => {
        if (!detail.title || typeof detail.title !== 'string' || detail.title.trim() === '') {
          throw new Error(`Product detail ${index}: Title is required`);
        }

        if (!detail.description || typeof detail.description !== 'string' || detail.description.trim() === '') {
          throw new Error(`Product detail ${index}: Description is required`);
        }
      });

      return true;
    }),

  // Validation result middleware
(req, res, next) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    // Extract messages properly
    const errorMessages = errors.array().map(error => {
      return error.msg || error.message || 'Validation error';
    });
    
    return res.status(400).json({
      success: false,
      message: errorMessages[0], // First error message
      errors: errorMessages // All error messages
    });
  }

  next();
}
];


// Product update validation (similar but with optional fields)
export const validateProductUpdate = [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 200 })
    .withMessage('Product name must be between 2 and 200 characters'),

  body('productCode')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Product code must be between 2 and 50 characters')
    .matches(/^[A-Za-z0-9\-_]+$/)
    .withMessage('Product code can only contain letters, numbers, hyphens, and underscores'),

  body('normalPrice')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Normal price must be a valid number greater than or equal to 0'),

  body('offerPrice')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Offer price must be a valid number greater than or equal to 0'),

  body('wholesalePrice')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Wholesale price must be a valid number greater than or equal to 0'),

  body('description')
    .optional()
    .isLength({ max: 2000 })
    .withMessage('Description must be less than 2000 characters'),

  body('variants')
    .optional()
    .custom((value) => {
      // Similar validation as create but optional
      let variants = value;
      if (typeof value === 'string') {
        try {
          variants = JSON.parse(value);
        } catch (error) {
          throw new Error('Invalid JSON format in variants field');
        }
      }

      if (!Array.isArray(variants)) {
        throw new Error('Variants must be an array');
      }

      // Rest of variant validation similar to create...
      return true;
    }),

// Validation result middleware
(req, res, next) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    // Extract messages properly
    const errorMessages = errors.array().map(error => {
      return error.msg || error.message || 'Validation error';
    });
    
    return res.status(400).json({
      success: false,
      message: errorMessages[0], // First error message
      errors: errorMessages // All error messages
    });
  }

  next();
}
];


// Category validation
export const validateCategory = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Category name is required')
    .isLength({ min: 2, max: 100 })
    .withMessage('Category name must be between 2 and 100 characters')
    .custom((value) => {
      const invalidChars = findInvalidChars(value);

      if (invalidChars.length > 0) {
        throw new Error(
          `Invalid characters used: ${invalidChars.join(' ')}`
        );
      }

      return true;
    }),

  body('description')
    .optional() // Make description optional
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description cannot exceed 500 characters'),

  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive must be a boolean value'),

  // Validation result middleware
  (req, res, next) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: errors.array()[0].msg // 🔥 EXACT error
      });
    }

    next();
  }
];

// Category update validation
export const validateCategoryUpdate = [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Category name must be between 2 and 100 characters')
    .custom((value) => {
      const invalidChars = findInvalidChars(value);

      if (invalidChars.length > 0) {
        throw new Error(
          `Invalid characters used: ${invalidChars.join(' ')}`
        );
      }

      return true;
    }),

  body('description')
    .optional() // Make description optional
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description cannot exceed 500 characters'),

  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive must be a boolean value'),

  (req, res, next) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: errors.array()[0].msg // 🔥 EXACT error
      });
    }

    next();
  }
];

// Subcategory validation

export const validateSubcategory = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Subcategory name is required')
    .isLength({ min: 2, max: 100 })
    .withMessage('Subcategory name must be between 2 and 100 characters')
    .custom((value) => {
      const invalidChars = findInvalidChars(value);

      if (invalidChars.length > 0) {
        throw new Error(
          `Invalid characters used: ${invalidChars.join(' ')}`
        );
      }

      return true;
    }),


  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description cannot exceed 500 characters'),

  // 🔹 categoryId OPTIONAL
  body('categoryId')
    .optional()
    .trim()
    .isLength({ min: 1 })
    .withMessage('Category ID cannot be empty'),

  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive must be a boolean value'),

  // Validation result middleware
  (req, res, next) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: errors.array()[0].msg // 🔥 EXACT error
      });
    }

    next();
  }
];



// Subcategory update validation
export const validateSubcategoryUpdate = [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Subcategory name must be between 2 and 100 characters')
    .custom((value) => {
      const invalidChars = findInvalidChars(value);

      if (invalidChars.length > 0) {
        throw new Error(
          `Invalid characters used: ${invalidChars.join(' ')}`
        );
      }

      return true;
    }),


  body('description')
    .optional()
    .trim()
    .isLength({ min: 10, max: 500 })
    .withMessage('Description must be between 10 and 500 characters'),

  body('category')
    .optional()
    .isMongoId()
    .withMessage('Invalid category ID format'),

  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive must be a boolean value'),

  (req, res, next) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: errors.array()[0].msg // 🔥 EXACT error
      });
    }

    next();
  }
];

// Status toggle validation (for both category and subcategory)
export const validateStatusToggle = [
  body('isActive')
    .notEmpty()
    .withMessage('isActive field is required')
    .isBoolean()
    .withMessage('isActive must be a boolean value'),

  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Status toggle validation failed',
        errors: errors.array()
      });
    }
    next();
  }
];

export const validateCreateUser = [
  // Name validation - make it simpler
  body('name')
    .trim()
    .notEmpty().withMessage('Full name is required')
    .isLength({ min: 2, max: 100 }).withMessage('Name must be between 2 and 100 characters'),

  // Email validation
  body('email')
    .trim()
    .notEmpty().withMessage('Email address is required')
    .isEmail().withMessage('Please provide a valid email address'),

  // Password validation - make it simpler
  body('password')
    .notEmpty().withMessage('Password is required')
    .isLength({ min: 6 }).withMessage('Password must be at least 6 characters long'),

  // Role validation
  body('role')
    .notEmpty().withMessage('User role is required')
    .isIn(['ADMIN', 'CUSTOMER', 'WHOLESALER']).withMessage('Role must be one of: ADMIN, CUSTOMER, WHOLESALER'),

  // Phone validation (optional)
  body('phone')
    .optional()
    .trim()
    .isLength({ min: 10, max: 15 }).withMessage('Phone number must be between 10 and 15 characters'),

  (req, res, next) => {
    const errors = validationResult(req);
    
    if (!errors.isEmpty()) {
      const formattedErrors = errors.array().map(error => ({
        field: error.path,
        message: error.msg,
        value: error.value
      }));

      return res.status(400).json({
        success: false,
        message: 'User creation validation failed',
        errors: formattedErrors
      });
    }

    next();
  }
];

// Update user validation (similar but with optional fields)
export const validateUpdateUser = [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters')
    .matches(/^[a-zA-Z\s\u00C0-\u024F\u1E00-\u1EFF]+$/)
    .withMessage('Name can only contain letters and spaces'),

  body('email')
    .optional()
    .trim()
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address')
    .isLength({ max: 255 })
    .withMessage('Email must be less than 255 characters'),

  body('phone')
    .optional()
    .trim()
    .isMobilePhone('any')
    .withMessage('Please provide a valid phone number')
    .isLength({ min: 10, max: 15 })
    .withMessage('Phone number must be between 10 and 15 characters'),

  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive must be a boolean value'),

  body('isApproved')
    .optional()
    .isBoolean()
    .withMessage('isApproved must be a boolean value'),

  // Business type validation for update (only for wholesalers)
  body('businessType')
    .optional()
    .isIn([
      'CLOTHING_STORE',
      'GST_BUSINESS',
      'WEBSITE', 
      'INSTAGRAM_PAGE',
      'STARTUP'
    ])
    .withMessage('Business type must be one of: CLOTHING_STORE, GST_BUSINESS, WEBSITE, INSTAGRAM_PAGE, STARTUP'),

  (req, res, next) => {
    const errors = validationResult(req);
    
    if (!errors.isEmpty()) {
      const formattedErrors = errors.array().map(error => ({
        field: error.path,
        message: error.msg,
        value: error.value
      }));

      return res.status(400).json({
        success: false,
        message: 'User update validation failed',
        errors: formattedErrors
      });
    }

    next();
  }
];

// Password validation (for password change)
export const validatePassword = [
  body('currentPassword')
    .notEmpty()
    .withMessage('Current password is required'),

  body('newPassword')
    .notEmpty()
    .withMessage('New password is required')
    .isLength({ min: 6 })
    .withMessage('New password must be at least 6 characters long')
    .isLength({ max: 128 })
    .withMessage('New password must be less than 128 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('New password must contain at least one lowercase letter, one uppercase letter, and one number')
    .matches(/^[a-zA-Z0-9!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]*$/)
    .withMessage('New password contains invalid characters')
    .custom((value, { req }) => {
      if (value === req.body.currentPassword) {
        throw new Error('New password must be different from current password');
      }
      return true;
    }),

  body('confirmPassword')
    .notEmpty()
    .withMessage('Confirm password is required')
    .custom((value, { req }) => {
      if (value !== req.body.newPassword) {
        throw new Error('Passwords do not match');
      }
      return true;
    }),

  (req, res, next) => {
    const errors = validationResult(req);
    
    if (!errors.isEmpty()) {
      const formattedErrors = errors.array().map(error => ({
        field: error.path,
        message: error.msg,
        value: error.value
      }));

      return res.status(400).json({
        success: false,
        message: 'Password validation failed',
        errors: formattedErrors
      });
    }

    next();
  }
];

// Parse form data middleware
export const parseFormData = (req, res, next) => {
  if (req.body && typeof req.body === 'object') {
    // Parse boolean fields
    if (req.body.isActive !== undefined) {
      req.body.isActive = req.body.isActive === 'true' || req.body.isActive === true;
    }
    
    // Parse number fields
    if (req.body.order !== undefined) {
      req.body.order = parseInt(req.body.order) || 0;
    }
    
    // Parse layout with default
    if (req.body.layout) {
      req.body.layout = req.body.layout.toString().trim();
    } else {
      req.body.layout = 'left';
    }
    
    // Trim string fields and handle empty strings
    const stringFields = ['title', 'subtitle', 'description', 'smallText', 'offerText', 'buttonText', 'buttonLink'];
    stringFields.forEach(field => {
      if (req.body[field] !== undefined) {
        const value = req.body[field].toString().trim();
        req.body[field] = value === '' ? null : value;
      }
    });
    
    // Handle date fields
    if (req.body.startDate === '') req.body.startDate = null;
    if (req.body.endDate === '') req.body.endDate = null;
  }
  
  next();
};

// Slider validation
export const validateSlider = [
  
  body('title')
    .trim()
    .notEmpty()
    .withMessage('Slider title is required')
    .isLength({ min: 2, max: 300 })
    .withMessage('Title must be between 2 and 200 characters'),

  body('subtitle')
    .optional()
    .trim()
    .isLength({ max: 300 })
    .withMessage('Subtitle must be less than 200 characters'),

  body('description')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Description must be less than 1000 characters'),

  body('smallText')
    .optional()
    .trim()
    .isLength({ max: 300 })
    .withMessage('Small text must be less than 100 characters'),

  body('offerText')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Offer text must be less than 100 characters'),

  body('buttonText')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Button text must be less than 50 characters'),

  body('buttonLink')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Button link must be less than 500 characters')
    .custom((value) => {
      if (value && !value.startsWith('/') && !value.startsWith('http')) {
        throw new Error('Button link must start with "/" for internal links or "http" for external links');
      }
      return true;
    }),

  body('layout')
    .optional()
    .isIn(['left', 'right', 'center'])
    .withMessage('Layout must be one of: left, right, center'),

  body('order')
    .optional()
    .isInt({ min: 0, max: 1000 })
    .withMessage('Order must be an integer between 0 and 1000'),

  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive must be a boolean value'),

  body('startDate')
    .optional()
    .isISO8601()
    .withMessage('Start date must be a valid ISO 8601 date')
    .custom((value, { req }) => {
      if (value && req.body.endDate) {
        const startDate = new Date(value);
        const endDate = new Date(req.body.endDate);
        if (startDate >= endDate) {
          throw new Error('Start date must be before end date');
        }
      }
      return true;
    }),

  body('endDate')
    .optional()
    .isISO8601()
    .withMessage('End date must be a valid ISO 8601 date')
    .custom((value, { req }) => {
      if (value && req.body.startDate) {
        const startDate = new Date(req.body.startDate);
        const endDate = new Date(value);
        if (endDate <= startDate) {
          throw new Error('End date must be after start date');
        }
      }
      return true;
    }),

  // Validation result middleware
  (req, res, next) => {
    const errors = validationResult(req);
    
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Slider validation failed',
        errors: errors.array()
      });
    }

    next();
  }
];

// Slider update validation (similar but with optional fields)
export const validateSliderUpdate = [
  body('title')
    .optional()
    .trim()
    .isLength({ min: 2, max: 200 })
    .withMessage('Title must be between 2 and 200 characters'),

  body('subtitle')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Subtitle must be less than 200 characters'),

  body('description')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Description must be less than 1000 characters'),

  body('smallText')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Small text must be less than 100 characters'),

  body('offerText')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Offer text must be less than 100 characters'),

  body('buttonText')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Button text must be less than 50 characters'),

  body('buttonLink')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Button link must be less than 500 characters')
    .custom((value) => {
      if (value && !value.startsWith('/') && !value.startsWith('http')) {
        throw new Error('Button link must start with "/" for internal links or "http" for external links');
      }
      return true;
    }),

  body('layout')
    .optional()
    .isIn(['left', 'right', 'center'])
    .withMessage('Layout must be one of: left, right, center'),

  body('order')
    .optional()
    .isInt({ min: 0, max: 1000 })
    .withMessage('Order must be an integer between 0 and 1000'),

  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive must be a boolean value'),

  body('startDate')
    .optional()
    .isISO8601()
    .withMessage('Start date must be a valid ISO 8601 date')
    .custom((value, { req }) => {
      if (value && req.body.endDate) {
        const startDate = new Date(value);
        const endDate = new Date(req.body.endDate);
        if (startDate >= endDate) {
          throw new Error('Start date must be before end date');
        }
      }
      return true;
    }),

  body('endDate')
    .optional()
    .isISO8601()
    .withMessage('End date must be a valid ISO 8601 date')
    .custom((value, { req }) => {
      if (value && req.body.startDate) {
        const startDate = new Date(req.body.startDate);
        const endDate = new Date(value);
        if (endDate <= startDate) {
          throw new Error('End date must be after start date');
        }
      }
      return true;
    }),

  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Slider update validation failed',
        errors: errors.array()
      });
    }
    next();
  }
];

// Slider status toggle validation
export const validateSliderStatusToggle = [
  body('isActive')
    .notEmpty()
    .withMessage('isActive field is required')
    .isBoolean()
    .withMessage('isActive must be a boolean value'),

  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Slider status toggle validation failed',
        errors: errors.array()
      });
    }
    next();
  }
];

// Slider reorder validation
export const validateSliderReorder = [
  body('sliderOrders')
    .isArray({ min: 1 })
    .withMessage('Slider orders must be a non-empty array'),

  body('sliderOrders.*.id')
    .notEmpty()
    .withMessage('Slider ID is required for each order item'),

  body('sliderOrders.*.order')
    .isInt({ min: 0 })
    .withMessage('Order must be a non-negative integer'),

  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Slider reorder validation failed',
        errors: errors.array()
      });
    }
    next();
  }
];

// File upload validation middleware (for images)
export const validateSliderImages = (req, res, next) => {


  // Check if files are present in the request
  if (req.files) {
    const { bgImage, image } = req.files;

    // Validate background image
    if (bgImage && bgImage[0]) {
      const bgFile = bgImage[0];
      const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
      const maxSize = 5 * 1024 * 1024; // 5MB


      // Check file type using multiple methods
      const isValidType = allowedMimeTypes.includes(bgFile.mimetype) ||
                         bgFile.originalname.match(/\.(jpg|jpeg|png|webp|gif)$/i);

      if (!isValidType) {
        return res.status(400).json({
          success: false,
          message: 'Background image must be a JPEG, JPG, PNG, or WebP file. Received: ' + bgFile.mimetype
        });
      }

      if (bgFile.size > maxSize) {
        return res.status(400).json({
          success: false,
          message: 'Background image size must be less than 5MB'
        });
      }
    }

    // Validate main image
    if (image && image[0]) {
      const mainFile = image[0];
      const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
      const maxSize = 5 * 1024 * 1024; // 5MB

      // Check file type using multiple methods
      const isValidType = allowedMimeTypes.includes(mainFile.mimetype) ||
                         mainFile.originalname.match(/\.(jpg|jpeg|png|webp|gif)$/i);

      if (!isValidType) {
        return res.status(400).json({
          success: false,
          message: 'Main image must be a JPEG, JPG, PNG, or WebP file. Received: ' + mainFile.mimetype
        });
      }

      if (mainFile.size > maxSize) {
        return res.status(400).json({
          success: false,
          message: 'Main image size must be less than 5MB'
        });
      }
    }
  }

  next();
};

export const validateCreateSlider = [
  ...validateSlider,
  (req, res, next) => {
    const errors = validationResult(req);
    
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Slider creation validation failed',
        errors: errors.array()
      });
    }

    // Images are now optional, no check required
    next();
  }
];

// Simple validation for slider update with optional images
export const validateUpdateSlider = [
  ...validateSliderUpdate,
  (req, res, next) => {
    const errors = validationResult(req);
    
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Slider update validation failed',
        errors: errors.array()
      });
    }

    next();
  }
];



export const validateFaq = validate([
  body('question')
    .notEmpty().withMessage('Question is required')
    .isLength({ min: 5, max: 500 }).withMessage('Question must be between 5 and 500 characters'),
  body('answer')
    .notEmpty().withMessage('Answer is required')
    .isLength({ min: 10, max: 5000 }).withMessage('Answer must be between 10 and 5000 characters'),
  body('category')
    .optional()
    .isIn(['GENERAL', 'ORDERS', 'SHIPPING', 'RETURNS', 'PAYMENTS', 'PRODUCTS', 'CUSTOMIZATION', 'WHOLESALE', 'ACCOUNT'])
    .withMessage('Invalid FAQ category'),
  body('order')
    .optional()
    .isInt({ min: 0 }).withMessage('Order must be a positive integer'),
  body('isActive')
    .optional()
    .isBoolean().withMessage('isActive must be a boolean')
]);

export const validateFaqUpdate = validate([
  body('question')
    .optional()
    .isLength({ min: 5, max: 500 }).withMessage('Question must be between 5 and 500 characters'),
  body('answer')
    .optional()
    .isLength({ min: 10, max: 5000 }).withMessage('Answer must be between 10 and 5000 characters'),
  body('category')
    .optional()
    .isIn(['GENERAL', 'ORDERS', 'SHIPPING', 'RETURNS', 'PAYMENTS', 'PRODUCTS', 'CUSTOMIZATION', 'WHOLESALE', 'ACCOUNT'])
    .withMessage('Invalid FAQ category'),
  body('order')
    .optional()
    .isInt({ min: 0 }).withMessage('Order must be a positive integer'),
  body('isActive')
    .optional()
    .isBoolean().withMessage('isActive must be a boolean')
]);

export const validateFaqStatus = validate([
  body('isActive')
    .notEmpty().withMessage('isActive is required')
    .isBoolean().withMessage('isActive must be a boolean')
]);

export const validateFaqOrder = validate([
  body('order')
    .notEmpty().withMessage('Order is required')
    .isInt({ min: 0 }).withMessage('Order must be a positive integer')
]);

export const validateBulkFaqOrder = validate([
  body('faqs')
    .isArray().withMessage('faqs must be an array')
    .notEmpty().withMessage('faqs array cannot be empty'),
  body('faqs.*.id')
    .notEmpty().withMessage('FAQ ID is required')
    .isString().withMessage('FAQ ID must be a string'),
  body('faqs.*.order')
    .notEmpty().withMessage('FAQ order is required')
    .isInt({ min: 0 }).withMessage('FAQ order must be a positive integer')
]);







// Simple Design Inquiry validation
export const validateDesignInquiry = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Name is required'),
    
  body('contactNumber')
    .trim()
    .notEmpty()
    .withMessage('Contact number is required'),
    
  body('fabricSource')
    .trim()
    .notEmpty()
    .withMessage('Fabric source is required'),
    
  body('preferredDate')
    .notEmpty()
    .withMessage('Preferred date is required'),
    
  body('preferredTime')
    .trim()
    .notEmpty()
    .withMessage('Preferred time is required'),
    
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }
    next();
  }
];

// Simple Design Inquiry status update validation
export const validateDesignInquiryStatus = [
  body('status')
    .trim()
    .notEmpty()
    .withMessage('Status is required'),
    
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }
    next();
  }
];

// Design Inquiry update validation (for admin)
export const validateDesignInquiryUpdate = [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters'),
    
  body('contactNumber')
    .optional()
    .trim()
    .matches(/^[0-9]{10}$/)
    .withMessage('Contact number must be 10 digits'),
    
  body('whatsappNumber')
    .optional()
    .trim()
    .matches(/^[0-9]{10}$/)
    .withMessage('WhatsApp number must be 10 digits'),
    
  body('fabricSource')
    .optional()
    .trim()
    .isIn(['TO_BE_SOURCED', 'ALREADY_AVAILABLE', 'to_be_sourced', 'already_available'])
    .withMessage('Fabric source must be either "TO_BE_SOURCED" or "ALREADY_AVAILABLE"'),
    
  body('fabricDetails')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Fabric details must be less than 500 characters'),
    
  body('preferredDate')
    .optional()
    .isISO8601()
    .withMessage('Preferred date must be a valid date')
    .custom((value) => {
      if (value) {
        const selectedDate = new Date(value);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        if (selectedDate < today) {
          throw new Error('Preferred date cannot be in the past');
        }
      }
      return true;
    }),
    
  body('preferredTime')
    .optional()
    .trim()
    .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]\s?(AM|PM|am|pm)?$/)
    .withMessage('Preferred time must be in valid format (e.g., 10:00 AM)'),
    
  body('email')
    .optional()
    .trim()
    .isEmail()
    .withMessage('Valid email is required'),
    
  body('designDescription')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Design description must be less than 1000 characters'),
    
  body('quantity')
    .optional()
    .isInt({ min: 1, max: 1000 })
    .withMessage('Quantity must be between 1 and 1000'),
    
  body('timeline')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Timeline must be less than 100 characters'),
    
  body('budget')
    .optional()
    .isFloat({ min: 0, max: 1000000 })
    .withMessage('Budget must be between 0 and 1,000,000'),
    
  body('status')
    .optional()
    .trim()
    .isIn(['NEW', 'CONTACTED', 'IN_PROGRESS', 'QUOTED', 'CONVERTED', 'REJECTED', 'CLOSED'])
    .withMessage('Invalid status value'),
    
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }
    next();
  }
];