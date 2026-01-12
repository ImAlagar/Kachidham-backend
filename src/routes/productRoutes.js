import express from 'express';
import {
  getAllProducts,
  getProductById,
  getProductByCode,
  createProduct,
  updateProduct,
  deleteProduct,
  toggleProductStatus,
  addProductImages,
  removeProductImage,
  setPrimaryProductImage,
  addProductVariant,
  updateProductVariant,
  removeProductVariant,
  addVariantImages,
  removeVariantImage,
  setPrimaryVariantImage,
  updateVariantStock,
  getProductStats,
  searchProducts,
  addProductDetails,
  updateProductDetail,
  removeProductDetail,
  getFeaturedProducts,
  getNewArrivals,
  getBestSellers,
  toggleBestSeller,
  toggleNewArrival,
  toggleFeatured,
  autoUpdateMerchandising,
  getRelatedProducts,
  // ✅ ADD THESE NEW IMPORTS
  calculateQuantityPrice,
  getProductsWithQuantityOffers,
  calculateCartPrices,
  getAllSubcategoriesWithPricing,
  updateVariantCodes
} from '../controllers/productController.js';
import { auth, authorize } from '../middleware/auth.js';
import multer from 'multer';
import { validateProduct, validateProductUpdate } from '../middleware/validation.js';

const router = express.Router();

const storage = multer.memoryStorage();

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
    files: 50 // Maximum 50 files total
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error(`Invalid file type: ${file.mimetype}. Only images are allowed.`), false);
    }
  }
});

// FIXED: Use fields to handle both text fields and files in one go
const handleVariantImagesUpload = (req, res, next) => {
  // Use .any() to handle all fields and files
  upload.any()(req, res, (err) => {
    if (err) {
      console.error('FormData parsing error:', err);
      return res.status(400).json({
        success: false,
        message: 'Error parsing form data: ' + err.message
      });
    }
        
    if (req.files) {
      req.files.forEach((file, index) => {
      });
    }
    
    // Parse JSON fields from FormData strings
    try {
      if (req.body.variants && typeof req.body.variants === 'string') {
        req.body.variants = JSON.parse(req.body.variants);
      }
      
      if (req.body.productDetails && typeof req.body.productDetails === 'string') {
        req.body.productDetails = JSON.parse(req.body.productDetails);
      }
    } catch (parseError) {
      return res.status(400).json({
        success: false,
        message: 'Invalid JSON format in variants or productDetails field'
      });
    }
    
    next();
  });
};


// Public routes
router.get('/', getAllProducts);
router.get('/search', searchProducts);
router.get('/code/:productCode', getProductByCode);
router.get('/related', getRelatedProducts); 

// ✅ ADD THESE NEW PUBLIC ROUTES FOR QUANTITY PRICING
router.post('/:productId/calculate-quantity-price', calculateQuantityPrice);
router.get('/subcategory/:subcategoryId/quantity-offers', getProductsWithQuantityOffers);
router.post('/calculate-cart-prices', calculateCartPrices);
router.get('/subcategories/with-pricing', getAllSubcategoriesWithPricing);

router.get('/:productId', getProductById);

// Public routes for merchandising
router.get('/featured/products', getFeaturedProducts);
router.get('/new-arrivals/products', getNewArrivals);
router.get('/best-sellers/products', getBestSellers);

// Admin routes (with auth)
router.get('/admin/stats', auth, authorize('ADMIN'), getProductStats);

// In your product routes, update the validation middleware logging
router.post('/admin', 
  handleVariantImagesUpload,
  (req, res, next) => {
    next();
  },
  validateProduct,
  (req, res, next) => {
    next();
  },
  createProduct
);

// Update product route
router.put('/admin/:productId', 
  auth, 
  authorize('ADMIN'),
  handleVariantImagesUpload,
  validateProductUpdate, 
  updateProduct
);

router.delete('/admin/:productId', auth, authorize('ADMIN'), deleteProduct);
router.patch('/admin/:productId/status', auth, authorize('ADMIN'), toggleProductStatus);

// Admin routes for merchandising management
router.patch('/admin/:productId/best-seller', auth, authorize('ADMIN'), toggleBestSeller);
router.patch('/admin/:productId/new-arrival', auth, authorize('ADMIN'), toggleNewArrival);
router.patch('/admin/:productId/featured', auth, authorize('ADMIN'), toggleFeatured);
router.post('/admin/merchandising/auto-update', auth, authorize('ADMIN'), autoUpdateMerchandising);

// Product details routes (with auth)
router.post('/admin/:productId/details', auth, authorize('ADMIN'), addProductDetails);
router.put('/admin/:productId/details/:detailId', auth, authorize('ADMIN'), updateProductDetail);
router.delete('/admin/:productId/details/:detailId', auth, authorize('ADMIN'), removeProductDetail);

// Product images routes (with auth)
router.post('/admin/:productId/images', auth, authorize('ADMIN'), upload.array('images', 10), addProductImages);
router.delete('/admin/:productId/images/:imageId', auth, authorize('ADMIN'), removeProductImage);
router.patch('/admin/:productId/images/:imageId/primary', auth, authorize('ADMIN'), setPrimaryProductImage);

// Product variants routes (with auth)
router.post('/admin/:productId/variants', auth, authorize('ADMIN'), upload.array('images', 10), addProductVariant);
router.put('/admin/:productId/variants/:variantId', auth, authorize('ADMIN'), upload.array('images', 10), updateProductVariant);
router.put(
  '/admin/:productId/variants/color/:color/codes', 
  auth, 
  authorize('ADMIN'), 
  updateVariantCodes
);

router.delete('/admin/:productId/variants/:variantId', auth, authorize('ADMIN'), removeProductVariant);
router.patch('/admin/:productId/variants/:variantId/stock', auth, authorize('ADMIN'), updateVariantStock);

// Variant images routes (with auth)
router.post('/admin/:productId/variants/:variantId/images', auth, authorize('ADMIN'), upload.array('images', 10), addVariantImages);
router.delete('/admin/:productId/variants/:variantId/images/:imageId', auth, authorize('ADMIN'), removeVariantImage);
router.patch('/admin/:productId/variants/:variantId/images/:imageId/primary', auth, authorize('ADMIN'), setPrimaryVariantImage);

export default router;