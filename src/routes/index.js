import express from 'express';
const router = express.Router();

import authRoutes from './authRoutes.js';
import userRoutes from './userRoutes.js';
import categoryRoutes from './categoryRoutes.js';
import subcategoryRoutes from './subcategoryRoutes.js';
import productRoutes from './productRoutes.js';
import contactRoutes from './contactRoutes.js';
import couponRoutes from './couponRoutes.js';
import ratingRoutes from './ratingRoutes.js';
import orderRoutes from './orderRoutes.js';
import sliderRoutes from './sliderRoutes.js';
import dashboardRoutes from './dashboardRoutes.js';
import analyticsRoutes from './analyticsRoutes.js';
import customizationRoutes from './customizationRoutes.js';
import designRoutes from './designRoutes.js';
import imageProxyRoutes from './imageProxy.js';
import uploadRoutes from './uploadRoutes.js';
import faqRoutes from './faqRoutes.js'; // Add this import

// ✅ ADD THIS NEW IMPORT
import subcategoryQuantityPriceRoutes from './subcategoryQuantityPriceRoutes.js';

router.use('/auth', authRoutes);
router.use('/auth', userRoutes);
router.use('/category', categoryRoutes);
router.use('/subcategory', subcategoryRoutes);
router.use('/products', productRoutes);
router.use('/contacts', contactRoutes);
router.use('/coupons', couponRoutes);
router.use('/ratings', ratingRoutes);
router.use('/orders', orderRoutes);
router.use('/sliders', sliderRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/analytics', analyticsRoutes);
router.use('/customizations', customizationRoutes);
router.use('/designs', designRoutes);
router.use('/images', imageProxyRoutes);
router.use('/upload', uploadRoutes);
router.use('/faqs', faqRoutes); // Add this line
// ✅ ADD THIS NEW ROUTE
router.use('/admin/subcategory-quantity-prices', subcategoryQuantityPriceRoutes);

export default router;