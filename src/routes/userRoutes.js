// routes/userRoutes.js - UPDATE WITH VALIDATION
import express from 'express';
import {
  getAllUsers,
  getUserById,
  updateProfile,
  updateWholesalerProfile,
  deleteUser,
  toggleUserStatus,
  changeUserRole,
  updateAvatar,
  removeAvatar,
  deleteShopPhoto,
  getUserStats,
  createUser
} from '../controllers/userController.js';

import { auth, authorize } from '../middleware/auth.js';
import multer from 'multer';
import { validateCreateUser, validateUpdateUser } from '../middleware/validation.js';

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

// Admin only routes
router.post('/admin/users', auth, authorize('ADMIN'), validateCreateUser, createUser); // ADD VALIDATION
router.get('/admin/users', auth, authorize('ADMIN'), getAllUsers);
router.get('/admin/users/stats', auth, authorize('ADMIN'), getUserStats);
router.delete('/admin/users/:userId', auth, authorize('ADMIN'), deleteUser);
router.patch('/admin/users/:userId/status', auth, authorize('ADMIN'), toggleUserStatus);
router.patch('/admin/users/:userId/role', auth, authorize('ADMIN'), changeUserRole);

// User profile routes (users can update their own profiles)
router.get('/users/:userId', auth, getUserById);
router.patch('/users/:userId/profile', auth, validateUpdateUser, updateProfile); // ADD VALIDATION
router.patch('/users/:userId/wholesaler-profile', auth, upload.array('shopPhotos', 5), updateWholesalerProfile);
router.patch('/users/:userId/avatar', auth, upload.single('avatar'), updateAvatar);
router.delete('/users/:userId/avatar', auth, removeAvatar);
router.delete('/users/:userId/shop-photos/:photoUrl', auth, deleteShopPhoto);

export default router;