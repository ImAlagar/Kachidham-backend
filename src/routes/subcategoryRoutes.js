import express from 'express';
import {
  getAllSubcategories,
  getSubcategoryById,
  createSubcategory,
  updateSubcategory,
  deleteSubcategory,
  toggleSubcategoryStatus,
  getSubcategoriesByCategory
} from '../controllers/subcategoryController.js';
import { auth, authorize } from '../middleware/auth.js';
import { 
  validateSubcategory, 
  validateSubcategoryUpdate, 
  validateStatusToggle 
} from '../middleware/validation.js'; // Import validations
import multer from 'multer';
import { deleteCategory } from '../controllers/categoryController.js';

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  }
});

// Public routes
router.get('/', getAllSubcategories);
router.get('/:subcategoryId', getSubcategoryById);
router.get('/category/:categoryId', getSubcategoriesByCategory);

// Admin only routes
router.post('/admin', auth, authorize('ADMIN'), upload.single('image'), validateSubcategory, createSubcategory); // Add validation
router.put('/admin/:subcategoryId', auth, authorize('ADMIN'), upload.single('image'), validateSubcategoryUpdate, updateSubcategory); // Add validation
router.delete('/admin/:subcategoryId', auth, authorize('ADMIN'), deleteSubcategory);
router.patch('/admin/:subcategoryId/status', auth, authorize('ADMIN'), validateStatusToggle, toggleSubcategoryStatus); // Add validation

export default router;