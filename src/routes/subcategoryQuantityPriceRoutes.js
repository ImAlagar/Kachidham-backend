// routes/subcategoryQuantityPriceRoutes.js
import express from 'express';
import {
  addSubcategoryQuantityPrice,
  getSubcategoryQuantityPrices,
  updateSubcategoryQuantityPrice,
  deleteSubcategoryQuantityPrice,
  toggleSubcategoryQuantityPriceStatus,
  getSubcategoriesWithQuantityPricing,
  getQuantityPriceById
} from '../controllers/subcategoryQuantityPriceController.js';
import { auth, authorize } from '../middleware/auth.js';

const router = express.Router();

// All routes are admin only
router.use(auth, authorize('ADMIN'));



// ✅ CORRECTED ROUTES - make sure they match exactly
router.post('/:subcategoryId', addSubcategoryQuantityPrice);
router.get('/subcategory/:subcategoryId', getSubcategoryQuantityPrices); // ✅ Fixed: added 'subcategory' prefix
router.get('/:quantityPriceId', getQuantityPriceById); // ✅ ADD THIS LINE

router.put('/:quantityPriceId', updateSubcategoryQuantityPrice);
router.delete('/:quantityPriceId', deleteSubcategoryQuantityPrice);
router.patch('/:quantityPriceId/status', toggleSubcategoryQuantityPriceStatus);
router.get('/', getSubcategoriesWithQuantityPricing); // ✅ This is the main endpoint

export default router;